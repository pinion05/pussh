const chalk = require('chalk');
const ora = require('ora');
const SSHClient = require('../ssh/client');
const SessionManager = require('../session/manager');

/**
 * SSH 로그인 및 세션 저장
 * @param {string} host - 호스트 (user@hostname)
 * @param {string} password - 비밀번호
 * @param {object} options - 옵션 { directory }
 */
async function loginCommand(host, password, options) {
  const spinner = ora('SSH 서버에 연결 중...').start();

  try {
    // SSH 클라이언트 생성 및 연결
    const ssh = new SSHClient();
    await ssh.connect(host, password);

    spinner.succeed('✓ SSH 연결 성공');

    // 홈 디렉토리 확인
    const pwdResult = await ssh.exec('pwd');
    const homeDir = pwdResult.stdout.trim();

    // 기본 디렉토리 설정
    const targetDir = options.directory || homeDir;

    // 지정된 디렉토리가 존재하는지 확인
    const dirCheckResult = await ssh.exec(`test -d "${targetDir}" && echo "exists"`);

    if (!dirCheckResult.stdout.includes('exists')) {
      spinner.warn(`경고: 지정된 디렉토리가 없습니다: ${targetDir}`);
      spinner.start('기본 홈 디렉토리를 사용합니다...');
      options.directory = homeDir;
    }

    // 세션 저장
    SessionManager.saveSession(host, password, options.directory || homeDir);

    spinner.succeed('✓ 세션 저장 완료');

    // 연결 정보 출력
    console.log('\n' + chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.cyan('✓ 로그인 성공'));
    console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.gray('호스트:'), chalk.white(host));
    console.log(chalk.gray('디렉토리:'), chalk.white(options.directory || homeDir));
    console.log(chalk.gray('저장 시간:'), chalk.white(new Date().toLocaleString('ko-KR')));
    console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    console.log(chalk.green('이제 다음 명령어를 사용할 수 있습니다:'));
    console.log(chalk.yellow('  pussh diff <file>   - 파일 비교'));
    console.log(chalk.yellow('  pussh push <file>   - 파일 업로드\n'));

    // 연결 종료
    ssh.disconnect();
  } catch (error) {
    spinner.fail('✗ 로그인 실패');
    throw error;
  }
}

module.exports = loginCommand;
