# Context Validation Tool

Run from the repository root: `node context/tools/validate-context.mjs`.

The tool is read-only and uses only built-in Node modules. It checks required entrypoints, local Markdown link targets, unique metadata/rule IDs, explicit rule strength, balanced fences, AGENTS routing, and reachability from the central index. It does not compile illustrative code, fetch external links, prove runtime compliance, or run application tests.

Keep it outside application package scripts so the context library can be copied without changing the application build.
