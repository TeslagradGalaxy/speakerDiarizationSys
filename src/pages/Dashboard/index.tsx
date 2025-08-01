// 在文件顶部导入Progress组件
import {
  AudioOutlined,
  DeleteOutlined,
  EyeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlaySquareOutlined,
  PlusCircleOutlined,
  SoundOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { request, useNavigate } from '@umijs/max';
import {
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Flex,
  Form,
  Input,
  List,
  Modal,
  Progress,
  Row,
  Slider,
  Space,
  Spin,
  Typography,
  Upload,
  message,
} from 'antd';
import useMessage from 'antd/es/message/useMessage';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';

const { Text } = Typography;
interface SegmentItem {
  user_id: number;
  username: string;
  start_time: number;
  end_time: number;
  speaker_id: string;
  meeting_id: number;
  dialogue_content: string;
}
interface user {
  user_id: number;
  username: string;
  updated_at: string;
  audio_filename: string;
}
interface audios {
  meeting_id: number;
  meeting_topic: string;
  audio_filename: string;
  created_at: string;
  duration: number;
}

// 在组件内初始化messageApi
const Dashboard = () => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editingSegment, setEditingSegment] = useState<any>(null);
  const [messageApi, contextHolder] = useMessage();
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentAudio, setCurrentAudio] = useState<any>(null);
  const [segments, setSegments] = useState<SegmentItem[]>([]);
  const [audioFiles, setAudioFiles] = useState<audios[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [users, setUsers] = useState<user[]>([]); // 添加用户数据状态
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /*   const fileInputRef = useRef<number | null>(null); */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 添加上传进度状态
  const [isUploading, setIsUploading] = useState(false); // 添加上传中状态
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null); // 添加音频元素引用
  const handleUsernameSubmit = async () => {
    if (!editingSegment) return;

    const formData = new FormData();
    formData.append('username', editUsername); // 来自 Input 输入框的 state
    formData.append('start_time', String(editingSegment.start_time));
    formData.append('end_time', String(editingSegment.end_time));
    formData.append('speaker_id', String(editingSegment.speaker_id));
    formData.append('meeting_id', String(editingSegment.meeting_id));

    try {
      const response = await fetch('http://localhost:8000/v1/user/add', {
        method: 'POST',
        body: formData, //用 FormData，后端才能接收到
      });

      const result = await response.json();
      if (result.code === 200) {
        message.success('修改成功！');
        setIsEditModalOpen(false);
        //刷新
        const updatedList = await request(
          `http://localhost:8000/v1/audio/process/${editingSegment.meeting_id}`,
        );
        if (updatedList.code === 200) {
          setSegments(updatedList.data.data);
        } else {
          message.error('刷新分段列表失败');
        }
        const userList = await request(
          `http://localhost:8000/v1/user/list/${editingSegment.meeting_id}`,
        );
        if (userList.code === 200) {
          setUsers(userList.data);
        } else {
          message.error('刷新用户列表失败');
        }
      } else {
        message.error(result.msg || '提交失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  // 加载音频文件
  const loadAudio = async (audioFile: audios) => {
    try {
      setCurrentAudio(audioFile);
      setCurrentTime(0);
      setPlaying(false);
      setIsLoading(true);

      // 1. 先获取分段数据
      const segmentResponse = await request(
        `http://localhost:8000/v1/audio/process/${audioFile.meeting_id}`,
      );

      if (segmentResponse.code === 200) {
        setSegments(segmentResponse.data);
        //segmentResponse.data==1
      } else if (segmentResponse.code === 202) {
        setSegments(segmentResponse.data);
        messageApi.info('正在处理音频...');
      } else {
        messageApi.error('获取分段数据失败');
        setSegments([]);
      }

      // 2. 添加获取用户列表数据（带meeting_id）
      const userResponse = await request(
        `http://localhost:8000/v1/user/list/${audioFile.meeting_id}`,
      );
      if (userResponse.code === 200) {
        setUsers(userResponse.data);
      } else {
        messageApi.error('获取用户列表失败');
        setUsers([]);
      }

      // 3. 获取音频文件
      const audioResponse = await fetch(
        `http://localhost:8000/v1/audio/get/${audioFile.meeting_id}`,
      );
      if (audioResponse.ok) {
        const blob = await audioResponse.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // 创建音频对象并加载
        if (audioRef.current) {
          audioRef.current.src = url;
          // 移除await audioRef.current.load()
          setPlaying(true);
          // 播放时会自动加载元数据
          audioRef.current.play().catch((error) => {
            console.error('播放失败:', error);
            messageApi.error('音频播放失败，请重试');
          });
        }
      } else {
        messageApi.error('获取音频文件失败');
      }
    } catch (error) {
      messageApi.error('网络错误，无法加载音频数据');
      console.error('Audio load error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleUpload = async () => {
    try {
      const values = await form.validateFields();

      const fileObj = values.file?.[0]?.originFileObj;
      if (!fileObj) {
        message.error('请上传音频文件');
        return;
      }

      const formData = new FormData();
      formData.append('wav_file', fileObj);
      formData.append('meeting_topic', values.meeting_topic);
      formData.append('start_time', values.start_time.format('YYYY-MM-DD HH:mm:ss'));

      setIsUploading(true);
      setUploadProgress(0);

      // 使用XMLHttpRequest替代fetch以支持上传进度
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'http://localhost:8000/v1/audio/add_audio');

      // 监听上传进度
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      });

      xhr.onload = async () => {
        setIsUploading(false);
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          if (result.code === 200) {
            message.success('音频上传成功');
            setIsModalOpen(false);
            form.resetFields();
            setUploadProgress(0);

            const updatedList = await request('http://localhost:8000/v1/audio/search_meeting');
            if (updatedList.code === 200) setAudioFiles(updatedList.data);
          } else {
            message.error(result.msg || '上传失败');
          }
        } else {
          message.error('上传失败，网络错误');
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        message.error('上传失败，网络错误');
      };

      xhr.send(formData);
    } catch (error) {
      setIsUploading(false);
      console.error(error);
      message.error('提交失败，请检查表单内容');
    }
  };

  // 播放/暂停切换
  const togglePlay = () => {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
      if (progressRef.current !== null) {
        clearInterval(progressRef.current);
      }
    } else {
      audioRef.current.play();
      progressRef.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
          // 检查是否播放结束
          if (audioRef.current.currentTime >= audioRef.current.duration) {
            if (progressRef.current !== null) {
              clearInterval(progressRef.current);
            }
            setCurrentTime(0);
          }
        }
      }, 1000);
    }
    setPlaying(!playing);
  };

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 跳转到指定时间
  const jumpToSegment = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
      // 如果音频未播放，则自动播放
      if (!playing) {
        setPlaying(true);
        audioRef.current.play();
        progressRef.current = setInterval(() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            if (
              audioRef.current.currentTime >= audioRef.current.duration &&
              progressRef.current !== null
            ) {
              setPlaying(false);
              clearInterval(progressRef.current);
              setCurrentTime(0);
            }
          }
        }, 1000);
      }
    }
  };

  // 初始化波形图
  useEffect(() => {
    /* setWaveformData(generateWaveform()); */
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
      // 清理音频URL
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // 添加音频列表API调用
  useEffect(() => {
    const fetchAudioList = async () => {
      try {
        const response = await request('http://localhost:8000/v1/audio/search_meeting');
        if (response.code === 200) {
          setAudioFiles(response.data || []); // 确保始终为数组
        } else {
          messageApi.error('获取音频列表失败');
        }
      } catch (error) {
        messageApi.error('网络错误，无法获取音频列表');
      }
    };

    fetchAudioList();
  }, [messageApi]);

  // 处理分段点击
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const handleSegmentClick = (index: number, time: number) => {
    setSelectedIndex(index);
    jumpToSegment(time);
  };

  // 获取当前活跃的分段索引
  const activeIndex = Array.isArray(segments)
    ? segments.findIndex((seg: any) => currentTime >= seg.start_time)
    : -1;
  const highlightIndex = selectedIndex !== null ? selectedIndex : activeIndex;

  // 清除选中状态
  useEffect(() => {
    if (selectedIndex !== null) {
      const segmentEndTime = segments[selectedIndex]?.start_time + 30; // 假设每个分段30秒
      if (currentTime > segmentEndTime) setSelectedIndex(null);
    }
  }, [currentTime, selectedIndex, segments]);
  // 删除以下获取用户列表的 useEffect 钩子
  /*
  // 获取用户列表数据
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await request('http://localhost:8000/v1/user/list');
        if (response.code === 200) {
          setUsers(response.data); //正确地更新状态
        } else {
          messageApi.error('获取用户列表失败');
        }
      } catch (error) {
        messageApi.error('网络错误，无法获取用户列表');
        console.error('Failed to fetch users:', error);
      }
    };

    fetchUsers();
  }, [messageApi]);
  */
  // 添加删除音频的函数
  const handleDeleteAudio = async (meetingId: number) => {
    try {
      await fetch(`http://localhost:8000/v1/audio/delete_meeting/${meetingId}`, {
        method: 'DELETE',
      });
      // 删除成功后刷新音频列表
      setAudioFiles(audioFiles.filter((file) => file.meeting_id !== meetingId));
      message.success('音频删除成功');
      setSegments([]); // 清空 segments
      setUsers([]); // 清空 users
    } catch (error) {
      console.error('删除音频失败:', error);
      message.error('删除失败，请重试');
    }
  };

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      {' '}
      {/* 添加全局容器 */}
      <Row gutter={16} style={{ height: '100%' }}>
        {' '}
        {/* 修改为100%高度 */}
        {/* 用户声纹库列 */}
        <Col
          xs={{ flex: '180px' }}
          sm={{ flex: '220px' }}
          md={{ flex: '260px' }}
          lg={{ flex: '300px' }}
          style={{ height: '100%' }}
        >
          {' '}
          {/* 使用响应式flex */}
          <Card
            title="说话人列表"
            styles={{ body: { padding: 0, flex: 1, overflowY: 'auto' } }}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <List
              itemLayout="horizontal"
              dataSource={users}
              renderItem={(item) => (
                <List.Item
                  key={item.user_id}
                  actions={[<Button key="play" type="text" icon={<PlaySquareOutlined />} />]}
                  style={{ cursor: 'pointer' }}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        size={48}
                        src={`https://api.dicebear.com/7.x/miniavs/svg?seed=${item.username}`}
                      />
                    }
                    title={
                      <Text strong style={{ fontSize: 16 }}>
                        {item.username}
                      </Text>
                    }
                    description={
                      <Flex vertical gap={4} style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 10 }}>
                          最近活跃：{new Date(item.updated_at).toLocaleString()}
                        </Text>
                        <Flex align="center" gap={8}>
                          <Text type="secondary" style={{ fontSize: 12, width: 48 }}>
                            音量
                          </Text>
                          <Slider
                            defaultValue={50}
                            tooltip={{ open: false }}
                            style={{ flex: 1, margin: 0 }}
                          />
                        </Flex>
                      </Flex>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        {/* 音频分段和播放器列 */}
        <Col
          flex={2}
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minWidth: 0,
            // 使用条件渲染设置响应式maxWidth
            maxWidth: window.innerWidth < 768 ? '100%' : '800px',
            width: '100%',
            margin: '0 auto',
          }}
        >
          <Card
            title="音频文本"
            styles={{
              body: {
                padding: '16px',
                height: 'calc(100% - 56px)',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
              },
            }}
            style={{
              flex: 4,
              height: '75%',
              marginBottom: 16,
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(10px)',
              minHeight: 0,
            }}
          >
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" />
                <div style={{ marginTop: '16px' }}>正在解析音频...</div>
              </div>
            ) : (
              <List
                dataSource={segments}
                renderItem={(item: any, index: number) => (
                  <List.Item
                    onClick={() => handleSegmentClick(index, item.start_time)}
                    key={index}
                    style={{
                      cursor: 'pointer',
                      backgroundColor:
                        index === highlightIndex ? 'rgba(114, 46, 209, 0.1)' : 'inherit',
                      padding: '12px',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Row align="middle" style={{ width: '100%' }}>
                      {/* 左侧 2/5 区域：头像 + 说话人 + 时间 */}
                      <Col span={10}>
                        <Flex align="center" gap={12}>
                          <Avatar
                            src={`https://api.dicebear.com/7.x/miniavs/svg?seed=${item.username}`}
                            onClick={(e) => {
                              (e as React.MouseEvent<HTMLElement>).stopPropagation(); // 避免触发整条点击
                              const duration = item.end_time - item.start_time;
                              if (item.user_id === 1 && duration > 3) {
                                setEditingSegment(item);
                                setEditUsername(item.username);
                                setIsEditModalOpen(true);
                              } else {
                                message.warning('仅可编辑匿名用户且片段大于3秒的说话人');
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          />

                          <Text strong>
                            {item.user_id === 1 ? `匿名${item.speaker_id}` : item.username}
                          </Text>
                          <Text strong style={{ color: '#722ed1' }}>
                            {parseFloat(item.start_time).toFixed(1)}s
                          </Text>
                        </Flex>
                      </Col>

                      {/* 右侧 3/5 区域：文本 */}
                      <Col span={14}>
                        <Text>{item.dialogue_content}</Text>
                      </Col>
                    </Row>
                  </List.Item>
                )}
              />
            )}
          </Card>
          {/* 播放器 */}
          <Card style={{ flex: 1 }}>
            {/* 添加隐藏的音频元素 */}
            <audio
              ref={audioRef}
              onTimeUpdate={() => {
                if (audioRef.current) {
                  setCurrentTime(audioRef.current.currentTime);
                }
              }}
              onLoadedMetadata={() => {
                // 添加元数据加载完成事件
                if (audioRef.current) {
                  setDuration(audioRef.current.duration || 0);
                }
              }}
              onEnded={() => {
                setPlaying(false);
                setCurrentTime(0);
                if (progressRef.current) clearInterval(progressRef.current);
              }}
              style={{ display: 'none' }}
            />
            <Flex vertical justify="space-between" style={{ height: '100%' }}>
              <Slider
                min={0}
                max={duration}
                value={currentTime}
                onChange={(value) => {
                  setCurrentTime(value);
                  if (audioRef.current) {
                    audioRef.current.currentTime = value;
                  }
                }}
                tooltip={{
                  formatter: (value) => formatTime(value || 0),
                }}
              />
              <Flex justify="space-between">
                <Text strong>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </Text>
                <Space size="large">
                  <Button icon={<StepBackwardOutlined />} disabled />
                  <Button
                    icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                    onClick={togglePlay}
                  />
                  <Button icon={<StepForwardOutlined />} disabled />
                </Space>
                <Flex align="center">
                  <SoundOutlined style={{ marginRight: 8 }} />
                  <Slider defaultValue={80} style={{ width: 100 }} tooltip={{ open: false }} />
                </Flex>
              </Flex>
            </Flex>
          </Card>
        </Col>
        {/* 音频导入列 */}
        <Col flex="300px" style={{ height: '100%' }}>
          <Card
            title="音频库"
            extra={
              <Button
                type="primary"
                icon={<PlusCircleOutlined />}
                style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
                onClick={() => {
                  form.setFieldsValue({
                    meeting_topic: `匿名会议${audioFiles.length + 1}`,
                    start_time: dayjs(), // 当前时间
                  });
                  setIsModalOpen(true);
                }}
              >
                导入
              </Button>
            }
            styles={{ body: { padding: 0, height: '100%', overflowY: 'auto' } }}
            style={{ height: '100%' }}
          >
            <List
              size="small"
              dataSource={audioFiles}
              renderItem={(file) => (
                <List.Item
                  key={file.meeting_id}
                  onClick={() => loadAudio(file)} // 确保传递完整file对象
                  style={{
                    cursor: 'pointer',
                    backgroundColor:
                      currentAudio?.meeting_id === file.meeting_id
                        ? 'rgba(114, 46, 209, 0.1)'
                        : undefined,
                  }}
                >
                  <Flex align="center" style={{ width: '100%' }}>
                    <AudioOutlined style={{ marginRight: 8 }} />
                    <div style={{ flex: 1 }}>
                      <Text
                        strong
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block',
                        }}
                      >
                        {file.meeting_topic}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        {formatTime(file.duration)}
                      </Text>
                    </div>
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/meeting-summary/${file.meeting_id}`);
                      }}
                      style={{
                        marginLeft: 8,
                        color: '#722ed1',
                      }}
                    >
                      查看纪要
                    </Button>
                    {/* 添加删除按钮 */}
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        Modal.confirm({
                          title: '确认删除',
                          content: '确定要删除此音频文件吗？此操作不可恢复。',
                          okText: '确认',
                          cancelText: '取消',
                          onOk: () => handleDeleteAudio(file.meeting_id),
                        });
                      }}
                      style={{
                        marginLeft: 8,
                        color: '#ff4d4f',
                      }}
                    ></Button>
                  </Flex>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
      <Modal
        title="导入音频"
        open={isModalOpen}
        onCancel={() => {
          if (!isUploading) {
            setIsModalOpen(false);
            setUploadProgress(0);
          } else {
            message.warning('上传中，请勿关闭对话框');
          }
        }}
        onOk={handleUpload}
        okText="上传"
        okButtonProps={{ disabled: isUploading }}
        cancelButtonProps={{ disabled: isUploading }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="file"
            label="音频文件"
            valuePropName="fileList"
            getValueFromEvent={(e) => {
              return Array.isArray(e) ? e : e?.fileList;
            }}
            rules={[{ required: true, message: '请选择音频文件' }]}
          >
            <Upload beforeUpload={() => false} maxCount={1} disabled={isUploading}>
              <Button icon={<UploadOutlined />} disabled={isUploading}>
                选择文件
              </Button>
            </Upload>
          </Form.Item>
          <Form.Item name="meeting_topic" label="会议主题" rules={[{ required: true }]}>
            <Input placeholder="请输入会议主题" disabled={isUploading} />
          </Form.Item>
          <Form.Item name="start_time" label="开始时间" rules={[{ required: true }]}>
            <DatePicker
              showTime
              style={{ width: '100%' }}
              placeholder="请选择开始时间"
              disabled={isUploading}
            />
          </Form.Item>

          {/* 添加上传进度条 */}
          {isUploading && (
            <div style={{ marginTop: 20 }}>
              <p>上传进度: {uploadProgress}%</p>
              <Progress
                percent={uploadProgress}
                status="active"
                strokeColor={{
                  '0%': '#ff4d4f', // 红色
                  '50%': '#faad14', // 黄色
                  '100%': '#52c41a', // 绿色
                }}
              />
            </div>
          )}
        </Form>
      </Modal>
      <Modal
        open={isEditModalOpen}
        title="修改用户名"
        onCancel={() => setIsEditModalOpen(false)}
        onOk={handleUsernameSubmit}
      >
        <Form layout="vertical">
          <Form.Item label="用户名">
            <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
          </Form.Item>
        </Form>
      </Modal>
      {contextHolder}
    </div>
  );
};

export default Dashboard;
