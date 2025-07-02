import { Card } from 'antd';
import React from 'react';

const PageLayout = () => {
  return (
    <div style={styles.container}>
      <div style={styles.left}>左侧区域</div>
      <div style={styles.center}>  
        <Card style={{ width: 300 }}>
          <p>Card content</p>
          <p>Card content</p>
          <p>Card content</p>
        </Card>
  </div>
      <div style={styles.right}>右侧区域</div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    height: '100vh', // 或者你希望的具体高度
  },
  left: {
    width: 250,
    background: '#f5f5f5',
  },
  center: {
    flex: '0 0 960px',
    background: '#fff',
  },
  right: {
    width: 250,
    background: '#f5f5f5',
  },
};

export default PageLayout;
