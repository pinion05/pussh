# Pussh - SSH 파일 동기화 도구

[![npm version](https://badge.fury.io/js/pussh.svg)](https://badge.fury.io/js/pussh)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

SSH를 통해 원격 서버와 로컬 파일을 간편하게 비교하고 동기화하는 CLI 도구입니다.

## 기능

- **로그인** (`pussh login`) - SSH 서버에 로그인하고 세션 저장
- **파일 비교** (`pussh diff`) - 로컬과 원격 파일 비교 (해시, 날짜, 내용, 크기)
- **파일 업로드** (`pussh push`) - 로컬 파일을 원격 서버에 업로드 (자동 백업)

## 설치

### npm 패키지로 설치

```bash
npm install -g pussh
```

### 로컬 설치 (개발 중)

```bash
# 저장소 클론
git clone <repository-url>
cd pussh

# 의존성 설치
npm install

# 전역 설치 (선택사항)
npm link
```

## 사용 방법

### 1. 로그인

SSH 서버에 로그인하고 기본 디렉토리를 설정합니다.

```bash
pussh login user@server.com 'password' -d ~/project1
```

**호스트 형식:**
- `user@hostname` - 포트 22 (기본값)
- `user@hostname:port` - 커스텀 포트

**옵션:**
- `-d, --directory <dir>` - 서버의 기본 디렉토리 설정 (기본: 홈 디렉토리)

**예제:**
```bash
# 포트 22로 로그인
pussh login root@211.254.221.78 'password' -d ~/myproject

# 커스텀 포트(1622)로 로그인
pussh login root@211.254.221.78:1622 'password' -d ~/myproject

# 로그인 후 다른 명령어들을 사용할 수 있습니다
```

### 2. 파일 비교

로컬 파일과 원격 서버의 파일을 비교합니다.

```bash
pussh diff ./index.html
```

**옵션:**
- `-m, --method <method>` - 비교 방식 선택 (기본: content)
  - `hash` - MD5 해시 비교
  - `date` - 수정 시간 비교
  - `size` - 파일 크기 비교
  - `content` - 실제 내용 비교 (Git diff 스타일)

**예제:**
```bash
# 내용으로 비교 (상세한 diff 출력)
pussh diff ./index.html

# 해시로 빠르게 비교
pussh diff ./index.html -m hash

# 수정 시간으로 비교
pussh diff ./index.html -m date

# 파일 크기로 비교
pussh diff ./index.html -m size
```

### 3. 파일 업로드

로컬 파일을 원격 서버에 업로드합니다.

```bash
pussh push ./index.html
```

**옵션:**
- `-f, --force` - 확인 없이 강제 업로드

**예제:**
```bash
# 업로드 전 확인
pussh push ./index.html

# 강제 업로드 (확인 생략)
pussh push ./index.html -f
```

## 도움말

상세한 도움말은 다음 명령어로 확인할 수 있습니다:

```bash
# 전체 도움말
pussh --help
pussh help

# 특정 명령어 도움말
pussh help login
pussh help diff
pussh help push
```

## 세션 관리

로그인 정보는 다음 위치에 저장됩니다:
- **Linux/Mac**: `~/.config/pussh/config.json`
- **Windows**: `%APPDATA%\pussh\config.json`

## 에러 처리

### "로그인이 필요합니다"

먼저 `pussh login`을 실행하세요:
```bash
pussh login user@server.com 'password' -d ~/project
```

### "파일을 찾을 수 없습니다"

- 파일 경로가 올바른지 확인하세요
- 상대 경로 사용: `./filename`
- 절대 경로 사용: `/absolute/path/filename`

### "SSH 연결 실패"

- 호스트 주소가 올바른지 확인하세요 (user@hostname 형식)
- 비밀번호가 올바른지 확인하세요
- 서버가 SSH를 사용 가능한지 확인하세요

## 기술 스택

- **Node.js** - JavaScript 런타임
- **commander** - CLI 프레임워크
- **node-ssh** - SSH 연결
- **inquirer** - 대화형 프롬프트
- **chalk** - 터미널 색상 출력
- **ora** - 로딩 스피너
- **diff** - 파일 내용 비교

## 라이센스

ISC
