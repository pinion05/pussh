#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const loginCommand = require('../lib/commands/login');
const diffCommand = require('../lib/commands/diff');
const pushCommand = require('../lib/commands/push');

program
  .name('pussh')
  .description('SSH 기반 파일 동기화 및 배포 도구')
  .version('1.0.0');

// Login command
program
  .command('login <host> <password>')
  .option('-d, --directory <dir>', '서버의 기본 디렉토리')
  .description('SSH 서버에 로그인하고 세션 저장')
  .action((host, password, options) => {
    loginCommand(host, password, options).catch(err => {
      console.error(chalk.red('❌ 오류:'), err.message);
      process.exit(1);
    });
  });

// Diff command
program
  .command('diff <file>')
  .option('-m, --method <method>', '비교 방식: hash, date, content, size (기본: content)', 'content')
  .description('로컬 파일과 서버의 파일 비교')
  .action((file, options) => {
    diffCommand(file, options).catch(err => {
      console.error(chalk.red('❌ 오류:'), err.message);
      process.exit(1);
    });
  });

// Push command
program
  .command('push <file>')
  .option('-f, --force', '확인 없이 강제 업로드')
  .description('로컬 파일을 서버에 업로드')
  .action((file, options) => {
    pushCommand(file, options).catch(err => {
      console.error(chalk.red('❌ 오류:'), err.message);
      process.exit(1);
    });
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
