const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const SSHClient = require('../ssh/client');
const SessionManager = require('../session/manager');
const FileSearch = require('../ssh/search');
const Differ = require('../compare/differ');

/**
 * 로컬 파일과 서버의 파일 비교
 * @param {string} filePath - 파일 경로 (./index.html)
 * @param {object} options - { method: 'hash|date|content|size' }
 */
async function diffCommand(filePath, options) {
  // 세션 확인
  const session = SessionManager.loadSession();
  if (!session) {
    throw new Error('로그인이 필요합니다. 먼저 "pussh login"을 실행하세요.');
  }

  // 로컬 파일 확인
  const localPath = path.resolve(filePath);
  if (!fs.existsSync(localPath)) {
    throw new Error(`로컬 파일을 찾을 수 없습니다: ${filePath}`);
  }

  const fileName = path.basename(localPath);
  const method = options.method || 'content';

  const spinner = ora('작업 중...').start();

  try {
    // SSH 연결
    spinner.text = 'SSH 서버에 연결 중...';
    const ssh = new SSHClient();
    await ssh.connect(session.host, session.password);

    // 서버에서 파일 검색
    spinner.text = `서버에서 "${fileName}" 파일 검색 중...`;
    const remoteFiles = await FileSearch.findInDirectory(
      ssh,
      fileName,
      session.directory
    );

    if (remoteFiles.length === 0) {
      spinner.warn(`서버에서 파일을 찾을 수 없습니다: ${fileName}`);
      ssh.disconnect();
      return;
    }

    if (remoteFiles.length > 1) {
      spinner.warn(`서버에서 ${remoteFiles.length}개의 파일을 찾았습니다.`);
      remoteFiles.forEach((f, i) => {
        console.log(chalk.gray(`  [${i + 1}] ${f}`));
      });
      console.log(''); // 첫 번째 파일로 비교합니다.\n');
    }

    const remoteFile = remoteFiles[0];
    spinner.text = '파일 정보 수집 중...';

    // 로컬 파일 정보
    const localStat = fs.statSync(localPath);
    const localMtime = Math.floor(localStat.mtimeMs / 1000);
    const localSize = localStat.size;

    // 원격 파일 정보
    const remoteStat = await ssh.stat(remoteFile);
    if (!remoteStat) {
      spinner.fail('원격 파일 정보를 가져올 수 없습니다.');
      ssh.disconnect();
      return;
    }

    spinner.succeed('파일 정보 수집 완료\n');

    // 비교 방식에 따라 수행
    switch (method) {
      case 'hash':
        await compareByHash(ssh, localPath, remoteFile, spinner);
        break;
      case 'date':
        compareByDate(localMtime, remoteStat.mtime);
        break;
      case 'size':
        compareBySize(localSize, remoteStat.size);
        break;
      case 'content':
      default:
        await compareByContent(ssh, localPath, remoteFile, spinner);
        break;
    }

    ssh.disconnect();
  } catch (error) {
    spinner.fail('오류 발생');
    throw error;
  }
}

/**
 * 해시값으로 비교
 */
async function compareByHash(ssh, localFile, remoteFile, spinner) {
  spinner.start('MD5 해시 계산 중...');

  try {
    const localHash = Differ.calculateHash(localFile);
    const remoteHash = await ssh.getFileHash(remoteFile);

    const result = Differ.compareHash(localHash, remoteHash);

    spinner.stop();

    console.log(chalk.blue('━━━━━━━━━━━━━━━━ 해시 비교 ━━━━━━━━━━━━━━━━'));
    console.log(chalk.gray('로컬:'), chalk.white(result.localHash));
    console.log(chalk.gray('원격:'), chalk.white(result.remoteHash));
    console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    if (result.isDifferent) {
      console.log(chalk.red('✗ 파일이 다릅니다.\n'));
    } else {
      console.log(chalk.green('✓ 파일이 동일합니다.\n'));
    }
  } catch (error) {
    spinner.fail('해시 계산 실패');
    throw error;
  }
}

/**
 * 날짜로 비교
 */
function compareByDate(localMtime, remoteMtime) {
  const localDate = new Date(localMtime * 1000);
  const remoteDate = new Date(remoteMtime * 1000);

  console.log(chalk.blue('━━━━━━━━━━━━━ 수정 시간 비교 ━━━━━━━━━━━━'));
  console.log(chalk.gray('로컬:'), chalk.white(localDate.toLocaleString('ko-KR')));
  console.log(chalk.gray('원격:'), chalk.white(remoteDate.toLocaleString('ko-KR')));
  console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  if (localMtime > remoteMtime) {
    console.log(chalk.yellow('⚠ 로컬 파일이 더 최신입니다.\n'));
  } else if (remoteMtime > localMtime) {
    console.log(chalk.yellow('⚠ 원격 파일이 더 최신입니다.\n'));
  } else {
    console.log(chalk.green('✓ 파일이 같은 시간에 수정되었습니다.\n'));
  }
}

/**
 * 크기로 비교
 */
function compareBySize(localSize, remoteSize) {
  const result = Differ.compareSize(localSize, remoteSize);

  console.log(chalk.blue('━━━━━━━━━━━━━━━ 파일 크기 비교 ━━━━━━━━━━'));
  console.log(chalk.gray('로컬:'), chalk.white(Differ.formatFileSize(result.localSize)));
  console.log(chalk.gray('원격:'), chalk.white(Differ.formatFileSize(result.remoteSize)));

  if (result.isDifferent) {
    const diff = result.difference > 0 ? '+' : '';
    console.log(chalk.gray('차이:'), chalk.yellow(`${diff}${Differ.formatFileSize(result.difference)} (${diff}${result.percentage}%)`));
  }

  console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  if (result.isDifferent) {
    console.log(chalk.red('✗ 파일 크기가 다릅니다.\n'));
  } else {
    console.log(chalk.green('✓ 파일 크기가 동일합니다.\n'));
  }
}

/**
 * 내용으로 비교 (Git diff 스타일)
 */
async function compareByContent(ssh, localFile, remoteFile, spinner) {
  spinner.start('파일 내용 다운로드 중...');

  try {
    const localContent = Differ.readFile(localFile);

    // 원격 파일 다운로드
    const tempFile = `/tmp/pussh_${Date.now()}_temp`;
    await ssh.downloadFile(remoteFile, tempFile);

    const remoteContent = Differ.readFile(tempFile);

    // 임시 파일 삭제
    fs.unlinkSync(tempFile);

    const result = Differ.compareContent(localContent, remoteContent);

    spinner.stop();

    console.log(chalk.blue('━━━━━━━━━━━━━━━━ 내용 비교 ━━━━━━━━━━━━━━'));
    console.log('');

    if (result.isDifferent) {
      console.log(Differ.formatDiff(result.diff));
      console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
      console.log(chalk.red('✗ 파일이 다릅니다.\n'));
    } else {
      console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
      console.log(chalk.green('✓ 파일이 동일합니다.\n'));
    }
  } catch (error) {
    spinner.fail('파일 비교 실패');
    throw error;
  }
}

module.exports = diffCommand;
