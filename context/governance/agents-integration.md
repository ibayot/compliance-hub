# AGENTS Integration

Place a short router in each application's applicable AGENTS.md:

~~~markdown
Before substantive work, read context/MASTER.md and the active application
profile. Load only the relevant patterns and triggered overlays.
Cite applicable rule IDs in substantive plans and audit reports.
Report conflicts or missing conventions; do not silently invent global rules.
Keep audit-only requests read-only.
~~~

In a monorepo, each application can own a context folder. Its local AGENTS.md must point to the correct relative path and explain any repository-wide guidance it inherits. Do not create competing masters for the same scope.

The file name MASTER.md is a project convention. Automatic discovery comes from AGENTS.md integration; the master does not execute itself. A shortcut is optional and is not needed for this configuration.
