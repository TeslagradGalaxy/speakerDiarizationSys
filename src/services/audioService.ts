import { request } from '@umijs/max';
import { message } from 'antd';

// 创建带认证的请求实例
const audioRequest = async (url: string, options: any = {}) => {
  try {
    const response = await request(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return response;
  } catch (error: any) {
    message.error(error.message || '请求失败，请重试');
    throw error;
  }
};

export const audioApi = {
  // 获取音频列表
  getAudioList: () => audioRequest('http://localhost:8000/v1/audio/search_meeting'),
  // 处理音频分段
  processAudio: (fileName: string) =>
    audioRequest(`http://localhost:8000/v1/audio/process/${fileName}`),
  // 上传音频文件
  uploadAudio: (formData: FormData) =>
    audioRequest('http://localhost:8000/v1/audio/add_audio', {
      method: 'POST',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
