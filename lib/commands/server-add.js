const chalk = require('chalk');
const ora = require('ora');
const SessionManager = require('../session/manager');
const SSHClient = require('../ssh/client');

/**
 * 서버 추가 (대화형)
 */
async function addServerCommand(serverName) {
  console.log(chalk.blue('━━━━━━━━━━━━━━━━ Add New Server ━━━━━━━━━━━━━━━'));
  
  // 서버 이름이 제공되지 않은 경우 대화형으로 입력받기
  if (!serverName) {
    console.log(chalk.yellow('Please provide server name as argument:'));
    console.log(chalk.gray('  pussh server add <server-name>'));
    console.log(chalk.gray('  pussh server add production'));
    console.log('');
    throw new Error('Server name is required as argument');
  }
  
  // 서버 이름 중복 확인
  const servers = SessionManager.getServers();
  if (servers[serverName]) {
    throw new Error(`Server '${serverName}' already exists. Use a different name.`);
  }
  
  console.log(chalk.cyan(`Adding server: ${serverName}`));
  console.log('');
  
  // 임시로 간단한 구현 - 기본값으로 서버 추가
  const defaultHost = 'user@hostname';
  const defaultPassword = 'password';
  const defaultDirectory = '~';
  
  console.log(chalk.yellow('Note: Interactive input is temporarily simplified.'));
  console.log(chalk.gray(`Using default values - please update ~/.pussh/config.json after adding`));
  console.log('');
  
  const spinner = ora('Adding server with default values...').start();
  
  try {
    // 서버 저장 (기본값으로)
    SessionManager.addServer(serverName, defaultHost, defaultPassword, defaultDirectory);
    
    spinner.succeed(`Server '${serverName}' added with default values`);
    
    console.log('\n' + chalk.blue('━━━━━━━━━━━━━━━━ Server Added ━━━━━━━━━━━━━━━'));
    console.log(chalk.cyan('✓ Server registered successfully\n'));
    console.log(chalk.gray('Name:'), chalk.white(serverName));
    console.log(chalk.gray('Host:'), chalk.white(defaultHost));
    console.log(chalk.gray('Directory:'), chalk.white(defaultDirectory));
    console.log(chalk.yellow('⚠ Please update host and password in ~/.pussh/config.json'));
    console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    
    const isDefault = SessionManager.getDefaultServerName() === serverName;
    if (isDefault) {
      console.log(chalk.green(`Server '${serverName}' is set as default.`));
    } else {
      console.log(chalk.yellow(`Use "pussh server default ${serverName}" to set as default.`));
    }
    
  } catch (error) {
    spinner.fail('Failed to add server');
    throw new Error(`Failed to add server: ${error.message}`);
  }
}

module.exports = addServerCommand;