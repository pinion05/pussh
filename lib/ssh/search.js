const path = require('path');
const SSHClient = require('./client');
const Security = require('../utils/security');

class FileSearch {
  /**
   * 서버에서 파일명으로 재귀적 검색
   * @param {SSHClient} ssh - SSH 클라이언트
   * @param {string} fileName - 검색할 파일명
   * @param {string} searchDir - 검색 시작 디렉토리
   * @returns {Promise<array>} 발견된 파일 경로 배열
   */
  static async findFilesByName(ssh, fileName, searchDir = '~') {
    try {
      // Escape arguments to prevent command injection
      const escapedFileName = Security.escapeShellArg(fileName);
      const escapedSearchDir = Security.escapeShellArg(searchDir);

      // find 명령어로 재귀 검색
      const result = await ssh.exec(`find ${escapedSearchDir} -name ${escapedFileName} -type f 2>/dev/null`);

      if (result.code !== 0 || !result.stdout.trim()) {
        return [];
      }

      const files = result.stdout
        .trim()
        .split('\n')
        .filter(f => f.length > 0);

      return files;
    } catch (error) {
      throw new Error(`File search failed: ${error.message}`);
    }
  }

  /**
   * 단일 파일을 특정 디렉토리 내에서만 검색
   * @param {SSHClient} ssh
   * @param {string} fileName
   * @param {string} directory
   * @returns {Promise<array>}
   */
  static async findInDirectory(ssh, fileName, directory = '~') {
    try {
      // 경로 정규화 - use cached home directory
      let searchPath = directory;
      if (searchPath.startsWith('~')) {
        const homeDir = await ssh.getHomeDir();
        searchPath = searchPath.replace('~', homeDir);
      }

      // Escape arguments to prevent command injection
      const escapedFileName = Security.escapeShellArg(fileName);
      const escapedSearchPath = Security.escapeShellArg(searchPath);

      const result = await ssh.exec(`find ${escapedSearchPath} -name ${escapedFileName} -type f 2>/dev/null`);

      if (result.code !== 0 || !result.stdout.trim()) {
        return [];
      }

      const files = result.stdout
        .trim()
        .split('\n')
        .filter(f => f.length > 0);

      return files;
    } catch (error) {
      throw new Error(`File search failed: ${error.message}`);
    }
  }

  /**
   * 파일이 존재하는지 확인
   * @param {SSHClient} ssh
   * @param {string} filePath
   * @returns {Promise<boolean>}
   */
  static async exists(ssh, filePath) {
    try {
      const escapedPath = Security.escapeShellArg(filePath);
      const result = await ssh.exec(`test -f ${escapedPath} && echo "exists"`);
      return result.stdout.includes('exists');
    } catch (error) {
      return false;
    }
  }

  /**
   * 파일 목록 조회 (ls)
   * @param {SSHClient} ssh
   * @param {string} directory
   * @returns {Promise<array>}
   */
  static async listDirectory(ssh, directory = '~') {
    try {
      const escapedDirectory = Security.escapeShellArg(directory);
      const result = await ssh.exec(`ls -la ${escapedDirectory}`);

      if (result.code !== 0) {
        return [];
      }

      // ls 결과 파싱
      const lines = result.stdout.trim().split('\n').slice(1); // 헤더 제거
      const files = lines
        .map(line => {
          const parts = line.split(/\s+/);
          return {
            permissions: parts[0],
            name: parts[8],
            size: parseInt(parts[4]),
            mtime: parts.slice(5, 8).join(' ')
          };
        })
        .filter(f => f.name);

      return files;
    } catch (error) {
      throw new Error(`Directory listing failed: ${error.message}`);
    }
  }
}

module.exports = FileSearch;
