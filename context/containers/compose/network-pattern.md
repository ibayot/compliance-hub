---
id: CTR-NET
status: baseline
scope: "Docker Compose; applicable only when enabled by the application profile"
triggers:
  - "ports"
  - "Docker network"
  - "service DNS"
---

# Compose Networking and Exposure

## Guidelines

Expose only intended entrypoints and use service discovery within the declared network.

## Why

Publishing a backend or database port can bypass the expected gateway/security boundary.

## Structure

```text
Network record:
public client -> intended proxy/gateway port
gateway -> internal service DNS:container port
service -> approved database/cache network
host published ports -> explicit purpose + environment
```

## Implementation

Distinguish EXPOSE metadata, container-to-container connectivity, and published host ports. Avoid container IP pinning. Consider whether a service needs internet egress before choosing internal-only networks. A shared network does not provide request authentication.

## Rules

- `CTR-NET-001` MUST identify the intended audience and binding for each published host port.
- `CTR-NET-002` MUST preserve service authentication across network boundaries.
- `CTR-NET-003` SHOULD use Compose service names rather than transient container IP addresses.

## Validation

Check the effective network/port topology and validate allowed and disallowed reachability from representative locations in an isolated deployment.

## Exceptions

Existing Dockerfiles/Compose configuration are implementation evidence, not evidence that this baseline is satisfied. Record deviations and their affected environment; evaluate changes separately before altering a running deployment.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://docs.docker.com/compose/how-tos/networking/)
