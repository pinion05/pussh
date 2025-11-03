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
  const spinner = ora('Connecting to SSH server...').start();

  try {
    // SSH 클라이언트 생성 및 연결
    const ssh = new SSHClient();
    await ssh.connect(host, password);

    spinner.succeed('✓ SSH connection successful');

    // 홈 디렉토리 확인
    const pwdResult = await ssh.exec('pwd');
    const homeDir = pwdResult.stdout.trim();

    // 기본 디렉토리 설정
    const targetDir = options.directory || homeDir;

    // 지정된 디렉토리가 존재하는지 확인
    const dirCheckResult = await ssh.exec(`test -d "${targetDir}" && echo "exists"`);

    if (!dirCheckResult.stdout.includes('exists')) {
      spinner.warn(`Warning: Specified directory does not exist: ${targetDir}`);
      spinner.start('Using default home directory...');
      options.directory = homeDir;
    }

    // 세션 저장
    SessionManager.saveSession(host, password, options.directory || homeDir);

    spinner.succeed('✓ Session saved successfully');

    // 호스트와 포트 파싱
    const [user, hostWithPort] = host.split('@');
    let displayHost = hostWithPort;
    let displayPort = '22';

    if (hostWithPort.includes(':')) {
      const [h, p] = hostWithPort.split(':');
      displayHost = h;
      displayPort = p;
    }

    // 연결 정보 출력
    console.log('\n' + chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.cyan('✓ Login successful'));
    console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.gray('User:'), chalk.white(user));
    console.log(chalk.gray('Host:'), chalk.white(displayHost));
    console.log(chalk.gray('Port:'), chalk.white(displayPort));
    console.log(chalk.gray('Directory:'), chalk.white(options.directory || homeDir));
    console.log(chalk.gray('Saved at:'), chalk.white(new Date().toLocaleString('en-US')));
    console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    console.log(chalk.green('You can now use the following commands:'));
    console.log(chalk.yellow('  pussh diff <file>   - Compare files'));
    console.log(chalk.yellow('  pussh push <file>   - Upload files\n'));

    // 연결 종료
    ssh.disconnect();
  } catch (error) {
    spinner.fail('✗ Login failed');
    throw error;
  }
}

module.exports = loginCommand;
