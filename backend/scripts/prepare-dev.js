const fs = require('fs');
const { execSync } = require('child_process');

function removeDist() {
  try {
    fs.rmSync('dist', { recursive: true, force: true });
  } catch (_) {
    // Ignore cleanup failures; watch build can still proceed.
  }
}

function findPidsOnPort4000() {
  try {
    if (process.platform === 'win32') {
      const output = execSync('netstat -ano -p tcp', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
      const lines = output.split(/\r?\n/).filter((line) => line.includes(':4000') && line.includes('LISTENING'));
      const pids = lines
        .map((line) => line.trim().split(/\s+/).pop())
        .filter((pid) => pid && pid !== '0');
      return [...new Set(pids)];
    }

    const output = execSync('lsof -ti tcp:4000', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    return output
      .split(/\r?\n/)
      .map((v) => v.trim())
      .filter(Boolean);
  } catch (_) {
    return [];
  }
}

function killPids(pids) {
  for (const pid of pids) {
    try {
      process.kill(Number(pid), 'SIGTERM');
    } catch (_) {
      // Best effort only.
    }
  }
}

removeDist();
killPids(findPidsOnPort4000());
