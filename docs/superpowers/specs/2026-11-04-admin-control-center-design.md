# Admin control center — design note

Scope: `/admin` only. URL, section IDs, table names, fields, validation, uploads and role gates are unchanged.

## Visual direction
- Reuses the existing navy/ink + warm-gold tokens (`primary`, `accent`, `surface-navy`, `card-soft`, `gold-rule`). No new colors.
- Arabic-first labels with a short English descriptor. Calm cards, subtle borders, status chips, short fade/slide transitions.
- Desktop: `AppShell wide` with a grouped sticky sidebar + content column. Mobile: one horizontally scrolling grouped pill rail.

## Information architecture
- Overview: welcome panel, current staff roles, KPI cards (head `count` queries, RLS-scoped, labelled "accessible records").
- Content: news, events. Organization: offices, candidates, representatives. Academy: courses + AcademyContentManager. Participation: polls.
- Access (super_admin DB role only): members & roles via `list_members`, `grant_role`, `revoke_role`.

## Security
- Client gating is UI only; RLS and security-definer RPCs remain authoritative.
- Verified server-side: the role RPCs require `super_admin` and reject changes to the caller's own roles; both write audit entries. EXECUTE is granted to `authenticated` only.
- Every grant/revoke needs an explicit confirmation dialog; the caller's own row has no controls.

## Deferred
- Moderation (content_reports, discussions), meetings, transparency records and academy assessment review are not exposed: they need dedicated workflows and per-table policy review beyond this refactor.
