export default {
  dev: {
    // 取消注释并修改为正确的代理配置
    '/api/': {
      target: 'http://localhost:8000', // 后端API地址
      changeOrigin: true,
      pathRewrite: { '^/api': '' },
    },
    // 添加排除静态资源的配置
    '/(.*.(css|js|svg|png))': {
      target: 'http://localhost:8000',
      changeOrigin: false,
      bypass: function (req, res, proxyOptions) {
        res.setHeader(
          'Content-Type',
          req.path.endsWith('.css') ? 'text/css' : 'application/javascript',
        );
      },
    },
  },
  test: {
    // localhost:8000/api/** -> https://preview.pro.ant.design/api/**
    '/api/': {
      target: 'https://proapi.azurewebsites.net',
      changeOrigin: true,
      pathRewrite: { '^': '' },
    },
  },
  pre: {
    '/api/': {
      target: 'your pre url',
      changeOrigin: true,
      pathRewrite: { '^': '' },
    },
  },
};
