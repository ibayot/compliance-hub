import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const variant = (process.argv[2] || 'debug').toLowerCase();
const gradleTask = variant === 'release' ? 'assembleRelease' : 'assembleDebug';
const programFiles = process.env.ProgramFiles || 'C:/Program Files';
const javaCandidates = [
  process.env.JAVA_HOME,
  join(programFiles, 'Android/Android Studio/jbr'),
  join(programFiles, 'Eclipse Adoptium/jdk-17.0.17.10-hotspot'),
].filter(Boolean);

const javaHome = javaCandidates.find((candidate) => existsSync(join(candidate, 'bin', 'java.exe')));
if (!javaHome) {
  console.error('A usable Java JDK was not found. Install Android Studio or set JAVA_HOME.');
  process.exit(1);
}

const env = { ...process.env, JAVA_HOME: javaHome };
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const gradleCommand = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';

function run(command, args, cwd = process.cwd()) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(npmCommand, ['run', 'build']);
run(npmCommand, ['exec', '--', 'cap', 'sync', 'android']);
run(gradleCommand, [gradleTask, '--no-daemon'], join(process.cwd(), 'android'));
