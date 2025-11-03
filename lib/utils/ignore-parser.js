const fs = require('fs');
const path = require('path');
const micromatch = require('micromatch');

class IgnoreParser {
  /**
   * .pusshignore 파일 읽기 및 패턴 파싱
   * @param {string} ignoreFilePath - .pusshignore 파일 경로
   * @returns {array} 패턴 배열
   */
  static readIgnoreFile(ignoreFilePath) {
    try {
      if (!fs.existsSync(ignoreFilePath)) {
        return this.getDefaultPatterns();
      }

      const content = fs.readFileSync(ignoreFilePath, 'utf-8');
      const patterns = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#')); // 빈 줄과 주석 제거

      return [...patterns, ...this.getDefaultPatterns()];
    } catch (error) {
      console.warn(`Warning: Could not read ignore file: ${error.message}`);
      return this.getDefaultPatterns();
    }
  }

  /**
   * 기본 제외 패턴
   * @returns {array}
   */
  static getDefaultPatterns() {
    return [
      'node_modules/**',
      '.git/**',
      '.gitignore',
      '.pusshignore',
      '.DS_Store',
      '**/.DS_Store',
      '*.swp',
      '*.swo',
      '*~',
      '.vscode/**',
      '.idea/**',
      'dist/**',
      'build/**'
    ];
  }

  /**
   * 파일이 무시해야 하는지 확인
   * @param {string} filePath - 확인할 파일 경로 (상대 경로)
   * @param {array} patterns - 제외 패턴 배열
   * @returns {boolean}
   */
  static isIgnored(filePath, patterns) {
    // 정규화: Windows 경로를 Unix 경로로 변환
    const normalizedPath = filePath.replace(/\\/g, '/');

    // micromatch로 패턴 확인
    return micromatch.isMatch(normalizedPath, patterns);
  }

  /**
   * 파일 목록에서 무시할 파일 필터링
   * @param {array} files - 파일 경로 배열
   * @param {array} patterns - 제외 패턴 배열
   * @returns {array} 필터링된 파일 배열
   */
  static filterFiles(files, patterns) {
    return files.filter(file => !this.isIgnored(file, patterns));
  }
}

module.exports = IgnoreParser;
