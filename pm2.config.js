module.exports = {
  apps: [{
    name: 'lilys-backend',
    script: './backend/server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
}
