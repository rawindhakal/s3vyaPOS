// pm2 process definitions for s3vyaPOS.
// Usage on server:  pm2 start deploy/ecosystem.config.js && pm2 save
module.exports = {
  apps: [
    {
      name: 's3vya-api',
      cwd: './apps/api',
      script: 'dist/main.js',
      env: {
        NODE_ENV: 'production',
        API_PORT: 5300,
      },
      max_memory_restart: '400M',
    },
    {
      name: 's3vya-web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3300',
      env: {
        NODE_ENV: 'production',
        WEB_PORT: 3300,
      },
      max_memory_restart: '400M',
    },
  ],
};
