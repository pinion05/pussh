const { NodeSSH } = require('node-ssh');
const chalk = require('chalk');
const Validator = require('../utils/validator');
const Security = require('../utils/security');
const {
  SSH_CONNECTION_TIMEOUT,
  SSH_READY_TIMEOUT,
  SSH_DEFAULT_PORT
} = require('../utils/constants');
const { SSHConnectionError } = require('../utils/errors');

class SSHClient {
  constructor() {
    this.ssh = new NodeSSH();
    this.connected = false;
    this.homeDir = null; // Cache for home directory
  }

  /**
   * SSH 연결
   * @param {string} host - 호스트 (user@hostname 또는 user@hostname:port 형식)
   * @param {string} password - 비밀번호
   * @returns {Promise<boolean>}
   */
  async connect(host, password) {
    try {
      // Validate and parse host using Validator utility
      const { user, hostname, port } = Validator.validateAndParseHost(host);

      await this.ssh.connect({
        host: hostname,
        port: port,
        username: user,
        password: password,
        tryKeyboard: false,
        timeout: SSH_CONNECTION_TIMEOUT,
        readyTimeout: SSH_READY_TIMEOUT
      });

      this.connected = true;
      return true;
    } catch (error) {
      this.connected = false;
      throw new SSHConnectionError(`SSH connection failed: ${error.message}`, {
        host: host.split('@')[1] || host // Don't expose username in error
      });
    }
  }

  /**
   * 명령어 실행
   * @param {string} command - 실행할 명령어
   * @param {array} args - 인자
   * @returns {Promise<object>} { code, stdout, stderr }
   */
  async exec(command, args = []) {
    if (!this.connected) {
      throw new Error('No SSH connection. Please login first.');
    }

    try {
      // 명령어와 인자를 결합
      const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command;
      const result = await this.ssh.execCommand(fullCommand);
      return result;
    } catch (error) {
      throw new Error(`Command execution failed: ${error.message}`);
    }
  }

  /**
   * 파일 정보 조회 (stat)
   * @param {string} filePath - 파일 경로
   * @returns {Promise<object>} 파일 정보
   */
  async stat(filePath) {
    try {
      // Escape file path to prevent command injection
      const escapedPath = Security.escapeShellArg(filePath);

      // Get file size
      const sizeResult = await this.exec(`wc -c ${escapedPath}`);

      if (sizeResult.code !== 0) {
        return null; // File doesn't exist
      }

      // Parse size from "21 filename" format
      const sizeOutput = sizeResult.stdout.trim();
      const size = parseInt(sizeOutput.split(/\s+/)[0]);

      // Get actual modification time using stat command
      // Linux: stat -c %Y
      // macOS/BSD: stat -f %m
      // Try Linux first, fallback to macOS
      let mtimeResult = await this.exec(`stat -c %Y ${escapedPath} 2>/dev/null || stat -f %m ${escapedPath}`);

      let mtime;
      if (mtimeResult.code === 0 && mtimeResult.stdout.trim()) {
        mtime = parseInt(mtimeResult.stdout.trim());
      } else {
        // Fallback to current time if stat fails
        mtime = Math.floor(Date.now() / 1000);
      }

      return {
        mtime: mtime,
        size: size,
        path: filePath
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 파일의 해시값 계산 (MD5)
   * @param {string} filePath - 파일 경로
   * @returns {Promise<string>} MD5 해시값
   */
  async getFileHash(filePath) {
    try {
      // Escape file path to prevent command injection
      const escapedPath = Security.escapeShellArg(filePath);

      // Try md5sum (most Linux distributions)
      let result = await this.exec(`md5sum ${escapedPath}`);

      if (result.code !== 0) {
        throw new Error(`md5sum command failed: ${result.stderr}`);
      }

      // Parse md5sum output: "hash filename"
      const output = result.stdout.trim();
      if (output.includes(' ')) {
        return output.split(' ')[0];
      } else {
        return output;
      }
    } catch (error) {
      throw new Error(`Hash calculation failed: ${error.message}`);
    }
  }

  /**
   * 파일 다운로드
   * @param {string} remoteFile - 원격 파일 경로
   * @param {string} localFile - 로컬 파일 경로
   * @returns {Promise<boolean>}
   */
  async downloadFile(remoteFile, localFile) {
    if (!this.connected) {
      throw new Error('No SSH connection.');
    }

    try {
      await this.ssh.getFile(localFile, remoteFile);
      return true;
    } catch (error) {
      throw new Error(`File download failed: ${error.message}`);
    }
  }

  /**
   * 파일 업로드
   * @param {string} localFile - 로컬 파일 경로
   * @param {string} remoteFile - 원격 파일 경로
   * @returns {Promise<boolean>}
   */
  async uploadFile(localFile, remoteFile) {
    if (!this.connected) {
      throw new Error('No SSH connection.');
    }

    try {
      await this.ssh.putFile(localFile, remoteFile);
      return true;
    } catch (error) {
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * 연결 종료
   */
  disconnect() {
    if (this.connected) {
      this.ssh.dispose();
      this.connected = false;
    }
  }

  /**
   * 연결 상태 확인
   * @returns {boolean}
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Get home directory (cached)
   * @returns {Promise<string>} Home directory path
   */
  async getHomeDir() {
    if (!this.homeDir) {
      const result = await this.exec('echo $HOME');
      this.homeDir = result.stdout.trim();
    }
    return this.homeDir;
  }
}

module.exports = SSHClient;
