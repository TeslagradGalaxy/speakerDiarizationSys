import { request } from '@umijs/max';
import { Alert, Button, Card, Col, Row, Spin } from 'antd';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams } from 'react-router-dom';

const MeetingSummary: React.FC = () => {
  const { meeting_id } = useParams();
  const [summaryContent, setSummaryContent] = useState<string>(''); // 原始内容
  const [displayContent, setDisplayContent] = useState<string>(''); // 用于显示的内容
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // 添加防抖效果，确保内容更新后有短暂延迟再渲染
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayContent(summaryContent);
    }, 100); // 100ms防抖

    return () => clearTimeout(timer);
  }, [summaryContent]);

  const fetchSummary = async (isRegenerate = false) => {
    if (!meeting_id) return;

    setSummaryContent('');
    setError('');
    setIsStreaming(false);
    if (isRegenerate) setRegenerating(true);
    else setLoading(true);

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      // 确保API路径参数格式正确
      const url = `http://localhost:8000/v1/audio/summary/${meeting_id}/${isRegenerate
        .toString()
        .toLowerCase()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream, application/json',
          'Content-Type': 'application/json',
        },
        // 添加30秒超时控制
        //signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) throw new Error(`请求失败，状态码 ${response.status}`);

      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        const json = await response.json();
        if (json.code === 200) {
          setSummaryContent(json.data);
        } else {
          setError(json.msg || '获取会议纪要失败');
        }
        setLoading(false);
        setRegenerating(false);
        return;
      }

      if (!response.body) throw new Error('响应体为空');

      // 关键修改：开始处理流式响应时立即设置loading为false
      setLoading(false);
      setIsStreaming(true);
      reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      // 修改流式接收部分
      while (true) {
        let result;
        try {
          result = await reader.read();
        } catch (readError) {
          console.error('读取流数据失败:', readError);
          setError('流式读取失败，请重试');
          break;
        }

        if (result.done) break;

        buffer += decoder.decode(result.value, { stream: true });
        const events = buffer.split('\n\n');

        for (let i = 0; i < events.length - 1; i++) {
          const event = events[i].trim();
          if (event.startsWith('data:')) {
            const data = event.substring(5).trim();
            if (data === '[DONE]') {
              // 处理结束标记
              break;
            } else if (data) {
              // 直接更新内容，让useEffect处理防抖
              setSummaryContent((prev) => prev + data);
            }
          }
        }

        buffer = events[events.length - 1];
      }
      //生成完之后刷新
      const updatedSummary = await request(
        `http://localhost:8000/v1/audio/summary/${meeting_id}/0`,
      );
      if (updatedSummary.code === 200) {
        setSummaryContent(updatedSummary.data);
      } else {
        setError(updatedSummary.msg || '获取会议纪要失败');
      }
    } catch (err: any) {
      console.error('获取会议纪要失败:', err);
      if (err.name === 'TimeoutError') {
        setError('请求超时，请重试');
      } else if (err.message.includes('Failed to fetch')) {
        setError('网络连接失败，请检查服务器是否正常运行');
      } else if (err.message.includes('aborted')) {
        setError('流式传输被中止，请重试');
      } else {
        setError(err.message || '获取会议纪要时出错');
      }
    } finally {
      // 确保释放读取器资源
      if (reader) {
        try {
          await reader.cancel();
        } catch (cancelError) {
          console.error('取消读取器失败:', cancelError);
        }
      }
      setLoading(false);
      setRegenerating(false);
      // 延迟设置isStreaming为false，确保最后一块数据显示完成
      setTimeout(() => {
        setIsStreaming(false);
      }, 500);
    }
  };

  // 修改useEffect，添加错误处理
  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchSummary();
      } catch (err) {
        console.error('初始加载失败:', err);
        setLoading(false);
        setError('初始加载会议纪要失败');
      }
    };

    fetchData();
  }, [meeting_id]);

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
          title={<CardTitle />}
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
              <div style={{ marginTop: '16px' }}>
                {regenerating ? '正在重新生成会议纪要...' : '正在加载会议纪要...'}
              </div>
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
              {/* 使用displayContent而不是summaryContent */}
              <ReactMarkdown>{displayContent}</ReactMarkdown>
              {/* 删除光标元素 */}
            </div>
          )}
        </Card>
      </Col>
    </Row>
  );
};

// 删除CSS动画
// const styleSheet = document.createElement('style');
// styleSheet.type = 'text/css';
// styleSheet.innerText = `
// @keyframes blink {
//   from, to { opacity: 1; }
//   50% { opacity: 0; }
// }
// `;
// document.head.appendChild(styleSheet);

export default MeetingSummary;
