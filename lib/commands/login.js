const chalk = require('chalk');
const ora = require('ora');
const SSHClient = require('../ssh/client');
const SessionManager = require('../session/manager');

/**
 * SSH 로그인 및 세션 저장
 * @param {string} host - 호스트 (user@hostname) 또는 서버 이름
 * @param {string} password - 비밀번호 (서버 이름인 경우 무시)
 * @param {object} options - 옵션 { directory }
 */
async function loginCommand(host, password, options) {
  const spinner = ora('Connecting to SSH server...').start();

  try {
    let actualHost = host;
    let actualPassword = password;
    
    // host가 서버 이름인 경우 서버 정보 로드
    if (!host.includes('@')) {
      const server = SessionManager.getServer(host);
      if (!server) {
        throw new Error(`Server '${host}' not found. Use 'pussh server list' to see available servers.`);
      }
      actualHost = server.host;
      actualPassword = server.password;
      
      // 옵션 디렉토리가 없으면 서버의 기본 디렉토리 사용
      if (!options.directory) {
        options.directory = server.directory;
      }
    }
    
    // SSH 클라이언트 생성 및 연결
    const ssh = new SSHClient();
    await ssh.connect(actualHost, actualPassword);

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

    // 세션 저장 (서버 이름이 아닌 경우에만)
    if (host.includes('@')) {
      SessionManager.saveSession(host, password, options.directory || homeDir);
    }

    spinner.succeed('✓ Session saved successfully');

    // 호스트와 포트 파싱
    const [user, hostWithPort] = actualHost.split('@');
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
    console.log(chalk.gray('Server:'), chalk.white(host.includes('@') ? 'Direct Connection' : host));
    console.log(chalk.gray('User:'), chalk.white(user));
    console.log(chalk.gray('Host:'), chalk.white(displayHost));
    console.log(chalk.gray('Port:'), chalk.white(displayPort));
    console.log(chalk.gray('Directory:'), chalk.white(options.directory || homeDir));
    console.log(chalk.gray('Connected at:'), chalk.white(new Date().toLocaleString('en-US')));
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
