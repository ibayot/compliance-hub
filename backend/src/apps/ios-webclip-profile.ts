import { createHash, X509Certificate } from 'crypto';

const LOCAL_WEB_ORIGINS = new Set(['localhost', '127.0.0.1']);

export function resolveIosWebClipUrl(environment: NodeJS.ProcessEnv = process.env): string {
  const configuredUrl = environment.FRONTEND_URL?.trim() || environment.APP_URL?.trim();
  const candidateUrl = configuredUrl || 'http://localhost';

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(candidateUrl);
  } catch {
    throw new Error('The configured application URL is invalid.');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol) ||
      parsedUrl.username || parsedUrl.password || parsedUrl.search || parsedUrl.hash) {
    throw new Error('The configured application URL is not a supported web origin.');
  }

  if (environment.NODE_ENV !== 'production' &&
      !LOCAL_WEB_ORIGINS.has(parsedUrl.hostname.toLowerCase())) {
    return 'http://localhost/';
  }

  // Push and the browser's authentication cookies depend on the secure public origin.
  // Use only the configured host; never build a profile from request headers.
  if (!LOCAL_WEB_ORIGINS.has(parsedUrl.hostname.toLowerCase()) && parsedUrl.protocol === 'http:') {
    parsedUrl.protocol = 'https:';
  }
  return parsedUrl.toString();
}

function stableUuid(seed: string): string {
  const hex = createHash('sha256').update(seed).digest('hex').slice(0, 32).split('');
  hex[12] = '5';
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const value = hex.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildIosWebClipProfile(targetUrl: string, iconPng: Buffer, rootCaPem: Buffer): string {
  if (iconPng.length === 0 || iconPng.length >= 1_000_000) {
    throw new Error('The Web Clip icon must be a non-empty PNG smaller than 1 MB.');
  }
  let rootCa: X509Certificate;
  try {
    rootCa = new X509Certificate(rootCaPem);
  } catch {
    throw new Error('The Compliance Hub root CA certificate is invalid.');
  }
  const now = Date.now();
  if (!rootCa.ca || rootCa.subject !== rootCa.issuer ||
      Date.parse(rootCa.validFrom) > now || Date.parse(rootCa.validTo) <= now) {
    throw new Error('The Compliance Hub root CA certificate is not a valid, current root CA.');
  }

  const parsedUrl = new URL(targetUrl);
  const profileUuid = stableUuid(`profile:${parsedUrl.toString()}`);
  const webClipUuid = stableUuid(`webclip:${parsedUrl.toString()}`);
  const payloadIdentifier = `com.rictms.compliancehub.webclip.${profileUuid}`;
  const launchUrl = new URL('/dashboard', parsedUrl);
  const iconData = iconPng.toString('base64').match(/.{1,76}/g)?.join('\n') ?? '';
  const rootCaData = rootCa.raw.toString('base64').match(/.{1,76}/g)?.join('\n') ?? '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>PayloadContent</key>
      <data>
${rootCaData}
      </data>
      <key>PayloadDescription</key>
      <string>Allows this iPhone to verify the Compliance Hub internal HTTPS server.</string>
      <key>PayloadDisplayName</key>
      <string>RICTMS Helpdesk Internal TLS CA</string>
      <key>PayloadIdentifier</key>
      <string>${payloadIdentifier}.root-ca</string>
      <key>PayloadType</key>
      <string>com.apple.security.root</string>
      <key>PayloadUUID</key>
      <string>${stableUuid(`root-ca:${payloadIdentifier}`)}</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
    </dict>
    <dict>
      <key>FullScreen</key>
      <true/>
      <key>IgnoreManifestScope</key>
      <false/>
      <key>Icon</key>
      <data>
${iconData}
      </data>
      <key>IsRemovable</key>
      <true/>
      <key>Label</key>
      <string>Compliance Hub</string>
      <key>Precomposed</key>
      <true/>
      <key>URL</key>
      <string>${escapeXml(launchUrl.toString())}</string>
      <key>PayloadDescription</key>
      <string>Adds a fullscreen Compliance Hub icon to the Home Screen.</string>
      <key>PayloadDisplayName</key>
      <string>Compliance Hub Web Clip</string>
      <key>PayloadIdentifier</key>
      <string>${payloadIdentifier}</string>
      <key>PayloadType</key>
      <string>com.apple.webClip.managed</string>
      <key>PayloadUUID</key>
      <string>${webClipUuid}</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
    </dict>
  </array>
  <key>PayloadDisplayName</key>
  <string>Compliance Hub Secure Mobile Setup</string>
  <key>PayloadIdentifier</key>
  <string>${payloadIdentifier}</string>
  <key>PayloadOrganization</key>
  <string>RICTMS Compliance Hub</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>${profileUuid}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>
`;
}
