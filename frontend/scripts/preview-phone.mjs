import { spawnSync } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';

const [host, port = '4173', ...extra] = process.argv.slice(2);
const addresses = Object.values(networkInterfaces()).flat().filter(Boolean);
const privateAddress = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/;
const boundInterface = addresses.some(({ address, family, internal }) =>
  !internal && family === 'IPv4' && address === host);

if (extra.length || !host || !privateAddress.test(host) || !boundInterface ||
    !/^\d{4,5}$/.test(port) || Number(port) < 1024 || Number(port) > 65535) {
  console.error('Choose this computer’s private Wi-Fi IPv4 address and optional port: npm run preview:phone -- 192.168.1.25 4173');
  process.exit(1);
}

const env = {
  ...process.env,
  VITE_API_URL: '/api',
  VITE_APP_ENV: 'local',
  VITE_ANDROID_APK_URL: '',
  VITE_PHONE_PREVIEW: '1',
};
const root = fileURLToPath(new URL('../', import.meta.url));
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const tsc = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url));

function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: root, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(tsc, ['-b']);
run(vite, ['build', '--outDir', 'dist-phone-preview']);
console.log(`On a phone on the same trusted Wi-Fi, open http://${host}:${port}. Use local test data. Stop with Ctrl+C.`);
run(vite, ['preview', '--outDir', 'dist-phone-preview', '--host', host, '--port', port, '--strictPort']);
