// pm2 설정 — 항상 80포트 + 영구 데이터 경로로 실행 (재시작/재부팅 시 데이터 유지)
// 사용: pm2 delete eroom 2>/dev/null; pm2 start ecosystem.config.js; pm2 save
module.exports = {
  apps: [{
    name: 'eroom',
    script: 'server.js',
    cwd: __dirname,
    env: {
      PORT: 80,
      DATA_DIR: '/root/eroom-data'   // 앱 폴더 밖의 고정 경로 — 재배포해도 보존
    }
  }]
};
