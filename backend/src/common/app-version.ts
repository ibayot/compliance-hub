import packageJson from '../../package.json';

/**
 * Returns the version embedded in the application build. APP_VERSION is an
 * optional deployment override; it is not a secret and does not belong in a
 * sensitive compose environment file.
 */
export function getAppVersion(): string {
  return process.env.APP_VERSION?.trim() || process.env.npm_package_version?.trim() || packageJson.version || '0.0.0';
}
