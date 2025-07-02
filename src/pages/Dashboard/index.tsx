import React, { useState, useRef, useEffect } from 'react';
import {
  PlusCircleOutlined,
  PlaySquareOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  SoundOutlined
} from '@ant-design/icons';
import { Card, Col, Row, List, Avatar, Button, Slider, Space, Typography, Flex } from 'antd';

const { Text } = Typography;

const Dashboard = () => {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(300); // 总时长5分钟
  const [currentAudio, setCurrentAudio] = useState(null);
  const [segments, setSegments] = useState([]);
  const [waveformData, setWaveformData] = useState([]);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  
  // 音频库数据
  const audioLibrary = [
    '会议录音_20230702.mp3',
    '客户访谈_20230701.wav',
    '产品说明会_20230628.mp3'
  ];
  
  // 分段数据
  const segmentData = {
    '会议录音_20230702.mp3': [
      { speaker: '张经理', timestamp: '00:01:23', content: '大家好，我们开始今天的项目会议' },
      { speaker: '李总监', timestamp: '00:02:15', content: '首先汇报一下Q2的销售数据' },
      { speaker: '王主管', timestamp: '00:03:42', content: '技术团队已完成80%的开发任务' },
      { speaker: '张经理', timestamp: '00:04:56', content: '客户反馈需要增加两个新功能' },
      { speaker: '赵助理', timestamp: '00:06:18', content: '下周需要安排客户演示会议' }
    ],
    '客户访谈_20230701.wav': [
      { speaker: '客户', timestamp: '00:00:45', content: '我们对产品整体很满意' },
      { speaker: '销售', timestamp: '00:01:30', content: '您觉得哪些功能最有用？' },
      { speaker: '客户', timestamp: '00:02:50', content: '数据分析模块节省了大量时间' },
      { speaker: '销售', timestamp: '00:04:20', content: '需要增加什么新功能吗？' }
    ],
    '产品说明会_20230628.mp3': [
      { speaker: '讲师', timestamp: '00:01:10', content: '欢迎参加产品培训会' },
      { speaker: '讲师', timestamp: '00:02:55', content: '首先介绍核心功能模块' },
      { speaker: '讲师', timestamp: '00:04:30', content: '现在演示数据分析流程' },
      { speaker: '讲师', timestamp: '00:06:45', content: '最后是Q&A环节' }
    ]
  };

  // 用户声纹库数据
  const userData = Array.from({ length: 8 }, (_, i) => ({
    title: `用户 ${i + 1}`,
    id: `user-${i + 1}`
  }));

  // 生成波形数据
  const generateWaveform = () => {
    const data = [];
    for (let i = 0; i < 200; i++) {
      data.push(Math.random() * 40 + 10); // 随机生成波形高度
    }
    return data;
  };

  // 加载音频
  const loadAudio = (audioName) => {
    setCurrentAudio(audioName);
    setSegments(segmentData[audioName] || []);
    setCurrentTime(0);
    setPlaying(true);
    setWaveformData(generateWaveform()); // 生成新的波形数据
  };

  // 控制音频播放
  const togglePlay = () => {
    setPlaying(!playing);
    
    if (!playing) {
      progressRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            setPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (progressRef.current) {
      clearInterval(progressRef.current);
    }
  };

  // 格式化时间显示
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 跳转到指定时间点
  const jumpToSegment = (time) => {
    const [mins, secs] = time.split(':').slice(1).map(Number);
    setCurrentTime(mins * 60 + secs);
  };

  // 清除定时器
  useEffect(() => {
    // 初始生成波形数据
    setWaveformData(generateWaveform());
    
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  // 获取当前激活的分段索引
  const getActiveIndex = () => {
    return segments.findIndex(seg => {
      const [mins, secs] = seg.timestamp.split(':').slice(1).map(Number);
      return currentTime >= (mins * 60 + secs);
    });
  };

  const activeIndex = getActiveIndex();

  return (
    <Row gutter={16} style={{ display: 'flex', alignItems: 'stretch', height: '80vh' }}>
      {/* 左侧用户声纹库 */}
      <Col flex="300px">
        <Card 
          title="用户声纹库" 
          extra={
            <Button 
              type="primary" 
              icon={<PlusCircleOutlined />}
              style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
            />
          } 
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <List
              itemLayout="horizontal"
              dataSource={userData}
              renderItem={(item) => (
                <List.Item 
                  actions={[
                    <Button 
                      type="text" 
                      icon={<PlaySquareOutlined style={{ fontSize: '20px', color: '#111' }} />}
                    />
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar src={`https://api.dicebear.com/7.x/miniavs/svg?seed=${item.id}`} />}
                    title={<Text strong>{item.title}</Text>}
                    description={
                      <Flex vertical gap={4}>
                        <Text type="secondary">最近活跃: 今天 10:30</Text>
                        <Slider
                          defaultValue={50} 
                          tooltip={{ open: false }}
                          style={{ width: '80%', margin: '4px 0' }}
                        />
                      </Flex>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        </Card>
      </Col>

      {/* 中间区域 - 音频展示和控制 */}
      <Col 
        flex="auto" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%'
        }}
      >
        {/* 上方音频分段展示 (80%高度) - 炫酷玻璃态效果 */}
        <Card 
          title="音频分段" 
          style={{ 
            flex: 4, 
            marginBottom: 0,
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            overflow: 'auto'
          }}
        >
           {/* 滚动容器 */}
    <div style={{ flex: 1, overflowY: 'auto' }}>
          <List
            dataSource={segments}
            renderItem={(item, index) => (
              <List.Item 
                onClick={() => jumpToSegment(item.timestamp)}
                style={{ 
                  cursor: 'pointer',
                  backgroundColor: index === activeIndex ? 'rgba(114, 46, 209, 0.1)' : 'inherit',
                  padding: '12px',
                  borderRadius: '8px',
                  transition: 'all 0.3s',
                  transform: index === activeIndex ? 'scale(1.02)' : 'none',
                  boxShadow: index === activeIndex 
                    ? '0 4px 12px rgba(114, 46, 209, 0.2)' 
                    : 'none'
                }}
              >
                <Space size="large">
                  <Avatar 
                    style={{ 
                      backgroundColor: index % 2 === 0 ? '#1890ff' : '#52c41a',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                    }}
                  >
                    {item.speaker.charAt(0)}
                  </Avatar>
                  <Text strong style={{ minWidth: 80, color: '#722ed1' }}>{item.timestamp}</Text>
                  <Text>{item.content}</Text>
                </Space>
              </List.Item>
            )}
          />
          </div>
        </Card>

        {/* 下方音频控制面板 (20%高度) - 专业波形效果 */}
        <Card style={{ 
          flex: 1, 
          marginTop: 16,
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
          <Flex vertical justify="space-between" style={{ height: '100%' }}>
            {/* 专业波形图效果 */}
            <div style={{ 
              position: 'relative', 
              height: '60px', 
              marginBottom: '10px'
            }}>
              {/* 波形背景 */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '100%',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                padding: '0 2px'
              }}>
                {waveformData.map((height, index) => (
                  <div 
                    key={index}
                    style={{
                      width: '2px',
                      height: `${height}%`,
                      background: '#d9d9d9',
                      borderRadius: '1px',
                      transition: 'all 0.1s'
                    }}
                  />
                ))}
              </div>
              
              {/* 播放进度覆盖层 */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: `${(currentTime / duration) * 100}%`,
                height: '100%',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  padding: '0 2px'
                }}>
                  {waveformData.map((height, index) => (
                    <div 
                      key={index}
                      style={{
                        width: '2px',
                        height: `${height}%`,
                        background: 'linear-gradient(to top, #722ed1, #9254de)',
                        borderRadius: '1px',
                        transition: 'all 0.1s'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            {/* 进度条 */}
            <Slider
              min={0}
              max={duration}
              value={currentTime}
              onChange={(value) => setCurrentTime(value)}
              tooltip={{ formatter: (value) => formatTime(value || 0) }}
              trackStyle={{ 
                background: 'linear-gradient(to right, #722ed1, #9254de)',
                height: '8px'
              }}
              railStyle={{ 
                background: 'linear-gradient(to right, #f0f0f0, #d9d9d9)',
                height: '8px'
              }}
              handleStyle={{ 
                borderColor: '#722ed1',
                boxShadow: '0 0 0 4px rgba(114, 46, 209, 0.2)',
                height: '20px',
                width: '20px'
              }}
            />
            
            {/* 控制按钮和时间显示 */}
            <Flex justify="space-between" align="center">
              <Text strong style={{ color: '#722ed1' }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Text>
              
              <Space size="large">
                <Button 
                  type="text" 
                  icon={<StepBackwardOutlined style={{ fontSize: '24px', color: '#722ed1' }} />}
                />
                <Button 
                  type="text"
                  icon={
                    playing 
                      ? <PauseCircleOutlined style={{ fontSize: '36px', color: '#722ed1' }} /> 
                      : <PlayCircleOutlined style={{ fontSize: '36px', color: '#722ed1' }} />
                  }
                  onClick={togglePlay}
                />
                <Button 
                  type="text" 
                  icon={<StepForwardOutlined style={{ fontSize: '24px', color: '#722ed1' }} />}
                />
              </Space>
              
              <Flex align="center">
                <SoundOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                <Slider 
                  defaultValue={80} 
                  style={{ width: 100 }} 
                  tooltip={{ open: false }}
                  trackStyle={{ background: 'linear-gradient(to right, #722ed1, #9254de)' }}
                />
              </Flex>
            </Flex>
          </Flex>
        </Card>
      </Col>

      {/* 右侧音频导入面板 */}
      <Col flex="300px" style={{ marginLeft: 16 }}> 
        <Card 
          title="音频导入" 
          extra={
            <Button 
              type="primary" 
              icon={<PlusCircleOutlined />}
              style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
            />
          }
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <List
              size="small"
              dataSource={audioLibrary}
              renderItem={item => (
                <List.Item 
                  style={{ 
                    cursor: 'pointer', 
                    padding: '8px 12px',
                    borderRadius: '8px',
                    transition: 'all 0.3s',
                    backgroundColor: currentAudio === item ? 'rgba(114, 46, 209, 0.1)' : 'inherit'
                  }}
                  onClick={() => loadAudio(item)}
                >
                  <Text 
                    ellipsis 
                    style={{ 
                      color: currentAudio === item ? '#722ed1' : 'inherit',
                      fontWeight: currentAudio === item ? 500 : 'normal'
                    }}
                  >
                    {item}
                  </Text>
                </List.Item>
              )}
            />
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default Dashboard;