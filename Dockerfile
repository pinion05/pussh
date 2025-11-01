FROM alpine:latest

# SSH 서버 설치
RUN apk update && \
    apk add --no-cache openssh sudo bash

# SSH 설정
RUN mkdir -p /var/run/sshd && \
    ssh-keygen -A

# root 비밀번호 설정
RUN echo 'root:test123' | chpasswd

# SSH 설정 수정 (root 로그인 허용)
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config && \
    sed -i 's/#PermitEmptyPasswords no/PermitEmptyPasswords yes/' /etc/ssh/sshd_config

# 테스트용 사용자 생성
RUN adduser -D -s /bin/bash testuser && \
    echo 'testuser:test123' | chpasswd && \
    addgroup testuser wheel

# 테스트용 디렉토리 생성
RUN mkdir -p /home/testuser/project && \
    chown -R testuser:testuser /home/testuser

EXPOSE 22

# SSH 서버 시작
CMD ["/usr/sbin/sshd", "-D"]
