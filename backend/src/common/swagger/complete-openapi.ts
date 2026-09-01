const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace']);
const INTERNAL_HEADER_NAMES = new Set(['x-client-platform', 'x-device-token']);

function fallbackTag(path: string): string {
  const segment = path.split('/').find(Boolean);
  return segment ? segment.replace(/[{}]/g, '') : 'general';
}

/**
 * Completes the generated OpenAPI contract without changing controller behavior.
 * Controller-provided descriptions and tags remain authoritative; only missing
 * metadata is filled in here so newly added routes are not undocumented.
 *
 * Capability metadata is copied from RequireCapability into each operation and
 * aggregated into a de-duplicated vendor extension and readable description.
 */
export function completeOpenApiDocument(document: any): any {
  const capabilityApiMap = new Map<string, Set<string>>();

  for (const [path, pathItem] of Object.entries<any>(document?.paths ?? {})) {
    for (const [method, operation] of Object.entries<any>(pathItem ?? {})) {
      if (!HTTP_METHODS.has(method) || !operation || typeof operation !== 'object') continue;

      operation.summary ||= method.toUpperCase() + ' ' + path;
      operation.description ||= 'Registered ' + method.toUpperCase() + ' operation for ' + path + '.';
      operation.tags = (operation.tags?.length ? operation.tags : [fallbackTag(path)]).map((tag: string) =>
        tag === 'Events' ? 'events' : tag,
      );
      operation.parameters = operation.parameters?.filter(
        (parameter: any) =>
          !(parameter?.in === 'header' && INTERNAL_HEADER_NAMES.has(String(parameter.name).toLowerCase())),
      );

      const requiredCapabilities = operation['x-required-capabilities']?.anyOf;
      if (Array.isArray(requiredCapabilities)) {
        const endpoint = method.toUpperCase() + ' ' + path;
        for (const capability of [...new Set(requiredCapabilities.map(String))]) {
          if (!capabilityApiMap.has(capability)) capabilityApiMap.set(capability, new Set());
          capabilityApiMap.get(capability)!.add(endpoint);
        }
      }
    }
  }

  const serializedCapabilityApiMap = Object.fromEntries(
    [...capabilityApiMap.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([capability, endpoints]) => [capability, [...endpoints].sort()]),
  );
  document['x-capability-api-map'] = serializedCapabilityApiMap;

  const capabilityMapMarkdown = Object.entries<string[]>(serializedCapabilityApiMap)
    .map(([capability, endpoints]) => '- **' + capability + '**: ' + endpoints.join(', '))
    .join('\n');
  if (capabilityMapMarkdown) {
    const mapHeading = '### Capability-to-API map';
    const mapDescription =
      mapHeading +
      '\n\nEach endpoint is listed once per capability. When an endpoint lists multiple capabilities, any one of them is sufficient.' +
      '\n\n' +
      capabilityMapMarkdown;
    document.info = document.info ?? {};
    document.info.description = ((document.info.description ?? '') + '\n\n' + mapDescription).trim();
  }

  return document;
}