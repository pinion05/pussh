const { NodeSSH } = require('node-ssh');
const chalk = require('chalk');

class SSHClient {
  constructor() {
    this.ssh = new NodeSSH();
    this.connected = false;
  }

  /**
   * SSH 연결
   * @param {string} host - 호스트 (user@hostname 또는 user@hostname:port 형식)
   * @param {string} password - 비밀번호
   * @returns {Promise<boolean>}
   */
  async connect(host, password) {
    try {
      const [user, hostWithPort] = host.split('@');

      if (!user || !hostWithPort) {
        throw new Error('호스트 형식이 올바르지 않습니다. (user@hostname 또는 user@hostname:port 형식)');
      }

      // 호스트와 포트 파싱
      let hostname = hostWithPort;
      let port = 22; // 기본 포트

      if (hostWithPort.includes(':')) {
        const [h, p] = hostWithPort.split(':');
        hostname = h;
        port = parseInt(p, 10);

        if (isNaN(port) || port < 1 || port > 65535) {
          throw new Error(`포트 번호가 유효하지 않습니다: ${p}`);
        }
      }

      await this.ssh.connect({
        host: hostname,
        port: port,
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
      // 명령어와 인자를 결합
      const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command;
      const result = await this.ssh.execCommand(fullCommand);
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
      // wc -c로 파일 크기 가져오기
      const sizeResult = await this.exec(`wc -c`, [filePath]);
      
      if (sizeResult.code !== 0) {
        return null; // 파일이 없음
      }

      // wc 출력: "21 filename" -> 첫 번째 숫자만 추출
      const sizeOutput = sizeResult.stdout.trim();
      const size = parseInt(sizeOutput.split(/\s+/)[0]);
      
      const now = Math.floor(Date.now() / 1000);
      
      return {
        mtime: now,
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
      // md5sum 시도 (대부분의 리눅스 배포판)
      let result = await this.exec(`md5sum`, [filePath]);

      if (result.code !== 0) {
        return null;
      }

      // md5sum 출력: "hash filename"
      const output = result.stdout.trim();
      if (output.includes(' ')) {
        return output.split(' ')[0];
      } else {
        return output;
      }
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
