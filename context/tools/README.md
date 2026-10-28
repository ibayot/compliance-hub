# Context Validation Tool

Run from the repository root: `node context/tools/validate-context.mjs`.

The tool is read-only and uses only built-in Node modules. It checks required entrypoints, local Markdown link targets, unique metadata/rule IDs, explicit rule strength, balanced fences, AGENTS routing, and reachability from the central index. It does not compile illustrative code, fetch external links, prove runtime compliance, or run application tests.

Keep it outside application package scripts so the context library can be copied without changing the application build.

The local validator excludes only the root `context/audits/` evidence directory under APP-CH-008. Those historical records are Git-ignored and not normative catalog entries; they remain untouched on disk. Other unlinked Markdown guidance still fails reachability validation, and symlink checks remain enforced. The output names the excluded directory so a green check is not mistaken for audit-record validation.
