const fs = require('fs');
const crypto = require('crypto');
const { diffLines } = require('diff');
const chalk = require('chalk');

class Differ {
  /**
   * 파일의 MD5 해시 계산
   * @param {string} filePath - 파일 경로
   * @returns {string} MD5 해시값
   */
  static calculateHash(filePath) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * 파일 수정 시간 조회
   * @param {string} filePath - 파일 경로
   * @returns {number} Unix timestamp
   */
  static getModifiedTime(filePath) {
    const stat = fs.statSync(filePath);
    return Math.floor(stat.mtimeMs / 1000);
  }

  /**
   * 파일 크기 조회
   * @param {string} filePath - 파일 경로
   * @returns {number} 바이트 단위
   */
  static getFileSize(filePath) {
    const stat = fs.statSync(filePath);
    return stat.size;
  }

  /**
   * 파일 읽기
   * @param {string} filePath - 파일 경로
   * @returns {string} 파일 내용
   */
  static readFile(filePath) {
    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * 해시 비교
   * @param {string} localHash - 로컬 파일 해시
   * @param {string} remoteHash - 원격 파일 해시
   * @returns {object} { isDifferent, localHash, remoteHash }
   */
  static compareHash(localHash, remoteHash) {
    return {
      isDifferent: localHash !== remoteHash,
      localHash,
      remoteHash
    };
  }

  /**
   * 날짜 비교
   * @param {number} localMtime - 로컬 파일 수정 시간
   * @param {number} remoteMtime - 원격 파일 수정 시간
   * @returns {object} { isDifferent, localMtime, remoteMtime, newerFile }
   */
  static compareDate(localMtime, remoteMtime) {
    return {
      isDifferent: localMtime !== remoteMtime,
      localMtime,
      remoteMtime,
      newerFile: localMtime > remoteMtime ? 'local' : remoteMtime > localMtime ? 'remote' : 'same'
    };
  }

  /**
   * 파일 내용 비교 (라인 단위 diff)
   * @param {string} localContent - 로컬 파일 내용
   * @param {string} remoteContent - 원격 파일 내용
   * @returns {object} { isDifferent, diff }
   */
  static compareContent(localContent, remoteContent) {
    const diff = diffLines(remoteContent, localContent);
    const isDifferent = diff.some(part => part.added || part.removed);

    return {
      isDifferent,
      diff
    };
  }

  /**
   * 파일 크기 비교
   * @param {number} localSize - 로컬 파일 크기
   * @param {number} remoteSize - 원격 파일 크기
   * @returns {object}
   */
  static compareSize(localSize, remoteSize) {
    return {
      isDifferent: localSize !== remoteSize,
      localSize,
      remoteSize,
      difference: localSize - remoteSize,
      percentage: ((localSize - remoteSize) / remoteSize * 100).toFixed(2)
    };
  }

  /**
   * 차이점을 보기 좋게 포맷팅
   * @param {object} diff - diffLines 결과
   * @returns {string} 포맷된 텍스트
   */
  static formatDiff(diff) {
    return diff
      .map(part => {
        if (part.added) {
          return chalk.green('+ ' + part.value);
        } else if (part.removed) {
          return chalk.red('- ' + part.value);
        } else {
          return chalk.gray('  ' + part.value);
        }
      })
      .join('');
  }

  /**
   * 파일 크기를 읽기 좋은 형식으로 변환
   * @param {number} bytes - 바이트
   * @returns {string}
   */
  static formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

module.exports = Differ;
