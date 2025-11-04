const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const SSHClient = require('../ssh/client');
const SessionManager = require('../session/manager');
const FileSearch = require('../ssh/search');
const Security = require('../utils/security');
const Formatter = require('../utils/formatter');

/**
 * 로컬 파일을 서버에 업로드
 * @param {string} filePath - 파일 경로 (./index.html)
 * @param {object} options - { force }
 */
async function pushCommand(filePath, options) {
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
  const ssh = new SSHClient();

  try {
    // SSH 연결
    spinner.text = 'Connecting to SSH server...';
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
      console.log(chalk.yellow('⚠ Creating new file.\n'));
    }

    let targetFile;

    if (remoteFiles.length === 0) {
      // 새 파일 생성
      spinner.stop();
      const defaultPath = path.join(session.directory, fileName);
      targetFile = defaultPath;
      console.log(chalk.gray('Create path:'), chalk.white(targetFile));
      console.log('');
    } else if (remoteFiles.length === 1) {
      // 파일이 1개: 자동 선택
      spinner.stop();
      targetFile = remoteFiles[0];
      console.log(chalk.green('✓ File found.\n'));
      console.log(chalk.gray('Target path:'), chalk.white(targetFile));
      console.log('');
    } else {
      // 파일이 여러 개: 사용자가 선택
      spinner.stop();
      console.log(chalk.yellow(`⚠ Found ${remoteFiles.length} files.\n`));

      const { selectedFile } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedFile',
          message: 'Which file would you like to upload to?',
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
          message: `Are you sure you want to upload?\nLocal: ${localPath}\nTarget: ${targetFile}`,
          default: false
        }
      ]);

      if (!confirm) {
        console.log(chalk.gray('\nUpload cancelled\n'));
        return;
      }
    }

    console.log('');
    spinner.start('Creating backup...');

    // 원격 파일이 존재하면 백업 생성
    if (remoteFiles.length > 0) {
      const backupPath = `${targetFile}.pushbackup`;

      try {
        // Use escaped path to prevent command injection
        const escapedTarget = Security.escapeShellArg(targetFile);
        const escapedBackup = Security.escapeShellArg(backupPath);
        await ssh.exec(`cp ${escapedTarget} ${escapedBackup}`);
        spinner.succeed(`Backup created: ${backupPath}`);
      } catch (error) {
        spinner.warn(`Backup creation failed: ${error.message}`);
      }

      // 로컬에도 백업 저장
      spinner.start('Creating local backup...');
      try {
        const localBackup = `${localPath}.pushbackup`;
        const remoteContent = await downloadFileContent(ssh, targetFile);
        fs.writeFileSync(localBackup, remoteContent, { mode: 0o600 });
        spinner.succeed(`Local backup: ${localBackup}`);
      } catch (error) {
        spinner.warn(`Local backup failed: ${error.message}`);
      }
    }

    // 파일 업로드
    spinner.start('Uploading file...');
    await ssh.uploadFile(localPath, targetFile);
    spinner.succeed('File upload complete');

    // 업로드된 파일 정보 확인
    spinner.start('Verifying uploaded file...');
    const uploadedStat = await ssh.stat(targetFile);

    if (uploadedStat) {
      spinner.succeed('File verification complete\n');

      console.log(chalk.blue('━━━━━━━━━━━━━━━━ Upload Complete ━━━━━━━━━━━━━━'));
      console.log(chalk.green('✓ File uploaded successfully.\n'));
      console.log(chalk.gray('File path:'), chalk.white(targetFile));
      console.log(chalk.gray('File size:'), chalk.white(Formatter.formatFileSize(uploadedStat.size)));
      console.log(chalk.gray('Modified:'), chalk.white(Formatter.formatDate(uploadedStat.mtime)));
      console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    }

  } catch (error) {
    spinner.fail('Error occurred');
    throw error;
  } finally {
    // Always disconnect SSH connection (fix resource leak)
    ssh.disconnect();
  }
}

/**
 * 원격 파일의 내용을 읽기
 */
async function downloadFileContent(ssh, filePath) {
  // Use secure temporary file (fix security issue)
  const tempFile = Security.createSecureTempFile();

  try {
    await ssh.downloadFile(filePath, tempFile);
    const content = fs.readFileSync(tempFile, 'utf-8');
    return content;
  } catch (error) {
    throw error;
  } finally {
    // Always cleanup temp file (fix resource leak)
    if (fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch (cleanupError) {
        // Silently fail cleanup
      }
    }
  }
}

module.exports = pushCommand;
