import { ProLayoutProps } from '@ant-design/pro-components';

/**
 * @name
 */
const Settings: ProLayoutProps & {
  pwa?: boolean;
  logo?: string;
} = {
  navTheme: 'light',
  // 拂晓蓝
  colorPrimary: '#1890ff',
  layout: 'top', // 确保此项设置为'top'而非'side'
  contentWidth: 'Fixed',
  fixedHeader: false,
  fixSiderbar: false, // 将此项改为false，避免侧边栏固定
  colorWeak: false,
  title: '智能会议分析系统',
  pwa: true,
  logo: '/logo.svg', // 使用绝对路径确保正确引用
  iconfontUrl: '',
  token: {
    // 参见ts声明，demo 见文档，通过token 修改样式
    //https://procomponents.ant.design/components/layout#%E9%80%9A%E8%BF%87-token-%E4%BF%AE%E6%94%B9%E6%A0%B7%E5%BC%8F
  },
};

export default Settings;
