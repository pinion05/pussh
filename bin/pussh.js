#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const figlet = require('figlet');
const loginCommand = require('../lib/commands/login');
const diffCommand = require('../lib/commands/diff');
const compareCommand = require('../lib/commands/compare');
const pushCommand = require('../lib/commands/push');
const serverCommands = require('../lib/commands/server');

function showBanner() {
  console.log(chalk.cyan(figlet.textSync('Pussh', {
    font: 'Slant',
    horizontalLayout: 'default',
    verticalLayout: 'default'
  })));
}

program
  .name('pussh')
  .description('SSH-based file synchronization and deployment tool')
  .version('1.2.2')
  .addHelpCommand('help [command]', 'Show detailed help for a specific command');

// Banner를 먼저 출력하도록 커스터마이징
const originalOutputHelp = program.outputHelp;
program.outputHelp = function(cb) {
  showBanner();
  console.log('');
  return originalOutputHelp.call(this, cb);
};

// Login command
program
  .command('login <host> [password]')
  .option('-d, --directory <dir>', 'Set default working directory on server (default: home directory)')
  .description(`
Login to SSH server and save session information.
After login, you can immediately use diff and push commands.

Host format:
  user@hostname          - Direct SSH connection
  user@hostname:port    - Direct SSH with custom port
  server_name           - Use registered server (from 'pussh server list')

Examples:
  pussh login root@server.com 'password'
  pussh login user@server.com:2222 'password' -d ~/project
  pussh login production                    # Use registered server
  pussh login staging -d /var/www/html      # Use registered server with custom directory

Options:
  -d, --directory <dir>  Set default working directory on server
                        Base path for file search and upload
  `.trim())
  .action((host, password, options) => {
    loginCommand(host, password, options).catch(err => {
      console.error(chalk.red('❌ Error:'), err.message);
      process.exit(1);
    });
  });

// Diff command
program
  .command('diff <file>')
  .description(`
Comprehensively compare local files with remote server files.
Recursively searches for files with the same name on the server and performs all comparison methods.

Comparison methods (automatically performed):
  • Size   - File size comparison (instant)
  • Time   - Modification time comparison (instant)
  • Hash   - MD5 hash value comparison (fast)
  • Content - Detailed file content comparison (Git diff style)

Examples:
  pussh diff ./index.html
  pussh diff ./app.js
  pussh diff ./style.css

How it works:
  1. Check local file existence
  2. Search for files with same name on remote server
  3. Automatically perform all comparison methods
  4. Display comprehensive results (summary + details)

Features:
  • Perform all comparisons with a single command
  • Provide other information even if some comparisons fail
  • Clear summary and detailed content display
  `.trim())
  .action((file) => {
    diffCommand(file, {}).catch(err => {
      console.error(chalk.red('❌ Error:'), err.message);
      process.exit(1);
    });
  });

// Compare directories command
program
  .command('compare <local> <remote>')
  .description(`
Compare local and remote directories recursively.
Displays differences between directory contents including added, deleted, and modified files.

Directory comparison:
  • Recursively scans both directories
  • Supports .pusshignore patterns
  • Shows file size and modification time differences
  • Categorizes changes: added, deleted, modified, identical

Examples:
  pussh compare ./src ~/remote/src          # Compare specific directories
  pussh compare . .                         # Compare current directory with remote default

Output:
  ➕ Added - Files existing only locally (not pushed yet)
  ➖ Deleted - Files existing only remotely
  ✏️ Modified - Files with size or time differences
  ✓ Identical - Files synchronized

Ignore patterns:
  Create .pusshignore in the local directory to exclude files
  Example: node_modules/, .git/, *.log, .DS_Store
  `.trim())
  .action((local, remote, options) => {
    compareCommand(local, remote, options).catch(err => {
      console.error(chalk.red('❌ Error:'), err.message);
      process.exit(1);
    });
  });

// Push command
program
  .command('push <file>')
  .option('-f, --force', 'Force upload without confirmation')
  .description(`
Upload local files to remote server.
Automatically creates backup files before upload.

Process:
  1. Check local file existence
  2. Search for files with same name on remote server
  3. Interactive selection if multiple files found
  4. Create backup if existing file (.pushbackup)
  5. File upload and verification

Backup policy:
  Remote: filename.pushbackup
  Local: filename.pushbackup

Examples:
  pussh push ./index.html
  pussh push ./app.js -f
  pussh push ./config.json

Options:
  -f, --force  Skip confirmation prompt and upload immediately
                Useful for automation scripts
  `.trim())
  .action((file, options) => {
    pushCommand(file, options).catch(err => {
      console.error(chalk.red('❌ Error:'), err.message);
      process.exit(1);
    });
  });

// Server management commands
const serverCommand = program
  .command('server')
  .description('Server management commands');

serverCommand
  .command('list')
  .description('List all registered servers')
  .action(() => {
    serverCommands.listServersCommand().catch(err => {
      console.error(chalk.red('❌ Error:'), err.message);
      process.exit(1);
    });
  });

serverCommand
  .command('add [name]')
  .description('Add a new server (interactive)')
  .action((name) => {
    serverCommands.addServerCommand(name).catch(err => {
      console.error(chalk.red('❌ Error:'), err.message);
      process.exit(1);
    });
  });

serverCommand
  .command('remove <name>')
  .description('Remove a server')
  .option('--confirm', 'Skip confirmation prompt and remove server immediately')
  .action((name, options) => {
    serverCommands.removeServerCommand(name, options).catch(err => {
      console.error(chalk.red('❌ Error:'), err.message);
      process.exit(1);
    });
  });

serverCommand
  .command('default <name>')
  .description('Set default server')
  .action((name) => {
    serverCommands.setDefaultServerCommand(name).catch(err => {
      console.error(chalk.red('❌ Error:'), err.message);
      process.exit(1);
    });
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  showBanner();
  console.log('');
  console.log(chalk.yellow('Usage:'));
  console.log(chalk.white('  pussh <command> [options]'));
  console.log('');
  console.log(chalk.yellow('Commands:'));
  console.log(chalk.white('  login <host> <password>   Login to SSH server and save session'));
  console.log(chalk.white('  diff <file>                Comprehensive comparison of local and remote files'));
  console.log(chalk.white('  compare <local> <remote>   Compare directories recursively'));
  console.log(chalk.white('  push <file>                Upload local files to remote server'));
  console.log(chalk.white('  server <command>           Server management (list/add/remove/default)'));
  console.log(chalk.white('  help [command]             Show command help'));
  console.log('');
  console.log(chalk.yellow('Examples:'));
  console.log(chalk.white('  pussh login root@server.com \'password\' -d ~/project'));
  console.log(chalk.white('  pussh login production                    # Use registered server'));
  console.log(chalk.white('  pussh diff ./index.html'));
  console.log(chalk.white('  pussh compare ./src ~/remote/src'));
  console.log(chalk.white('  pussh push ./app.js -f'));
  console.log(chalk.white('  pussh server list'));
  console.log(chalk.white('  pussh server add production'));
  console.log(chalk.white('  pussh server remove test --confirm'));
  console.log('');
  console.log(chalk.gray('For detailed help: pussh help <command>'));
  console.log('');
  process.exit(0);
}
