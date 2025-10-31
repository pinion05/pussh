const path = require('path');
const SSHClient = require('./client');

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
      // find 명령어로 재귀 검색
      const result = await ssh.exec(`find ${searchDir} -name "${fileName}" -type f 2>/dev/null`);

      if (result.code !== 0 || !result.stdout.trim()) {
        return [];
      }

      const files = result.stdout
        .trim()
        .split('\n')
        .filter(f => f.length > 0);

      return files;
    } catch (error) {
      throw new Error(`파일 검색 실패: ${error.message}`);
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
      // 경로 정규화
      let searchPath = directory;
      if (searchPath.startsWith('~')) {
        const homeResult = await ssh.exec('pwd');
        searchPath = searchPath.replace('~', homeResult.stdout.trim());
      }

      const result = await ssh.exec(`find "${searchPath}" -name "${fileName}" -type f 2>/dev/null`);

      if (result.code !== 0 || !result.stdout.trim()) {
        return [];
      }

      const files = result.stdout
        .trim()
        .split('\n')
        .filter(f => f.length > 0);

      return files;
    } catch (error) {
      throw new Error(`파일 검색 실패: ${error.message}`);
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
      const result = await ssh.exec(`test -f "${filePath}" && echo "exists"`);
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
      const result = await ssh.exec(`ls -la "${directory}"`);

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
      throw new Error(`디렉토리 조회 실패: ${error.message}`);
    }
  }
}

module.exports = FileSearch;
