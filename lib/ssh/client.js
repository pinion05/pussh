const NodeSSH = require('node-ssh');
const chalk = require('chalk');

class SSHClient {
  constructor() {
    this.ssh = new NodeSSH();
    this.connected = false;
  }

  /**
   * SSH 연결
   * @param {string} host - 호스트 (user@hostname 형식)
   * @param {string} password - 비밀번호
   * @returns {Promise<boolean>}
   */
  async connect(host, password) {
    try {
      const [user, hostname] = host.split('@');

      if (!user || !hostname) {
        throw new Error('호스트 형식이 올바르지 않습니다. (user@hostname 형식)');
      }

      await this.ssh.connect({
        host: hostname,
        username: user,
        password: password,
        tryKeyboard: false
      });

      this.connected = true;
      return true;
    } catch (error) {
      this.connected = false;
      throw new Error(`SSH 연결 실패: ${error.message}`);
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
      throw new Error('SSH 연결이 없습니다. 먼저 login을 해주세요.');
    }

    try {
      const result = await this.ssh.execCommand(command, { args });
      return result;
    } catch (error) {
      throw new Error(`명령어 실행 실패: ${error.message}`);
    }
  }

  /**
   * 파일 정보 조회 (stat)
   * @param {string} filePath - 파일 경로
   * @returns {Promise<object>} 파일 정보
   */
  async stat(filePath) {
    try {
      const result = await this.exec(`stat -c "%Y %s"`, [filePath]);

      if (result.code !== 0) {
        return null; // 파일이 없음
      }

      const [mtime, size] = result.stdout.trim().split(' ');
      return {
        mtime: parseInt(mtime),
        size: parseInt(size),
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
      const result = await this.exec(`md5sum`, [filePath]);

      if (result.code !== 0) {
        return null;
      }

      return result.stdout.trim().split(' ')[0];
    } catch (error) {
      return null;
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
      throw new Error('SSH 연결이 없습니다.');
    }

    try {
      await this.ssh.getFile(localFile, remoteFile);
      return true;
    } catch (error) {
      throw new Error(`파일 다운로드 실패: ${error.message}`);
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
      throw new Error('SSH 연결이 없습니다.');
    }

    try {
      await this.ssh.putFile(localFile, remoteFile);
      return true;
    } catch (error) {
      throw new Error(`파일 업로드 실패: ${error.message}`);
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
}

module.exports = SSHClient;
