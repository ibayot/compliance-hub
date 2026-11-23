import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { X509Certificate } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const project = join(frontend, 'android-launcher');
const distribution = join(frontend, '..', 'output', 'android-launcher');
const rootCaPath = join(frontend, '..', 'backend', 'assets', 'compliance-hub-root-ca.crt');
const packageName = 'com.dswd.fo2icare.launcher';
const apkName = 'FO2-iCare.apk';
const stageAssets = process.argv[2] === '--stage-web-assets';
if (process.argv.slice(2).length !== Number(stageAssets)) {
  throw new Error('Usage: node frontend/scripts/build-android-launcher.mjs [--stage-web-assets]');
}

let site;
try { site = new URL(process.env.HUB_ANDROID_ORIGIN || ''); } catch { /* Report setup below. */ }
if (!site || site.protocol !== 'https:' || site.username || site.password
    || site.href !== site.origin + '/' || /^(localhost|127\.|0\.0\.0\.0$|\[::1\]$|10\.0\.2\.2$)/i.test(site.hostname)) {
  throw new Error('Set HUB_ANDROID_ORIGIN to the HTTPS address that staff open on their phones, without a path.');
}

if (!existsSync(rootCaPath)) {
  throw new Error('The Compliance Hub root CA is missing from backend/assets/compliance-hub-root-ca.crt.');
}
let rootCa;
try {
  rootCa = new X509Certificate(readFileSync(rootCaPath));
} catch {
  throw new Error('The Compliance Hub root CA file is not a valid X.509 certificate.');
}
const now = Date.now();
if (!rootCa.ca || rootCa.subject !== rootCa.issuer ||
    Date.parse(rootCa.validFrom) > now || Date.parse(rootCa.validTo) <= now) {
  throw new Error('The Compliance Hub certificate must be a current, self-issued root CA.');
}

const keyStore = process.env.HUB_ANDROID_KEYSTORE && resolve(process.env.HUB_ANDROID_KEYSTORE);
const keyAlias = process.env.HUB_ANDROID_KEY_ALIAS;
if (!keyStore || !existsSync(keyStore) || !keyAlias || !process.env.HUB_ANDROID_KEYSTORE_PASSWORD) {
  throw new Error('Set HUB_ANDROID_KEYSTORE, HUB_ANDROID_KEY_ALIAS and HUB_ANDROID_KEYSTORE_PASSWORD for the release signing key.');
}

const properties = join(frontend, 'android', 'local.properties');
const studioSdk = existsSync(properties)
  ? readFileSync(properties, 'utf8').match(/^sdk\.dir=(.+)$/m)?.[1].trim().replace(/\\([\\:])/g, '$1')
  : undefined;
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || studioSdk;
const signer = sdk && join(sdk, 'build-tools', '36.0.0', 'lib', 'apksigner.jar');
if (!signer || !existsSync(signer)) {
  throw new Error('Install Android SDK Platform 36 and Build Tools 36.0.0, then set ANDROID_HOME.');
}

const java = process.env.JAVA_HOME
  ? join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
  : 'java';
const buildEnv = { ...process.env, ANDROID_HOME: sdk, HUB_ANDROID_ORIGIN: site.origin };
const signerEnv = {
  ...buildEnv,
  HUB_ANDROID_KEY_PASSWORD: process.env.HUB_ANDROID_KEY_PASSWORD || process.env.HUB_ANDROID_KEYSTORE_PASSWORD,
};
// Gradle needs the origin and SDK, while only apksigner needs the signing secrets.
delete buildEnv.HUB_ANDROID_KEYSTORE_PASSWORD;
delete buildEnv.HUB_ANDROID_KEY_PASSWORD;

function run(args, env, capture = false) {
  const result = spawnSync(java, args, {
    cwd: project, env, encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Android build or signature verification failed.');
  return result.stdout;
}

const wrapper = join(frontend, 'android', 'gradle', 'wrapper', 'gradle-wrapper.jar');
run(['-cp', wrapper, 'org.gradle.wrapper.GradleWrapperMain', '-p', project, 'assembleRelease', '--no-daemon'], buildEnv);

const apkDir = join(project, 'build', 'outputs', 'apk', 'release');
const unsignedApk = join(apkDir, 'ComplianceHubLauncher-release-unsigned.apk');
const signedApk = join(apkDir, apkName);
run(['-jar', signer, 'sign', '--ks', keyStore, '--ks-key-alias', keyAlias,
  '--ks-pass', 'env:HUB_ANDROID_KEYSTORE_PASSWORD', '--key-pass', 'env:HUB_ANDROID_KEY_PASSWORD',
  '--out', signedApk, unsignedApk], signerEnv);
const signature = run(['-jar', signer, 'verify', '--print-certs', signedApk], buildEnv, true);
const digest = signature.match(/^Signer #1 certificate SHA-256 digest:\s*([a-f\d]{64})$/im)?.[1];
if (!digest) throw new Error('Unable to read the signing certificate fingerprint from the verified APK.');
const fingerprints = [digest.toUpperCase().match(/.{2}/g).join(':')];
const assetLinks = JSON.stringify([{
  relation: ['delegate_permission/common.handle_all_urls'],
  target: { namespace: 'android_app', package_name: packageName, sha256_cert_fingerprints: fingerprints },
}], null, 2) + '\n';

mkdirSync(distribution, { recursive: true });
copyFileSync(signedApk, join(distribution, apkName));
writeFileSync(join(distribution, 'assetlinks.json'), assetLinks);
if (stageAssets) {
  const publicFiles = join(frontend, 'public');
  const downloads = join(publicFiles, 'downloads');
  const wellKnown = join(publicFiles, '.well-known');
  mkdirSync(downloads, { recursive: true });
  mkdirSync(wellKnown, { recursive: true });
  writeFileSync(join(wellKnown, 'assetlinks.json'), assetLinks);
  copyFileSync(signedApk, join(downloads, apkName));
}
console.log('Signed APK and matching assetlinks.json are ready in output/android-launcher.');
if (stageAssets) console.log('Both files are staged for the next frontend build.');
