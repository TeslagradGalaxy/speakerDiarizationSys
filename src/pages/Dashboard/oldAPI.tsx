import {
  EyeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlaySquareOutlined,
  PlusCircleOutlined,
  SoundOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  AudioOutlined
} from '@ant-design/icons';
import { Avatar, Button, Card, Col, Flex, List, Row, Slider, Space, Typography, message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { request } from '@umijs/max';
import { audioApi } from '@/services/audioService';
import { useNavigate } from '@umijs/max';

const { Text } = Typography;

import useMessage from 'antd/es/message/useMessage';




// 在组件内初始化messageApi
const Dashboard = () => {
  const [messageApi, contextHolder] = useMessage();
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(300);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [segments, setSegments] = useState([]);
  const [waveformData, setWaveformData] = useState([]);
  const [audioFiles, setAudioFiles] = useState<string[]>([]); // 移动到这里
  const progressRef = useRef(null);
  const fileInputRef = useRef(null);

  const audioLibrary = [
    'asong.wav',
    '客户访谈_20230701.wav',
    '产品说明会_20230628.mp3',
  ];

  const segmentData = {
    '会议录音_20230702.mp3': [
      { speaker: '张经理', timestamp: '00:01:23', content: '大家好，我们开始今天的项目会议' },
      { speaker: '李总监', timestamp: '00:02:15', content: '首先汇报一下Q2的销售数据' },
      { speaker: '王主管', timestamp: '00:03:42', content: '技术团队已完成80%的开发任务' },
      { speaker: '张经理', timestamp: '00:04:56', content: '客户反馈需要增加两个新功能' },
      { speaker: '赵助理', timestamp: '00:06:18', content: '下周需要安排客户演示会议' },
    ],
    '客户访谈_20230701.wav': Array.from({ length: 10 }, (_, i) => ({
      speaker: '销售',
      timestamp: '00:04:20',
      content: '需要增加什么新功能吗？',
    })),
    '产品说明会_20230628.mp3': [
      { speaker: '讲师', timestamp: '00:01:10', content: '欢迎参加产品培训会' },
      { speaker: '讲师', timestamp: '00:02:55', content: '首先介绍核心功能模块' },
      { speaker: '讲师', timestamp: '00:04:30', content: '现在演示数据分析流程' },
      { speaker: '讲师', timestamp: '00:06:45', content: '最后是Q&A环节' },
    ],
  };

  const userData = Array.from({ length: 12 }, (_, i) => ({
    title: `用户 ${i + 1}`,
    id: `user-${i + 1}`,
  }));

  const generateWaveform = () => Array.from({ length: 200 }, () => Math.random() * 40 + 10);

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadAudioFile(file);
    }
  };

  const uploadAudioFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await request('http://0.0.0.0:8000/v1/audio/add_audio', {
        method: 'POST',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.code === 200) {
        // 上传成功后获取返回的文件名
        const fileName = response.data.file_name;
        setCurrentAudio(fileName);
        // 清空现有分段数据，等待用户查看纪要时加载
        setSegments([]);
        message.success(response.msg || '音频上传成功');
      }
    } catch (error) {
      message.error('音频上传失败: ' + (error.message || '网络错误'));
      console.error('音频上传失败:', error);
    }
  };

  const loadAudio = (audioName) => {
    setCurrentAudio(audioName);
    setSegments(segmentData[audioName] || []);
    setCurrentTime(0);
    setPlaying(true);
    setWaveformData(generateWaveform());
  };

  const togglePlay = () => {
    setPlaying(!playing);
    if (!playing) {
      progressRef.current = setInterval(() => {
        setCurrentTime((prev) => (prev >= duration ? (setPlaying(false), 0) : prev + 1));
      }, 1000);
    } else if (progressRef.current) {
      clearInterval(progressRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const jumpToSegment = (seconds) => {
    setCurrentTime(seconds);
  };

  useEffect(() => {
    setWaveformData(generateWaveform());
    return () => progressRef.current && clearInterval(progressRef.current);
  }, []);

  const getActiveIndex = () => segments.findIndex((seg) => {
    return currentTime >= seg.start_time;
  });

  const [selectedIndex, setSelectedIndex] = useState(null);

  const handleSegmentClick = (index, time) => {
    setSelectedIndex(index);
    jumpToSegment(time);
  };

  const getHighlightIndex = () => selectedIndex !== null ? selectedIndex : activeIndex;

  useEffect(() => {
    if (selectedIndex !== null) {
      const [mins, secs] = segments[selectedIndex]?.timestamp?.split(':').slice(1).map(Number) || [];
      if (currentTime > (mins * 60 + secs)) setSelectedIndex(null);
    }
  }, [currentTime]);

  const activeIndex = getActiveIndex();
  const highlightIndex = getHighlightIndex();

  const handleAudioSelect = async (fileName: string) => {
    setCurrentAudio(fileName);
    setSegments([]);
    setWaveformData(generateWaveform());

    try {
      // 调用后端接口获取音频分段数据
      const response = await request(`http://0.0.0.0:8000/v1/audio/process/${fileName}`);
      if (response.code === 200) {
        // 解析JSON字符串数据
        const segmentsData = JSON.parse(response.data);
        setSegments(segmentsData);
      } else {
        message.error('获取音频分段失败: ' + response.msg);
      }
    } catch (error) {
      message.error('获取音频分段失败，请重试');
      console.error('音频分段请求错误:', error);
    }
  };


  
  // 记忆化API调用函数---------------------------
  const fetchAudioList = useCallback(async () => {
    try {
      const response = await audioApi.getAudioList();
      if (response.code === 200) {
        setAudioFiles(response.data.files);
      }
    } catch (error) {
      console.error('获取音频列表失败:', error);
    }
  }, []);
  useEffect(() => {
    fetchAudioList();
  }, [fetchAudioList, location.pathname]);
  const navigate = useNavigate();
//-------------------------------------------------------
  return (
    <Row gutter={16} style={{ height: '100vh', overflow: 'hidden' }}>
      {/* 用户声纹库列 */}
      <Col flex="300px" style={{ height: '100%' }}>
        <Card
          title="用户声纹库"
          styles={{ body: { padding: 0, height: '100%', overflowY: 'auto' } }} // 新写法
          style={{ height: '100%' }}
        >
          <List
            itemLayout="horizontal"
            dataSource={userData}
            renderItem={(item) => (
              <List.Item actions={[<Button type="text" icon={<PlaySquareOutlined />} />]}>
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
      <Col flex="auto" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Card
          title="音频分段"
          styles={{ body: { paddingRight: 16, height: '100%', overflowY: 'auto' } }}
          style={{ flex: 4, height: '75%', marginBottom: 16, background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)' }}
        >
          <List
            dataSource={segments}
            renderItem={(item, index) => (
              <List.Item
                onClick={() => handleSegmentClick(index, item.start_time)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: index === highlightIndex ? 'rgba(114, 46, 209, 0.1)' : 'inherit',
                  padding: '12px',
                  borderRadius: '8px',
                }}
              >
                <Space size="large" style={{ width: '100%' }}>
                  <Avatar style={{ backgroundColor: index % 2 === 0 ? '#1890ff' : '#52c41a' }}>{item.speaker.charAt(0)}</Avatar>
                  <Text strong style={{ minWidth: 80, color: '#722ed1' }}>{parseFloat(item.start_time).toFixed(1)}s</Text>
                  <Card
                    styles={{
                      body: {
                        padding: '8px',
                        margin: 0,
                        maxHeight: '80px', // 固定文本区域高度
                        overflowY: 'auto', // 启用垂直滚动
                        fontSize: '14px',
                      },
                      wrapper: { border: 'none' } // 移除卡片边框
                    }}
                  >
                    <Text>{item.text}</Text>
                  </Card>
                </Space>
              </List.Item>
            )}
          />
        </Card>
      
        <Card style={{ flex: 1 }}>
          <Flex vertical justify="space-between" style={{ height: '100%' }}>
            <Slider
              min={0}
              max={duration}
              value={currentTime}
              onChange={(value) => setCurrentTime(value)}
              tooltip={{
                formatter: (value) => formatTime(value || 0),
                getPopupContainer: (trigger) => trigger.parentNode // 移动到tooltip对象内
              }}
            />
            <Flex justify="space-between">
              <Text strong>{formatTime(currentTime)} / {formatTime(duration)}</Text>
              <Space size="large">
                <Button icon={<StepBackwardOutlined />} />
                <Button icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />} onClick={togglePlay} />
                <Button icon={<StepForwardOutlined />} />
              </Space>
              <Flex align="center">
                <SoundOutlined style={{ marginRight: 8 }} />
                <Slider defaultValue={80} style={{ width: 100 }} tooltip={{ open: false }} />
              </Flex>
            </Flex>
          </Flex>
        </Card>
      </Col>
      
      {/* 单个音频导入列 - 最终修复版 */}
      <Col flex="300px" style={{ height: '100%' }}>
        <Card
          title="音频导入"
          extra={
            <Button 
              type="primary"
              icon={<PlusCircleOutlined />}
              style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
              onClick={handleImportClick} 
            >
              导入
            </Button>
          }
          bodyStyle={{ padding: 0, height: '100%', overflowY: 'auto' }}
          style={{ height: '100%' }}
        >
          <input
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <List
            size="small"
            dataSource={audioFiles}
            renderItem={(file) => (
              <List.Item
                key={file}
                onClick={() => handleAudioSelect(file)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: currentAudio === file ? 'rgba(114, 46, 209, 0.1)' : undefined,
                }}
              >
                <Flex align="center" style={{ width: '100%' }}>
                  <AudioOutlined style={{ marginRight: 8 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file}</span>
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/meeting-summary/${file}`);
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
  );
};



// 删除组件外部重复的useEffect和handleAudioSelect定义
  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('audio', file);
    try {
      const response = await request('http://0.0.0.0:8000/v1/audio/upload_audio', {
        method: 'POST',
        data: formData,
      });
      if (response.code === 200) {
        messageApi.success('音频上传成功');
        messageApi.error('获取音频列表失败');
        // 上传成功后重新获取音频列表
        fetchAudioList();
      } else {
        message.error('音频上传失败: ' + response.msg);
      }
    } catch (error) {
      message.error('音频上传失败，请重试');
    }
  };

const handleAudioSelect = async (fileName: string) => {
  updateAudioState({
    currentAudio: fileName,
    segments: [],
    waveformData: generateWaveform()
  });

  try {
    const response = await audioApi.processAudio(fileName);
    if (response.code === 200) {
      updateAudioState({ segments: JSON.parse(response.data) });
    } else {
      message.error(`处理失败: ${response.msg}`);
      // 添加空状态处理
      updateAudioState({ segments: [] });
    }
  } catch (error) {
    message.error('网络错误，无法处理音频');
    updateAudioState({ segments: [] });
  }
};
export default Dashboard;