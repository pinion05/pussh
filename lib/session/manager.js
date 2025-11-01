const fs = require('fs');
const path = require('path');
const os = require('os');

// 설정 파일 경로
const configDir = path.join(os.homedir(), '.pussh');
const configFile = path.join(configDir, 'config.json');

// 설정 디렉토리 생성
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

class SessionManager {
  /**
   * 설정 파일 읽기
   * @returns {object}
   */
  static _readConfig() {
    try {
      if (!fs.existsSync(configFile)) {
        return {};
      }
      const content = fs.readFileSync(configFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return {};
    }
  }

  /**
   * 설정 파일 저장
   * @param {object} data
   */
  static _writeConfig(data) {
    try {
      fs.writeFileSync(configFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`설정 저장 실패: ${error.message}`);
    }
  }

  /**
   * 세션 저장
   * @param {string} host - SSH 호스트 (user@host 또는 user@host:port)
   * @param {string} password - SSH 비밀번호
   * @param {string} directory - 기본 디렉토리
   */
  static saveSession(host, password, directory) {
    const config = this._readConfig();
    config.session = {
      host,
      password,
      directory: directory || '~',
      savedAt: new Date().toISOString()
    };
    this._writeConfig(config);
  }

  /**
   * 세션 로드
   * @returns {object} 저장된 세션 정보
   */
  static loadSession() {
    const config = this._readConfig();
    return config.session || null;
  }

  /**
   * 세션 존재 여부 확인
   * @returns {boolean}
   */
  static hasSession() {
    return this.loadSession() !== null;
  }

  /**
   * 세션 삭제
   */
  static clearSession() {
    const config = this._readConfig();
    delete config.session;
    this._writeConfig(config);
  }

  /**
   * 세션 정보 출력 (디버그용)
   */
  static getSessionInfo() {
    const session = this.loadSession();
    if (!session) {
      return null;
    }
    return {
      host: session.host,
      directory: session.directory,
      savedAt: session.savedAt
    };
  }
}

module.exports = SessionManager;
