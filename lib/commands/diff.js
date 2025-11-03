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
 * @param {object} options - 옵션 (현재는 사용하지 않음)
 */
async function diffCommand(filePath, options) {
  // 세션 확인
  const session = SessionManager.loadSession();
  if (!session) {
    throw new Error('Login required. Please run "pussh login" first.');
  }

  // 로컬 파일 확인
  const localPath = path.resolve(filePath);
  if (!fs.existsSync(localPath)) {
    throw new Error(`Local file not found: ${filePath}`);
  }

  const fileName = path.basename(localPath);

  const spinner = ora('Working...').start();

  try {
    // SSH 연결
    spinner.text = 'Connecting to SSH server...';
    const ssh = new SSHClient();
    await ssh.connect(session.host, session.password);

    // 서버에서 파일 검색
    spinner.text = `Searching for "${fileName}" file on server...`;
    const remoteFiles = await FileSearch.findInDirectory(
      ssh,
      fileName,
      session.directory
    );

    if (remoteFiles.length === 0) {
      spinner.warn(`File not found on server: ${fileName}`);
      ssh.disconnect();
      return;
    }

    if (remoteFiles.length > 1) {
      spinner.warn(`Found ${remoteFiles.length} files on server.`);
      remoteFiles.forEach((f, i) => {
        console.log(chalk.gray(`  [${i + 1}] ${f}`));
      });
      console.log(''); // Comparing with the first file.\n');
    }

    const remoteFile = remoteFiles[0];
    spinner.text = 'Collecting file information...';

    // 로컬 파일 정보
    const localStat = fs.statSync(localPath);
    const localMtime = Math.floor(localStat.mtimeMs / 1000);
    const localSize = localStat.size;

    // 원격 파일 정보
    const remoteStat = await ssh.stat(remoteFile);
    if (!remoteStat) {
      spinner.fail('Could not retrieve remote file information.');
      ssh.disconnect();
      return;
    }

    spinner.succeed('File information collection complete\n');

    // 통합 비교 수행
    await performComprehensiveComparison(
      ssh, 
      localPath, 
      remoteFile, 
      localStat, 
      remoteStat, 
      spinner
    );

    ssh.disconnect();
  } catch (error) {
    spinner.fail('Error occurred');
    throw error;
  }
}

/**
 * 통합 비교 수행
 */
async function performComprehensiveComparison(ssh, localPath, remoteFile, localStat, remoteStat, spinner) {
  const results = {};

  // 1. 크기 비교 (가장 빠름)
  spinner.text = 'Step 1/4: Comparing file sizes...';
  results.size = await safeCompareBySize(localStat.size, remoteStat.size);

  // 2. 시간 비교 (즉시 가능)
  spinner.text = 'Step 2/4: Comparing modification times...';
  results.date = safeCompareByDate(localStat.mtime, remoteStat.mtime);

  // 3. 해시 비교 (중간 속도)
  spinner.text = 'Step 3/4: Comparing MD5 hashes...';
  results.hash = await safeCompareByHash(ssh, localPath, remoteFile);

  // 4. 내용 비교 (가장 느림, 마지막에)
  spinner.text = 'Step 4/4: Comparing file contents...';
  results.content = await safeCompareByContent(ssh, localPath, remoteFile);

  spinner.stop();

  // 결과 출력
  displayComparisonResults(results, localPath, remoteFile, localStat, remoteStat);
}

/**
 * 안전한 크기 비교 (예외 처리 포함)
 */
  function safeCompareBySize(localSize, remoteSize) {
  try {
    const result = Differ.compareSize(localSize, remoteSize);
    return {
      success: true,
      data: result,
      summary: result.isDifferent ? 
        `✗ Different (${Differ.formatFileSize(localSize)} vs ${Differ.formatFileSize(remoteSize)})` : 
        '✓ Same'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      summary: '✗ Comparison failed'
    };
  }
}
}

/**
 * 안전한 시간 비교 (예외 처리 포함)
 */
  function safeCompareByDate(localMtime, remoteMtime) {
  try {
    const result = Differ.compareDate(localMtime, remoteMtime);
    const localDate = new Date(localMtime * 1000);
    const remoteDate = new Date(remoteMtime * 1000);
    
    let summary;
    if (result.newerFile === 'local') {
      summary = '⚠ Local is newer';
    } else if (result.newerFile === 'remote') {
      summary = '⚠ Remote is newer';
    } else {
      summary = '✓ Same';
    }

    return {
      success: true,
      data: { ...result, localDate, remoteDate },
      summary
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      summary: '✗ Comparison failed'
    };
  }
}

    return {
      success: true,
      data: { ...result, localDate, remoteDate },
      summary
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      summary: '✗ 비교 실패'
    };
  }
}

/**
 * 안전한 해시 비교 (예외 처리 포함)
 */
  async function safeCompareByHash(ssh, localFile, remoteFile) {
  try {
    const localHash = Differ.calculateHash(localFile);
    const remoteHash = await ssh.getFileHash(remoteFile);
    const result = Differ.compareHash(localHash, remoteHash);

    return {
      success: true,
      data: result,
      summary: result.isDifferent ? '✗ Different' : '✓ Same'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      summary: '✗ Comparison failed'
    };
  }
}
}

/**
 * 안전한 내용 비교 (예외 처리 포함)
 */
  async function safeCompareByContent(ssh, localFile, remoteFile) {
  try {
    const localContent = Differ.readFile(localFile);

    // 원격 파일 다운로드
    const tempFile = `/tmp/pussh_${Date.now()}_temp`;
    await ssh.downloadFile(remoteFile, tempFile);

    const remoteContent = Differ.readFile(tempFile);

    // 임시 파일 삭제
    fs.unlinkSync(tempFile);

    const result = Differ.compareContent(localContent, remoteContent);

    return {
      success: true,
      data: result,
      summary: result.isDifferent ? `✗ Different (${result.diff.filter(d => d.added || d.removed).length} lines difference)` : '✓ Same'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      summary: '✗ Comparison failed'
    };
  }
}
}

/**
 * 비교 결과 출력
 */
function displayComparisonResults(results, localPath, remoteFile, localStat, remoteStat) {
  // 요약 섹션
  console.log(chalk.blue('━━━━━━━━━━━━━━━━ File Comparison Summary ━━━━━━━━━━━━━━━'));
  console.log(chalk.gray('Local:'), chalk.white(`${localPath} (${Differ.formatFileSize(localStat.size)}, ${new Date(localStat.mtime * 1000).toLocaleString('en-US')})`));
  console.log(chalk.gray('Remote:'), chalk.white(`${remoteFile} (${Differ.formatFileSize(remoteStat.size)}, ${new Date(remoteStat.mtime * 1000).toLocaleString('en-US')})`));
  console.log('');

  console.log(chalk.gray('Size:   '), results.size.success ? chalk.green(results.size.summary) : chalk.yellow(results.size.summary));
  console.log(chalk.gray('Time:   '), results.date.success ? chalk.green(results.date.summary) : chalk.yellow(results.date.summary));
  console.log(chalk.gray('Hash:   '), results.hash.success ? chalk.green(results.hash.summary) : chalk.yellow(results.hash.summary));
  console.log(chalk.gray('Content:'), results.content.success ? chalk.green(results.content.summary) : chalk.yellow(results.content.summary));

  // 에러가 있는 경우 상세 에러 표시
  const hasErrors = Object.values(results).some(r => !r.success);
  if (hasErrors) {
    console.log('');
    console.log(chalk.yellow('Warning: Some comparisons failed.'));
    Object.entries(results).forEach(([type, result]) => {
      if (!result.success) {
        console.log(chalk.gray(`  ${type}: ${result.error}`));
      }
    });
  }

  // 상세 내용 비교 (내용이 다를 때만)
  if (results.content.success && results.content.data.isDifferent) {
    console.log('');
    console.log(chalk.blue('━━━━━━━━━━━━━━━━ Detailed Content Comparison ━━━━━━━━━━━━━━━'));
    console.log(Differ.formatDiff(results.content.data.diff));
  }

  console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

  // 종합 결론
  console.log('');
  const hasAnySuccess = Object.values(results).some(r => r.success);
  if (!hasAnySuccess) {
    console.log(chalk.red('Conclusion: All comparisons failed.'));
    return;
  }

  const contentSame = results.content.success && !results.content.data.isDifferent;
  const hashSame = results.hash.success && !results.hash.data.isDifferent;
  const sizeSame = results.size.success && !results.size.data.isDifferent;
  const hasTimeDifference = results.date.success && results.date.data.newerFile !== 'same';
  
  if (contentSame && hashSame && sizeSame && !hasTimeDifference) {
    console.log(chalk.green('Conclusion: Files are identical.'));
  } else if (contentSame && hashSame && sizeSame && hasTimeDifference) {
    console.log(chalk.yellow('Conclusion: Content is identical but modification times differ.'));
  } else {
    console.log(chalk.yellow('Conclusion: Files are different. Push is recommended.'));
  }
  console.log('');
}

module.exports = diffCommand;
