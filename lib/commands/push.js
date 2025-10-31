const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const SSHClient = require('../ssh/client');
const SessionManager = require('../session/manager');
const FileSearch = require('../ssh/search');

/**
 * 로컬 파일을 서버에 업로드
 * @param {string} filePath - 파일 경로 (./index.html)
 * @param {object} options - { force }
 */
async function pushCommand(filePath, options) {
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
      console.log(chalk.yellow('⚠ 새로운 파일을 생성합니다.\n'));
    }

    let targetFile;

    if (remoteFiles.length === 0) {
      // 새 파일 생성
      spinner.stop();
      const defaultPath = path.join(session.directory, fileName);
      targetFile = defaultPath;
      console.log(chalk.gray('생성 경로:'), chalk.white(targetFile));
      console.log('');
    } else if (remoteFiles.length === 1) {
      // 파일이 1개: 자동 선택
      spinner.stop();
      targetFile = remoteFiles[0];
      console.log(chalk.green('✓ 파일을 찾았습니다.\n'));
      console.log(chalk.gray('대상 경로:'), chalk.white(targetFile));
      console.log('');
    } else {
      // 파일이 여러 개: 사용자가 선택
      spinner.stop();
      console.log(chalk.yellow(`⚠ ${remoteFiles.length}개의 파일을 찾았습니다.\n`));

      const { selectedFile } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedFile',
          message: '어떤 파일에 업로드하시겠습니까?',
          choices: remoteFiles.map((f, i) => ({
            name: f,
            value: f
          })),
          pageSize: 10
        }
      ]);

      targetFile = selectedFile;
      console.log('');
    }

    // 업로드 확인
    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `정말로 업로드하시겠습니까?\n로컬: ${localPath}\n대상: ${targetFile}`,
          default: false
        }
      ]);

      if (!confirm) {
        console.log(chalk.gray('\n업로드 취소됨\n'));
        ssh.disconnect();
        return;
      }
    }

    console.log('');
    spinner.start('백업 생성 중...');

    // 원격 파일이 존재하면 백업 생성
    if (remoteFiles.length > 0) {
      const backupPath = `${targetFile}.pushbackup`;

      try {
        await ssh.exec(`cp "${targetFile}" "${backupPath}"`);
        spinner.succeed(`백업 생성: ${backupPath}`);
      } catch (error) {
        spinner.warn(`백업 생성 실패: ${error.message}`);
      }

      // 로컬에도 백업 저장
      spinner.start('로컬 백업 생성 중...');
      try {
        const localBackup = `${localPath}.pushbackup`;
        const remoteContent = await downloadFileContent(ssh, targetFile);
        fs.writeFileSync(localBackup, remoteContent);
        spinner.succeed(`로컬 백업: ${localBackup}`);
      } catch (error) {
        spinner.warn(`로컬 백업 실패: ${error.message}`);
      }
    }

    // 파일 업로드
    spinner.start('파일 업로드 중...');
    await ssh.uploadFile(localPath, targetFile);
    spinner.succeed('파일 업로드 완료');

    // 업로드된 파일 정보 확인
    spinner.start('업로드된 파일 검증 중...');
    const uploadedStat = await ssh.stat(targetFile);

    if (uploadedStat) {
      const uploadedDate = new Date(uploadedStat.mtime * 1000);
      spinner.succeed('파일 검증 완료\n');

      console.log(chalk.blue('━━━━━━━━━━━━━━━━ 업로드 완료 ━━━━━━━━━━━━━━'));
      console.log(chalk.green('✓ 파일이 성공적으로 업로드되었습니다.\n'));
      console.log(chalk.gray('파일 경로:'), chalk.white(targetFile));
      console.log(chalk.gray('파일 크기:'), chalk.white(formatFileSize(uploadedStat.size)));
      console.log(chalk.gray('수정 시간:'), chalk.white(uploadedDate.toLocaleString('ko-KR')));
      console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    }

    ssh.disconnect();
  } catch (error) {
    spinner.fail('오류 발생');
    throw error;
  }
}

/**
 * 원격 파일의 내용을 읽기
 */
async function downloadFileContent(ssh, filePath) {
  const tempFile = `/tmp/pussh_${Date.now()}_content`;

  try {
    await ssh.downloadFile(filePath, tempFile);
    const content = fs.readFileSync(tempFile, 'utf-8');
    fs.unlinkSync(tempFile);
    return content;
  } catch (error) {
    throw error;
  }
}

/**
 * 파일 크기를 읽기 좋은 형식으로 변환
 */
function formatFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

module.exports = pushCommand;
