# Audit Scope Map

Start with a bounded concern and pattern set.

| Audit | Search/evidence starting points | Check |
| --- | --- | --- |
| Buttons/actions | MUI Button/IconButton, action menus, theme | Weight, labels, loading, disabled/denied, keyboard |
| Selectors/dropdowns | SearchableSelect, Select, Autocomplete, Menu | Selector versus action semantics, identity, async states |
| Files | input type=file, dropzones, upload/download endpoints | Limits, access, MIME/content, history, durable storage |
| Forms | Form handlers, React Hook Form/Zod, DTOs | Validation, duplicate submit, errors, reset, unsaved values |
| Tables/lists | ResponsiveTable, pagination, filters, query keys | Scope, totals, stale requests, empty/error, narrow layout |
| Permissions | Capability decorators/guards and service policies | Alternate entrypoints, scope/owner/status, backend denial |
| Containers | Dockerfiles, explicit Compose file set | Build context, secrets, health, volumes, network, recovery |

Example read-only searches (run from repository root):
~~~powershell
rg -n 'SearchableSelect|Autocomplete|<Select|<Menu' frontend/src
rg -n 'RequireCapability|CapabilityGuard' backend/src
rg -n 'type="file"|TicketImageDropzone|DocumentUpload' frontend/src
~~~

Search hits are candidate consumers, not confirmed findings. Static searches can miss wrappers, dynamic imports, or generated code; state that limitation.
