const chalk = require('chalk');
const SessionManager = require('../session/manager');
const addServerCommand = require('./server-add');

/**
 * 서버 목록 출력
 */
async function listServersCommand() {
  const servers = SessionManager.getServers();
  const defaultServerName = SessionManager.getDefaultServerName();
  
  console.log(chalk.blue('━━━━━━━━━━━━━━━━ Server List ━━━━━━━━━━━━━━━'));
  
  if (Object.keys(servers).length === 0) {
    console.log(chalk.yellow('No servers registered.'));
    console.log(chalk.gray('Use "pussh server add" to add a server.'));
    console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    return;
  }
  
  Object.entries(servers).forEach(([name, server]) => {
    const isDefault = name === defaultServerName;
    const defaultMark = isDefault ? chalk.green(' (default)') : '';
    
    console.log(chalk.cyan(`${name}${defaultMark}`));
    console.log(chalk.gray('  Host:'), chalk.white(server.host));
    console.log(chalk.gray('  Directory:'), chalk.white(server.directory));
    console.log(chalk.gray('  Added:'), chalk.white(new Date(server.addedAt).toLocaleString('en-US')));
    console.log('');
  });
  
  console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
}

/**
 * 서버 삭제
 */
async function removeServerCommand(serverName, options = {}) {
  if (!serverName) {
    throw new Error('Server name is required. Usage: pussh server remove <name>');
  }
  
  const servers = SessionManager.getServers();
  if (!servers[serverName]) {
    throw new Error(`Server '${serverName}' not found`);
  }
  
  if (!options.confirm) {
    console.log(chalk.yellow(`Are you sure you want to remove server '${serverName}'?`));
    console.log(chalk.gray('This action cannot be undone.'));
    console.log(chalk.gray('Run: pussh server remove ' + serverName + ' --confirm to proceed'));
    console.log('');
    throw new Error('Confirmation required. Use --confirm flag to proceed.');
  }
  
  SessionManager.removeServer(serverName);
  
  console.log(chalk.green(`✓ Server '${serverName}' removed successfully`));
  
  const remainingServers = Object.keys(servers).filter(name => name !== serverName);
  if (remainingServers.length === 0) {
    console.log(chalk.yellow('No servers remaining. Use "pussh server add <name>" to add a new server.'));
  } else {
    const newDefault = SessionManager.getDefaultServerName();
    if (newDefault) {
      console.log(chalk.cyan(`Default server is now '${newDefault}'`));
    }
  }
}

/**
 * 기본 서버 설정
 */
async function setDefaultServerCommand(serverName) {
  if (!serverName) {
    throw new Error('Server name is required. Usage: pussh server default <name>');
  }
  
  const servers = SessionManager.getServers();
  if (!servers[serverName]) {
    throw new Error(`Server '${serverName}' not found`);
  }
  
  SessionManager.setDefaultServer(serverName);
  
  console.log(chalk.green(`✓ Default server set to '${serverName}'`));
  console.log(chalk.gray('Host:'), chalk.white(servers[serverName].host));
  console.log(chalk.gray('Directory:'), chalk.white(servers[serverName].directory));
}

module.exports = {
  listServersCommand,
  addServerCommand,
  removeServerCommand,
  setDefaultServerCommand
};