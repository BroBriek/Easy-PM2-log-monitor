module.exports = {
  apps: [
    {
      name: 'pm2-monitor',
      script: './server/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    }
  ]
};
