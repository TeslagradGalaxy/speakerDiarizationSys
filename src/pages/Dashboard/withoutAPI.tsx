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
import { useNavigate } from '@umijs/max';
import useMessage from 'antd/es/message/useMessage';

const { Text } = Typography;




// 在组件内初始化messageApi
const Dashboard = () => {
  const [messageApi, contextHolder] = useMessage();
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(300);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const [segments, setSegments] = useState([]);
  const [waveformData, setWaveformData] = useState([]);
  const progressRef = useRef(null);
  const fileInputRef = useRef(null);

  // 静态音频库数据
  const audioLibrary = [
    '会议录音_20230702.mp3',
    '客户访谈_20230701.wav',
    '产品说明会_20230628.mp3',
  ];

  // 静态分段数据
  const segmentData = {
    '会议录音_20230702.mp3': [
      { speaker: '张经理', start_time: 83, text: '大家好，我们开始今天的项目会议' },
      { speaker: '李总监', start_time: 135, text: '首先汇报一下Q2的销售数据' },
      { speaker: '王主管', start_time: 222, text: '技术团队已完成80%的开发任务' },
      { speaker: '张经理', start_time: 296, text: '客户反馈需要增加两个新功能' },
      { speaker: '赵助理', start_time: 378, text: '下周需要安排客户演示会议' },
    ],
    '客户访谈_20230701.wav': Array.from({ length: 5 }, (_, i) => ({
      speaker: '销售',
      start_time: 120 + i * 60,
      text: `客户需求沟通：需要增加${['数据分析', '报表导出', '权限管理', '数据可视化', '移动端适配'][i]}功能`
    })),
    '产品说明会_20230628.mp3': [
      { speaker: '讲师', start_time: 70, text: '欢迎参加产品培训会' },
      { speaker: '讲师', start_time: 175, text: '首先介绍核心功能模块' },
      { speaker: '讲师', start_time: 270, text: '现在演示数据分析流程' },
      { speaker: '讲师', start_time: 405, text: '最后是Q&A环节' },
    ],
  };

  // 静态用户数据
  const userData = Array.from({ length: 12 }, (_, i) => ({
    title: `用户 ${i + 1}`,
    id: `user-${i + 1}`,
  }));

  // 生成波形图数据
  const generateWaveform = () => Array.from({ length: 200 }, () => Math.random() * 40 + 10);

  // 加载音频文件
  const loadAudio = (audioName: string) => {
    setCurrentAudio(audioName);
    setSegments(segmentData[audioName] || []);
    setCurrentTime(0);
    setPlaying(true);
    setWaveformData(generateWaveform());
  };

  // 播放/暂停切换
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

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 跳转到指定时间
  const jumpToSegment = (seconds: number) => {
    setCurrentTime(seconds);
  };

  // 初始化波形图
  useEffect(() => {
    setWaveformData(generateWaveform());
    return () => progressRef.current && clearInterval(progressRef.current);
  }, []);

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
    <Row gutter={16} style={{ height: '100vh', overflow: 'hidden' }}>
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
      <Col flex="auto" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Card
          title="音频分段"
          styles={{ body: { paddingRight: 16, height: '100%', overflowY: 'auto' } }}
          style={{ flex: 4, height: '75%', marginBottom: 16, background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)' }}
        >
          <List
            dataSource={segments}
            renderItem={(item: any, index: number) => (
              <List.Item
                onClick={() => handleSegmentClick(index, item.start_time)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: index === highlightIndex ? 'rgba(114, 46, 209, 0.1)' : 'inherit',
                  padding: '12px',
                  borderRadius: '8px',
                }}
              >
                <Space size="large" style={{ width: '100%' }} align="start">
                  <Avatar style={{ backgroundColor: index % 2 === 0 ? '#1890ff' : '#52c41a' }}>
                    {item.speaker.charAt(0)}
                  </Avatar>
                  <Text strong style={{ minWidth: 80, color: '#722ed1' }}>
                    {parseFloat(item.start_time).toFixed(1)}s
                  </Text>
                  <div
                    style={{
                      flex: 1,
                      maxHeight: 100,
                      overflowY: 'auto',
                      backgroundColor: '#fafafa',
                      padding: '8px',
                      borderRadius: '6px',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                    }}
                  >
                    <Text>{item.text}</Text>
                  </div>
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
            >
              导入
            </Button>
          }
          styles={{ body: { padding: 0, height: '100%', overflowY: 'auto' } }}
          style={{ height: '100%' }}
        >
          <List
            size="small"
            dataSource={audioLibrary}
            renderItem={(file) => (
              <List.Item
                key={file}
                onClick={() => loadAudio(file)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: currentAudio === file ? 'rgba(114, 46, 209, 0.1)' : undefined,
                }}
              >
                <Flex align="center" style={{ width: '100%' }}>
                  <AudioOutlined style={{ marginRight: 8 }} />
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{file}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>会议录音文件</Text>
                    <Text type="secondary" style={{ fontSize: '11px' }}>{new Date().toLocaleString()}</Text>
                  </div>
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
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

export default Dashboard;