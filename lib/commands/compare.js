const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const SSHClient = require('../ssh/client');
const SessionManager = require('../session/manager');
const DirectoryScanner = require('../utils/directory-scanner');
const FileSearch = require('../ssh/search');
const Differ = require('../compare/differ');

/**
 * 로컬과 원격 디렉토리 재귀 비교
 * @param {string} localDir - 로컬 디렉토리
 * @param {string} remoteDir - 원격 디렉토리
 * @param {object} options - 옵션
 */
async function compareCommand(localDir, remoteDir, options) {
  // 세션 확인
  const session = SessionManager.loadSession();
  if (!session) {
    throw new Error('Login required. Please run "pussh login" first.');
  }

  // 로컬 경로 정규화
  let localPath = localDir;
  if (localPath === '.') {
    localPath = process.cwd();
  } else {
    localPath = path.resolve(localPath);
  }

  // 원격 경로 정규화
  let remotePath = remoteDir;
  if (remotePath === '.') {
    remotePath = session.directory || '~';
  }

  // 로컬 디렉토리 확인
  if (!fs.existsSync(localPath)) {
    throw new Error(`Local directory not found: ${localDir}`);
  }

  const spinner = ora('Starting directory comparison...').start();

  try {
    // SSH 연결
    spinner.text = 'Connecting to SSH server...';
    const ssh = new SSHClient();
    await ssh.connect(session.host, session.password);

    // 로컬 디렉토리 스캔
    spinner.text = 'Scanning local directory...';
    const ignoreFilePath = path.join(localPath, '.pusshignore');
    const localFiles = await DirectoryScanner.scanDirectory(localPath, ignoreFilePath);

    // 원격 디렉토리 스캔
    spinner.text = 'Scanning remote directory...';
    const remoteFiles = await FileSearch.scanDirectory(ssh, remotePath);

    spinner.succeed('Directory scan complete\n');

    // 파일 비교
    const comparison = compareFileLists(localFiles, remoteFiles);

    // 결과 출력
    displayComparisonResults(
      comparison,
      localPath,
      remotePath,
      session,
      ssh
    );

    ssh.disconnect();
  } catch (error) {
    spinner.fail('Error occurred');
    throw error;
  }
}

/**
 * 파일 목록 비교
 * @param {array} localFiles - 로컬 파일 배열
 * @param {array} remoteFiles - 원격 파일 배열
 * @returns {object} 비교 결과
 */
function compareFileLists(localFiles, remoteFiles) {
  const localMap = new Map(localFiles.map(f => [f.relativePath, f]));
  const remoteMap = new Map(remoteFiles.map(f => [f.relativePath, f]));

  const result = {
    added: [],      // 로컬에만 있음
    deleted: [],    // 원격에만 있음
    modified: [],   // 둘 다 있지만 다름
    identical: []   // 같음
  };

  // 로컬 파일 확인
  for (const [path, localFile] of localMap) {
    if (remoteMap.has(path)) {
      const remoteFile = remoteMap.get(path);

      // 크기 또는 시간 다름 = 수정됨
      if (localFile.size !== remoteFile.size || localFile.mtime !== remoteFile.mtime) {
        result.modified.push({
          path,
          local: localFile,
          remote: remoteFile
        });
      } else {
        result.identical.push(path);
      }
    } else {
      // 원격에 없음 = 추가됨
      result.added.push({
        path,
        file: localFile
      });
    }
  }

  // 원격 파일 확인 (로컬에 없는 것 = 삭제됨)
  for (const [path, remoteFile] of remoteMap) {
    if (!localMap.has(path)) {
      result.deleted.push({
        path,
        file: remoteFile
      });
    }
  }

  return result;
}

/**
 * 비교 결과 출력
 */
function displayComparisonResults(comparison, localPath, remotePath, session, ssh) {
  const totalFiles = comparison.added.length + comparison.deleted.length +
                     comparison.modified.length + comparison.identical.length;

  // 요약
  console.log(chalk.blue('━━━━━━━━━━━━━━━━━ Directory Comparison Summary ━━━━━━━━━━━━━━━'));
  console.log(chalk.gray('Local:  '), chalk.white(localPath));
  console.log(chalk.gray('Remote: '), chalk.white(`${session.host}:${remotePath}`));
  console.log('');

  console.log(chalk.cyan('📊 Statistics:'));
  console.log(chalk.gray('  Added:    '), chalk.green(`${comparison.added.length}`));
  console.log(chalk.gray('  Deleted:  '), chalk.red(`${comparison.deleted.length}`));
  console.log(chalk.gray('  Modified: '), chalk.yellow(`${comparison.modified.length}`));
  console.log(chalk.gray('  Identical:'), chalk.gray(`${comparison.identical.length}`));
  console.log(chalk.gray('  Total:    '), chalk.white(`${totalFiles}`));
  console.log('');

  // 추가된 파일
  if (comparison.added.length > 0) {
    console.log(chalk.green('➕ Added (exists only in local):'));
    comparison.added.forEach(item => {
      const size = Differ.formatFileSize(item.file.size);
      console.log(chalk.green(`   + ${item.path}`), chalk.gray(`(${size})`));
    });
    console.log('');
  }

  // 삭제된 파일
  if (comparison.deleted.length > 0) {
    console.log(chalk.red('➖ Deleted (exists only in remote):'));
    comparison.deleted.forEach(item => {
      const size = Differ.formatFileSize(item.file.size);
      console.log(chalk.red(`   - ${item.path}`), chalk.gray(`(${size})`));
    });
    console.log('');
  }

  // 수정된 파일 (상세 정보)
  if (comparison.modified.length > 0) {
    console.log(chalk.yellow('✏️  Modified (content may differ):'));
    comparison.modified.forEach(item => {
      console.log(chalk.yellow(`   ~ ${item.path}`));

      const localSize = item.local.size;
      const remoteSize = item.remote.size;
      const sizeDiff = localSize - remoteSize;
      const sizeStr = sizeDiff > 0 ?
        chalk.green(`+${Differ.formatFileSize(sizeDiff)}`) :
        chalk.red(Differ.formatFileSize(sizeDiff));

      console.log(chalk.gray(`     Size: ${Differ.formatFileSize(localSize)} → ${Differ.formatFileSize(remoteSize)} (${sizeStr})`));

      // 수정 시간 비교
      const localDate = new Date(item.local.mtime * 1000);
      const remoteDate = new Date(item.remote.mtime * 1000);
      const timeStr = item.local.mtime > item.remote.mtime ?
        chalk.cyan('Local newer') :
        chalk.magenta('Remote newer');

      console.log(chalk.gray(`     Time: ${localDate.toLocaleString()} → ${remoteDate.toLocaleString()} (${timeStr})`));
    });
    console.log('');
  }

  // 동일한 파일 (요약만)
  if (comparison.identical.length > 0) {
    console.log(chalk.gray(`✓ Identical: ${comparison.identical.length} files are up to date`));
    console.log('');
  }

  // 권고사항
  console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');

  if (comparison.added.length > 0) {
    console.log(chalk.yellow(`⚠️  ${comparison.added.length} file(s) need to be pushed to remote.`));
  }

  if (comparison.deleted.length > 0) {
    console.log(chalk.yellow(`⚠️  ${comparison.deleted.length} file(s) exist only on remote (consider cleaning up).`));
  }

  if (comparison.modified.length > 0) {
    console.log(chalk.yellow(`⚠️  ${comparison.modified.length} file(s) may have differences.`));
    console.log(chalk.cyan('    Use `pussh diff <file>` for detailed comparison.'));
  }

  if (comparison.added.length === 0 && comparison.deleted.length === 0 && comparison.modified.length === 0) {
    console.log(chalk.green('✓ Directories are in sync!'));
  }

  console.log('');
}

module.exports = compareCommand;
