# Pussh - SSH File Synchronization Tool

[![npm version](https://badge.fury.io/js/pussh.svg)](https://badge.fury.io/js/pussh)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

A CLI tool for easily comparing and synchronizing local files with remote servers via SSH.

## Features

- **Login** (`pussh login`) - Login to SSH server and save session
- **File Comparison** (`pussh diff`) - Comprehensively compare local and remote files (size, time, hash, content)
- **File Upload** (`pussh push`) - Upload local files to remote server (automatic backup)
- **Server Management** (`pussh server`) - Manage named server profiles (list/add/remove/default)

## Installation

### Install as npm package

```bash
npm install -g pussh
```

### Local installation (for development)

```bash
# Clone repository
git clone <repository-url>
cd pussh

# Install dependencies
npm install

# Global installation (optional)
npm link
```

## Usage

### 1. Login

Login to SSH server and save session information. After login, you can immediately use diff and push commands.

```bash
pussh login user@server.com 'password' -d ~/project1
```

**Host format:**
- `user@hostname` - Direct SSH connection (port 22 by default)
- `user@hostname:port` - Direct SSH with custom port
- `server_name` - Use registered server profile (from `pussh server list`)

**Options:**
- `-d, --directory <dir>` - Set default working directory on server (default: home directory)

**Examples:**
```bash
# Direct login with port 22
pussh login root@211.254.221.78 'password' -d ~/myproject

# Login with custom port (1622)
pussh login root@211.254.221.78:1622 'password' -d ~/myproject

# Login using registered server profile
pussh login production -d /var/www/html

# After login, you can use other commands
pussh diff ./index.html
pussh push ./app.js
```

### 2. File Comparison

Comprehensively compare local files with remote server files. Automatically performs all comparison methods and displays results.

```bash
pussh diff ./index.html
```

**Comparison methods (automatically performed):**
- **Size** - File size comparison (instant)
- **Time** - Modification time comparison (instant)
- **Hash** - MD5 hash value comparison (fast)
- **Content** - Detailed file content comparison (Git diff style)

**How it works:**
1. Check local file existence
2. Search for files with same name on remote server
3. Automatically perform all comparison methods
4. Display comprehensive results (summary + details)

**Examples:**
```bash
# Comprehensive comparison (all methods)
pussh diff ./index.html

# Compare another file
pussh diff ./app.js

# Compare CSS file
pussh diff ./style.css
```

### 3. File Upload

Upload local files to the remote server.

```bash
pussh push ./index.html
```

**Options:**
- `-f, --force` - Force upload without confirmation

**Examples:**
```bash
# Upload with confirmation
pussh push ./index.html

# Force upload (skip confirmation)
pussh push ./index.html -f
```

## Help

Detailed help can be viewed with the following commands:

```bash
# Overall help
pussh --help
pussh help

# Specific command help
pussh help login
pussh help diff
pussh help push
```

## Server Profiles

Manage named server configurations for quick access without entering credentials each time.

```bash
# List all registered servers
pussh server list

# Add a new server interactively
pussh server add production

# Set default server (used when no explicit server specified)
pussh server default production

# Remove a server
pussh server remove test --confirm
```

**Examples:**
```bash
# After adding servers:
pussh login production               # Uses saved credentials
pussh login production -d /var/www   # Override directory

# Faster file operations:
pussh diff ./index.html              # Uses default server
pussh push ./app.js -f               # Uses default server
```

## Configuration Storage

Server profiles are stored in:
- **Linux/Mac**: `~/.pussh/config.json`
- **Windows**: `%USERPROFILE%\.pussh\config.json`

## Error Handling

### "No session found" or "Server not found"

First run `pussh login`:
```bash
pussh login user@server.com 'password' -d ~/project

# Or use registered server
pussh server add production
pussh login production
```

### "File not found"

- Check if the file path is correct
- Use relative path: `./filename`
- Use absolute path: `/absolute/path/filename`

### "SSH connection failed"

- Check if the host address is correct (user@hostname format)
- Check if the password is correct
- Check if the server has SSH enabled on the remote host
- Verify the port is correct (default: 22)

## Tech Stack

- **Node.js** - JavaScript runtime
- **commander** - CLI framework
- **node-ssh** - SSH connection
- **inquirer** - Interactive prompts
- **chalk** - Terminal color output
- **ora** - Loading spinner
- **diff** - File content comparison

## License

ISC
