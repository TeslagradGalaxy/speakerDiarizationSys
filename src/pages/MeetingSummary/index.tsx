import { request } from '@umijs/max';
import { Alert, Button, Card, Col, Row, Spin } from 'antd'; // 添加Button组件
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams } from 'react-router-dom';

const MeetingSummary: React.FC = () => {
  const { meeting_id } = useParams();
  const [summaryData, setSummaryData] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [regenerating, setRegenerating] = useState(false); // 新增重新生成状态

  // 提取数据获取逻辑为单独函数
  const fetchSummary = async (isRegenerate = false) => {
    if (!meeting_id) return;

    try {
      /* isRegenerate ? setRegenerating(true) : setLoading(true); */
      if (isRegenerate) {
        setRegenerating(true);
      } else {
        setLoading(true);
      }
      const response = await request(
        `http://localhost:8000/v1/audio/summary/${meeting_id}/${isRegenerate ? 1 : 0}`,
        { method: 'GET' },
      );

      if (response.code === 200) {
        setSummaryData(response.data);
        setError('');
      } else {
        setError(`获取会议纪要失败: ${response.msg || '未知错误'}`);
      }
    } catch (err) {
      setError('网络错误，无法连接到服务器');
      console.error('获取会议纪要失败:', err);
    } finally {
      if (isRegenerate) {
        setRegenerating(true);
      } else {
        setLoading(true);
      }
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [meeting_id]);

  // 自定义标题组件（带重新生成按钮）
  const CardTitle = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>会议纪要</span>
      <Button type="primary" onClick={() => fetchSummary(true)} loading={regenerating}>
        重新生成
      </Button>
    </div>
  );

  return (
    <Row gutter={16} style={{ height: '100vh', padding: '24px' }}>
      <Col flex="auto">
        <Card
          title={<CardTitle />} // 使用自定义标题组件
          style={{
            height: '100%',
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            marginBottom: 16,
            display: 'flex',
            flexDirection: 'column',
          }}
          bodyStyle={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px' }}>正在生成会议纪要...</div>
            </div>
          ) : error ? (
            <Alert message="错误" description={error} type="error" showIcon />
          ) : (
            <div
              style={{
                padding: 24,
                overflowY: 'auto',
                flex: 1,
                lineHeight: '1.8',
                fontSize: '14px',
              }}
            >
              <ReactMarkdown>{summaryData}</ReactMarkdown>
            </div>
          )}
        </Card>
      </Col>
    </Row>
  );
};

export default MeetingSummary;
