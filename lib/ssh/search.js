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

  /**
   * 원격 디렉토리 재귀 스캔 (파일 정보 포함)
   * @param {SSHClient} ssh
   * @param {string} directory - 스캔 시작 디렉토리
   * @returns {Promise<array>} 파일 정보 배열
   */
  static async scanDirectory(ssh, directory = '~') {
    try {
      // 경로 정규화
      let scanPath = directory;
      if (scanPath.startsWith('~')) {
        const homeResult = await ssh.exec('pwd');
        scanPath = scanPath.replace('~', homeResult.stdout.trim());
      }

      // find로 파일 목록 조회 및 상세 정보 출력
      // -printf 포맷: 상대경로|크기|수정시간
      const result = await ssh.exec(
        `find "${scanPath}" -type f -printf '%P|%s|%T@\\n' 2>/dev/null`
      );

      if (result.code !== 0 || !result.stdout.trim()) {
        return [];
      }

      // 결과 파싱
      const fileInfos = result.stdout
        .trim()
        .split('\n')
        .filter(line => line.length > 0)
        .map(line => {
          const [relativePath, size, mtime] = line.split('|');
          return {
            relativePath: relativePath,
            fullPath: `${scanPath}/${relativePath}`,
            size: parseInt(size) || 0,
            mtime: Math.floor(parseFloat(mtime)) || 0
          };
        });

      return fileInfos.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    } catch (error) {
      throw new Error(`Remote directory scan failed: ${error.message}`);
    }
  }

  /**
   * 원격 파일 목록 조회 (경로만)
   * @param {SSHClient} ssh
   * @param {string} directory
   * @returns {Promise<array>} 상대 경로 배열
   */
  static async listFiles(ssh, directory = '~') {
    const fileInfos = await this.scanDirectory(ssh, directory);
    return fileInfos.map(f => f.relativePath);
  }
}

module.exports = FileSearch;
