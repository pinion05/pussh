#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const figlet = require('figlet');
const loginCommand = require('../lib/commands/login');
const diffCommand = require('../lib/commands/diff');
const pushCommand = require('../lib/commands/push');

function showBanner() {
  console.log(chalk.cyan(figlet.textSync('Pussh', {
    font: 'Slant',
    horizontalLayout: 'default',
    verticalLayout: 'default'
  })));
}

program
  .name('pussh')
  .description('SSH 기반 파일 동기화 및 배포 도구')
  .version('1.1.2')
  .addHelpCommand('help [command]', '특정 명령어의 상세 도움말을 표시합니다');

// Banner를 먼저 출력하도록 커스터마이징
const originalOutputHelp = program.outputHelp;
program.outputHelp = function(cb) {
  showBanner();
  console.log('');
  return originalOutputHelp.call(this, cb);
};

// Login command
program
  .command('login <host> <password>')
  .option('-d, --directory <dir>', '서버의 기본 작업 디렉토리 설정 (기본: 홈 디렉토리)')
  .description(`
SSH 서버에 로그인하고 세션 정보를 저장합니다.
로그인 후 diff, push 명령어를 바로 사용할 수 있습니다.

호스트 형식:
  user@hostname          - 포트 22 (기본값)
  user@hostname:port    - 커스텀 포트 지정

예제:
  pussh login root@server.com 'password'
  pussh login user@server.com:2222 'password' -d ~/project
  pussh login admin@192.168.1.100 'mypass' -d /var/www/html

옵션:
  -d, --directory <dir>  서버의 기본 작업 디렉토리를 설정합니다
                        파일 검색 및 업로드의 기준 경로가 됩니다
  `.trim())
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
  .description(`
로컬 파일과 원격 서버의 파일을 비교합니다.
서버에서 동일한 파일명을 재귀적으로 검색하여 비교합니다.

비교 방식:
  hash     - MD5 해시값으로 빠르게 비교
  date     - 파일 수정 시간으로 비교
  size     - 파일 크기로 비교
  content  - 파일 내용을 상세하게 비교 (Git diff 스타일, 기본값)

예제:
  pussh diff ./index.html
  pussh diff ./app.js -m hash
  pussh diff ./style.css -m date
  pussh diff ./config.json -m size

동작 방식:
  1. 로컬 파일 존재 확인
  2. 원격 서버에서 동일 파일명 검색
  3. 선택된 방식으로 파일 비교
  4. 비교 결과 출력

옵션:
  -m, --method <method>  비교 방식을 선택합니다 (hash/date/content/size)
  `.trim())
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
  .description(`
로컬 파일을 원격 서버에 업로드합니다.
업로드 전 자동으로 백업 파일을 생성합니다.

동작 과정:
  1. 로컬 파일 존재 확인
  2. 원격 서버에서 동일 파일명 검색
  3. 여러 파일 발견 시 대화형 선택
  4. 기존 파일 있으면 백업 생성 (.pushbackup)
  5. 파일 업로드 및 검증

백업 정책:
  원격: filename.pushbackup
  로컬: filename.pushbackup

예제:
  pussh push ./index.html
  pussh push ./app.js -f
  pussh push ./config.json

옵션:
  -f, --force  확인 프롬프트를 건너뛰고 바로 업로드합니다
                자동화 스크립트에서 유용합니다
  `.trim())
  .action((file, options) => {
    pushCommand(file, options).catch(err => {
      console.error(chalk.red('❌ 오류:'), err.message);
      process.exit(1);
    });
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  showBanner();
  console.log('');
  console.log(chalk.yellow('사용법:'));
  console.log(chalk.white('  pussh <command> [options]'));
  console.log('');
  console.log(chalk.yellow('명령어:'));
  console.log(chalk.white('  login <host> <password>  SSH 서버에 로그인하고 세션 저장'));
  console.log(chalk.white('  diff <file>              로컬과 원격 파일 비교'));
  console.log(chalk.white('  push <file>              로컬 파일을 원격 서버에 업로드'));
  console.log(chalk.white('  help [command]           명령어 도움말 표시'));
  console.log('');
  console.log(chalk.yellow('예제:'));
  console.log(chalk.white('  pussh login root@server.com \'password\' -d ~/project'));
  console.log(chalk.white('  pussh diff ./index.html -m hash'));
  console.log(chalk.white('  pussh push ./app.js -f'));
  console.log('');
  console.log(chalk.gray('자세한 도움말: pussh help <command>'));
  console.log('');
  process.exit(0);
}
