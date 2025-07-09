import { request } from '@umijs/max';
import { Alert, Card, Col, Row, Spin } from 'antd';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams } from 'react-router-dom';

// 移除未使用的 Title 和 Text 解构
// const { Title, Text } = Typography;

const MeetingSummary: React.FC = () => {
  const { meeting_id } = useParams(); //从 URL 获取 meeting_id
  const [summaryData, setSummaryData] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!meeting_id) return;

    const fetchSummary = async () => {
      try {
        setLoading(true);
        const response = await request(`http://localhost:8000/v1/audio/summary/${meeting_id}/0`, {
          method: 'GET',
        });

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
        setLoading(false);
      }
    };

    fetchSummary();
  }, [meeting_id]);

  return (
    <Row gutter={16} style={{ height: '100vh', padding: '24px' }}>
      <Col flex="auto">
        <Card
          title="会议纪要"
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
