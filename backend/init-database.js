const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function initDatabase() {
  try {
    console.log('🔧 데이터베이스 초기화를 시작합니다...\n');

    // 1. 데이터베이스 생성 (이미 존재하면 스킵)
    console.log('1. 데이터베이스 생성 중...');
    try {
      await execPromise('npx sequelize-cli db:create');
      console.log('✅ 데이터베이스가 생성되었습니다.');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  데이터베이스가 이미 존재합니다.');
      } else {
        throw error;
      }
    }

    // 2. 마이그레이션 실행
    console.log('\n2. 마이그레이션 실행 중...');
    await execPromise('npx sequelize-cli db:migrate');
    console.log('✅ 마이그레이션이 완료되었습니다.');

    // 3. 시드 데이터 삽입
    console.log('\n3. 초기 데이터 삽입 중...');
    await execPromise('npx sequelize-cli db:seed:all');
    console.log('✅ 초기 데이터가 삽입되었습니다.');

    console.log('\n🎉 데이터베이스 초기화가 완료되었습니다!');
    console.log('\n📝 생성된 계정:');
    console.log('   관리자: 01034424668 / admin1234');
    console.log('   운영자: 01012345678 / admin1234');
    console.log('\n🚀 서버를 시작할 준비가 되었습니다: npm run dev');
    
  } catch (error) {
    console.error('\n❌ 오류가 발생했습니다:', error.message);
    console.error('\n디버그 정보:');
    console.error(error);
    process.exit(1);
  }
}

// 스크립트 실행
initDatabase();