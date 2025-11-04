const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const Validator = require('../utils/validator');
const Security = require('../utils/security');
const { CONFIG_DIR_MODE, CONFIG_FILE_MODE } = require('../utils/constants');
const { ConfigCorruptedError } = require('../utils/errors');

// 설정 파일 경로
const configDir = path.join(os.homedir(), '.pussh');
const configFile = path.join(configDir, 'config.json');

// 설정 디렉토리 생성 with secure permissions
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true, mode: CONFIG_DIR_MODE });
} else {
  // Verify directory permissions
  try {
    fs.chmodSync(configDir, CONFIG_DIR_MODE);
  } catch (error) {
    // Silently fail - may not have permissions
  }
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
      const config = JSON.parse(content);

      return config;
    } catch (error) {
      // Check if it's a parsing error (corrupted file)
      if (error instanceof SyntaxError && fs.existsSync(configFile)) {
        // Backup corrupted file
        const backupFile = `${configFile}.corrupted.${Date.now()}`;
        try {
          fs.copyFileSync(configFile, backupFile);
          console.error(chalk.red(`⚠️  Config file corrupted. Backup created: ${backupFile}`));
        } catch (backupError) {
          // Ignore backup errors
        }
        return {};
      }
      return {};
    }
  }

  /**
   * 설정 파일 저장
   * @param {object} data
   */
  static _writeConfig(data) {
    try {
      const content = JSON.stringify(data, null, 2);

      // Write with secure permissions
      fs.writeFileSync(configFile, content, {
        encoding: 'utf-8',
        mode: CONFIG_FILE_MODE
      });

      // Ensure permissions are set correctly (in case umask interfered)
      try {
        fs.chmodSync(configFile, CONFIG_FILE_MODE);
      } catch (error) {
        // Silently fail - may not have permissions
      }

      // Warn about plaintext password storage
      if (data.servers && Object.keys(data.servers).length > 0) {
        const hasPasswords = Object.values(data.servers).some(server => server.password);
        if (hasPasswords) {
          console.warn(chalk.yellow(`⚠️  WARNING: Passwords are stored in plaintext in ${configFile}`));
          console.warn(chalk.yellow('   For production use, consider SSH key-based authentication'));
        }
      }
    } catch (error) {
      throw new ConfigCorruptedError(`Configuration save failed: ${error.message}`);
    }
  }

  /**
   * 서버 추가
   * @param {string} name - 서버 이름
   * @param {string} host - SSH 호스트 (user@host 또는 user@host:port)
   * @param {string} password - SSH 비밀번호
   * @param {string} directory - 기본 디렉토리
   */
  static addServer(name, host, password, directory) {
    // Validate server name
    Validator.validateServerName(name);

    // Validate host format
    Validator.validateAndParseHost(host);

    // Validate directory if provided
    if (directory) {
      Validator.validateDirectory(directory);
    }

    const config = this._readConfig();
    if (!config.servers) {
      config.servers = {};
    }

    // Check for duplicate
    if (config.servers[name]) {
      throw new Error(`Server '${name}' already exists. Use a different name or remove the existing server first.`);
    }

    config.servers[name] = {
      host,
      password,
      directory: directory || '~',
      addedAt: new Date().toISOString()
    };

    // 첫 서버인 경우 기본 서버로 설정
    if (!config.default) {
      config.default = name;
    }

    this._writeConfig(config);
  }

  /**
   * 서버 삭제
   * @param {string} name - 서버 이름
   */
  static removeServer(name) {
    const config = this._readConfig();
    if (!config.servers || !config.servers[name]) {
      throw new Error(`Server '${name}' not found`);
    }

    delete config.servers[name];

    // 삭제된 서버가 기본 서버였다면 다른 서버를 기본으로 설정
    if (config.default === name) {
      const serverNames = Object.keys(config.servers);
      config.default = serverNames.length > 0 ? serverNames[0] : null;
    }

    this._writeConfig(config);
  }

  /**
   * 기본 서버 설정
   * @param {string} name - 서버 이름
   */
  static setDefaultServer(name) {
    const config = this._readConfig();
    if (!config.servers || !config.servers[name]) {
      throw new Error(`Server '${name}' not found`);
    }

    config.default = name;
    this._writeConfig(config);
  }

  /**
   * 서버 목록 조회
   * @returns {object} 서버 목록
   */
  static getServers() {
    const config = this._readConfig();
    return config.servers || {};
  }

  /**
   * 기본 서버 정보 조회
   * @returns {object} 기본 서버 정보
   */
  static getDefaultServer() {
    const config = this._readConfig();
    if (!config.default || !config.servers || !config.servers[config.default]) {
      return null;
    }

    return {
      name: config.default,
      ...config.servers[config.default]
    };
  }

  /**
   * 특정 서버 정보 조회
   * @param {string} name - 서버 이름
   * @returns {object} 서버 정보
   */
  static getServer(name) {
    const config = this._readConfig();
    if (!config.servers || !config.servers[name]) {
      return null;
    }

    return {
      name,
      ...config.servers[name]
    };
  }

  /**
   * 기본 서버 이름 조회
   * @returns {string} 기본 서버 이름
   */
  static getDefaultServerName() {
    const config = this._readConfig();
    return config.default || null;
  }

  // 기존 세션 관리 메서드 (하위 호환성)
  /**
   * 세션 저장 (하위 호환성)
   * @param {string} host - SSH 호스트
   * @param {string} password - SSH 비밀번호
   * @param {string} directory - 기본 디렉토리
   */
  static saveSession(host, password, directory) {
    // 기본 서버로 저장
    const config = this._readConfig();

    // If 'default' server exists, remove it first
    if (config.servers && config.servers.default) {
      delete config.servers.default;
    }

    this.addServer('default', host, password, directory);
  }

  /**
   * 세션 로드 (하위 호환성)
   * @returns {object} 저장된 세션 정보
   */
  static loadSession() {
    // 기본 서버 정보 반환
    const defaultServer = this.getDefaultServer();
    if (!defaultServer) {
      return null;
    }

    return {
      host: defaultServer.host,
      password: defaultServer.password,
      directory: defaultServer.directory,
      savedAt: defaultServer.addedAt
    };
  }

  /**
   * 세션 존재 여부 확인 (하위 호환성)
   * @returns {boolean}
   */
  static hasSession() {
    return this.getDefaultServer() !== null;
  }

  /**
   * 세션 삭제 (하위 호환성)
   */
  static clearSession() {
    const config = this._readConfig();
    delete config.servers;
    delete config.default;
    this._writeConfig(config);
  }

  /**
   * 세션 정보 출력 (하위 호환성)
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
