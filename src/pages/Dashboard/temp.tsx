import {
  EyeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlaySquareOutlined,
  PlusCircleOutlined,
  SoundOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  AudioOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { Avatar, Button, Card, Col, DatePicker, Flex, Form, Input, List, Modal, Row, Slider, Space, Spin, Typography, Upload, message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { request } from '@umijs/max';
import { useNavigate } from '@umijs/max';
import useMessage from 'antd/es/message/useMessage';

const { Text } = Typography;

// 在组件内初始化messageApi
const Dashboard = () => {
  const [messageApi, contextHolder] = useMessage();
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0); // 修改为动态设置
  const [currentAudio, setCurrentAudio] = useState<any>(null); // 更新类型
  const [segments, setSegments] = useState([]);
  const [waveformData, setWaveformData] = useState([]);
  const [audioFiles, setAudioFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(''); // 添加音频URL状态
  const progressRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null); // 添加音频元素引用
  // 静态音频库数据
  const audioLibrary = [
    '会议录音_20230702.mp3',
    '客户访谈_20230701.wav',
    '产品说明会_20230628.mp3',
  ];

  // 静态用户数据
  const userData = Array.from({ length: 12 }, (_, i) => ({
    title: `用户 ${i + 1}`,
    id: `user-${i + 1}`,
  }));

  // 生成波形图数据
  const generateWaveform = () => Array.from({ length: 200 }, () => Math.random() * 40 + 10);

  // 加载音频文件
  const loadAudio = async (audioFile) => {
    try {
    setCurrentAudio(audioFile);
    setCurrentTime(0);
    setPlaying(false);
    setWaveformData(generateWaveform());
    setIsLoading(true);
  
    // 1. 先获取分段数据
    const segmentResponse = await request(`http://0.0.0.0:8000/v1/audio/process/${audioFile.meeting_id}`);
    if (segmentResponse.code === 200) {
      setSegments(segmentResponse.data.segments);
    } else {
      messageApi.error('获取分段数据失败');
      setSegments([]);
    }
  
    // 2. 获取音频文件
    const audioResponse = await fetch(`http://0.0.0.0:8000/v1/audio/get/${audioFile.meeting_id}`);
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
        audioRef.current.play().catch(error => {
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

    const response = await fetch('http://0.0.0.0:8000/v1/audio/add_audio', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.code === 200) {
      message.success('音频上传成功');
      setIsModalOpen(false);
      form.resetFields();

      const updatedList = await request('http://0.0.0.0:8000/v1/audio/search_meeting');
      if (updatedList.code === 200) setAudioFiles(updatedList.data);
    } else {
      message.error(result.msg || '上传失败');
    }
  } catch (error) {
    console.error(error);
    message.error('提交失败，请检查表单内容');
  }
};

  // 播放/暂停切换
  const togglePlay = () => {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
      clearInterval(progressRef.current);
    } else {
      audioRef.current.play();
      progressRef.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
          // 检查是否播放结束
          if (audioRef.current.currentTime >= audioRef.current.duration) {
            setPlaying(false);
            clearInterval(progressRef.current);
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
            if (audioRef.current.currentTime >= audioRef.current.duration) {
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
    setWaveformData(generateWaveform());
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
        const response = await request('http://0.0.0.0:8000/v1/audio/search_meeting');
        if (response.code === 200) {
          setAudioFiles(response.data);
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
  const activeIndex = segments.findIndex((seg: any) => currentTime >= seg.start_time);
  const highlightIndex = selectedIndex !== null ? selectedIndex : activeIndex;

  // 清除选中状态
  useEffect(() => {
    if (selectedIndex !== null) {
      const segmentEndTime = segments[selectedIndex]?.start_time + 30; // 假设每个分段30秒
      if (currentTime > segmentEndTime) setSelectedIndex(null);
    }
  }, [currentTime, selectedIndex, segments]);

  return (
    <>
    <Row gutter={16} style={{ height: '100vh' }}>
      {/* 用户声纹库列 */}
      <Col flex="300px" style={{ height: '100%' }}>
        <Card
          title="用户声纹库"
          styles={{ body: { padding: 0, height: '100%', overflowY: 'auto' } }}
          style={{ height: '100%' }}
        >
          <List
            itemLayout="horizontal"
            dataSource={userData}
            renderItem={(item) => (
              <List.Item actions={[<Button type="text" icon={<PlaySquareOutlined />} />]}
                style={{ cursor: 'pointer' }}
              >
                <List.Item.Meta
                  avatar={<Avatar src={`https://api.dicebear.com/7.x/miniavs/svg?seed=${item.id}`} />}
                  title={<Text strong>{item.title}</Text>}
                  description={
                    <Flex vertical gap={4}>
                      <Text type="secondary">最近活跃: 今天 10:30</Text>
                      <Slider defaultValue={50} tooltip={{ open: false }} style={{ width: '80%' }} />
                    </Flex>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      </Col>
      
      {/* 音频分段和播放器列 */}
      <Col flex={2} style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        minWidth: 0, 
        maxWidth: '800px', // 添加最大宽度限制
        width: '100%',     // 确保在最大宽度内自适应
        margin: '0 auto'   // 水平居中
      }}>
        <Card
          title="音频分段"
          styles={{ 
            body: { 
              padding: '16px', 
              height: 'calc(100% - 56px)', 
              overflowY: 'auto', 
              display: 'flex',
              flexDirection: 'column'
            } 
          }}
          style={{ 
            flex: 4, 
            height: '75%', 
            marginBottom: 16, 
            background: 'rgba(255, 255, 255, 0.7)', 
            backdropFilter: 'blur(10px)',
            minHeight: 0 
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
                  backgroundColor: index === highlightIndex ? 'rgba(114, 46, 209, 0.1)' : 'inherit',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  transition: 'all 0.2s'
                  }}
                >
                  <Row align="middle" style={{ width: '100%' }}>
                    {/* 左侧 2/5 区域：头像 + 说话人 + 时间 */}
                    <Col span={10}>
                      <Flex align="center" gap={12}>
                        <Avatar src={`https://api.dicebear.com/7.x/miniavs/svg?seed=${item.speaker}`} />
                        <Text strong>匿名{item.speaker}</Text>
                        <Text strong style={{ color: '#722ed1' }}>
                          {parseFloat(item.start_time).toFixed(1)}s
                        </Text>
                      </Flex>
                    </Col>

                    {/* 右侧 3/5 区域：文本 */}
                    <Col span={14}>
                      <Text>{item.text}</Text>
                    </Col>
                  </Row>


                </List.Item>
              )}
            />)}
          </Card>
        
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
                <Text strong>{formatTime(currentTime)} / {formatTime(duration)}</Text>
                <Space size="large">
                  <Button icon={<StepBackwardOutlined />} disabled />
                  <Button icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />} onClick={togglePlay} />
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
          title="音频导入"
          extra={
            <Button 
              type="primary"
              icon={<PlusCircleOutlined />}
              style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
              onClick={() => setIsModalOpen(true)}
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
                onClick={() => loadAudio(file)}  // 确保传递完整file对象
                style={{
                  cursor: 'pointer',
                  backgroundColor: currentAudio?.meeting_id === file.meeting_id ? 'rgba(114, 46, 209, 0.1)' : undefined,
                }}
              >
                <Flex align="center" style={{ width: '100%' }}>
                  <AudioOutlined style={{ marginRight: 8 }} />
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{file.meeting_topic}</Text>
                    <Text type="secondary" style={{ fontSize: '11px' }}>{new Date(file.created_at).toLocaleString()}</Text>
                  </div>
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      onClick={(e) => {
                        e.stopPropagation(); // 防止触发上层点击事件
                        navigate(`/meeting-summary/${file.meeting_id}`);
                      }}
                      style={{
                        marginLeft: 8,
                        color: '#722ed1',
                      }}
                    >
                      查看纪要
                    </Button>
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
  onCancel={() => setIsModalOpen(false)}
  onOk={handleUpload}
  okText="上传"
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
      <Upload beforeUpload={() => false} maxCount={1}>
        <Button icon={<UploadOutlined />}>选择文件</Button>
      </Upload>
    </Form.Item>
    <Form.Item
      name="meeting_topic"
      label="会议主题"
      rules={[{ required: true, message: '请输入会议主题' }]}
    >
      <Input placeholder="请输入会议主题" />
    </Form.Item>
    <Form.Item
      name="start_time"
      label="开始时间"
      rules={[{ required: true, message: '请选择开始时间' }]}
    >
      <DatePicker
        showTime
        style={{ width: '100%' }}
        placeholder="请选择开始时间"
      />
    </Form.Item>
  </Form>
</Modal>

</>
  );
};
export default Dashboard;