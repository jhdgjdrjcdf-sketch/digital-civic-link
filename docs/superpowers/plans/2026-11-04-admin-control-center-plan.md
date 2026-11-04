# Admin control center — implementation plan

1. Move section config verbatim to `src/lib/admin-sections.ts`; add display-only metadata (group, icon, sub, visibilityKey, searchKeys, kpi).
2. Extract `AdminRowForm`, `AdminImageField`, `AdminOfficeSelect` from `src/routes/admin.tsx` with identical save/upload logic.
3. Build `AdminSectionManager` (same query, order and limit) with client-side search, status/visibility filter, empty/no-match states and chips.
4. Add `AdminNavigation` (roles-derived, grouped), `AdminOverview` (RLS-scoped counts) and `AdminMembers` (super_admin only, confirmed RPC calls).
5. Slim `src/routes/admin.tsx` to composition only; keep `/admin`, head metadata and `staticData.sitemap: false`.
6. Run `bun run lint` and check the build log; no schema, RLS, env or package changes.
