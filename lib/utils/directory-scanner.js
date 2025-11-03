const fs = require('fs');
const path = require('path');
const glob = require('fast-glob');
const IgnoreParser = require('./ignore-parser');

class DirectoryScanner {
  /**
   * 로컬 디렉토리 재귀 스캔
   * @param {string} dirPath - 스캔할 디렉토리 경로
   * @param {string} ignoreFilePath - .pusshignore 파일 경로
   * @returns {Promise<array>} 파일 정보 객체 배열
   */
  static async scanDirectory(dirPath, ignoreFilePath = null) {
    try {
      // 디렉토리 확인
      if (!fs.existsSync(dirPath)) {
        throw new Error(`Directory not found: ${dirPath}`);
      }

      const stat = fs.statSync(dirPath);
      if (!stat.isDirectory()) {
        throw new Error(`Not a directory: ${dirPath}`);
      }

      // ignore 패턴 읽기
      const ignoreFile = ignoreFilePath || path.join(dirPath, '.pusshignore');
      const patterns = IgnoreParser.readIgnoreFile(ignoreFile);

      // glob으로 모든 파일 찾기
      const files = await glob(['**/*'], {
        cwd: dirPath,
        dot: false,
        absolute: false
      });

      // 디렉토리 제외 및 무시 패턴 필터링
      const filteredFiles = files
        .filter(file => {
          const fullPath = path.join(dirPath, file);
          return fs.statSync(fullPath).isFile();
        })
        .filter(file => !IgnoreParser.isIgnored(file, patterns));

      // 파일 정보 수집
      const fileInfos = filteredFiles.map(file => {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        return {
          relativePath: file.replace(/\\/g, '/'), // Windows 경로 정규화
          fullPath: fullPath,
          size: stat.size,
          mtime: Math.floor(stat.mtimeMs / 1000),
          mtimeDate: stat.mtime
        };
      });

      return fileInfos.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    } catch (error) {
      throw new Error(`Directory scan failed: ${error.message}`);
    }
  }

  /**
   * 단순 파일 목록만 반환 (속도 최적화)
   * @param {string} dirPath - 스캔할 디렉토리 경로
   * @param {string} ignoreFilePath - .pusshignore 파일 경로
   * @returns {Promise<array>} 상대 경로 배열
   */
  static async listFiles(dirPath, ignoreFilePath = null) {
    const fileInfos = await this.scanDirectory(dirPath, ignoreFilePath);
    return fileInfos.map(f => f.relativePath);
  }

  /**
   * 파일 정보 조회
   * @param {string} dirPath - 기준 디렉토리
   * @param {string} relativePath - 상대 경로
   * @returns {object|null} 파일 정보 또는 null
   */
  static getFileInfo(dirPath, relativePath) {
    try {
      const fullPath = path.join(dirPath, relativePath);

      if (!fs.existsSync(fullPath)) {
        return null;
      }

      const stat = fs.statSync(fullPath);

      if (!stat.isFile()) {
        return null;
      }

      return {
        relativePath: relativePath,
        fullPath: fullPath,
        size: stat.size,
        mtime: Math.floor(stat.mtimeMs / 1000),
        mtimeDate: stat.mtime
      };
    } catch (error) {
      return null;
    }
  }
}

module.exports = DirectoryScanner;
