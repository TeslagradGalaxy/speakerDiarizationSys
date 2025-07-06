import { Card, Col, Row, Typography, Spin, Alert } from 'antd';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { request } from '@umijs/max';
import ReactMarkdown from 'react-markdown';

const { Title, Text } = Typography;

const MeetingSummary: React.FC = () => {
  const { meeting_id } = useParams(); // ✅ 从 URL 获取 meeting_id
  const [summaryData, setSummaryData] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!meeting_id) return;

    const fetchSummary = async () => {
      try {
        setLoading(true);
        const response = await request(`http://0.0.0.0:8000/v1/audio/summary/${meeting_id}/1`, {
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
    <Row gutter={16} style={{ height: '100vh', overflow: 'hidden', padding: '24px' }}>
      <Col flex="auto">
        <Card
          title="会议纪要"
          style={{ height: '100%', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)', marginBottom: 16 }}
          bodyStyle={{ padding: '24px', overflowY: 'auto', height: 'calc(100% - 56px)' }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px' }}>正在生成会议纪要...</div>
            </div>
          ) : error ? (
            <Alert message="错误" description={error} type="error" showIcon />
          ) : (
            <div style={{ lineHeight: '1.8', fontSize: '14px' }}>
              <ReactMarkdown>{summaryData}</ReactMarkdown>
            </div>
          )}
        </Card>
      </Col>
    </Row>
  );
};

export default MeetingSummary;
