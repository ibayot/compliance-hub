const { getDefaultConfig } = require('expo/metro-config');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Create the proxy instance once to prevent memory leaks and hanging
const apiProxy = createProxyMiddleware({
  target: 'http://127.0.0.1:4000',
  changeOrigin: true,
  ws: true,
  on: {
    proxyReq: fixRequestBody,
  },
});

config.server = {
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Proxy /api requests to the NestJS Gateway
      if (req.url.startsWith('/api')) {
        return apiProxy(req, res, next);
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
