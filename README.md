# Alsterpavillon

Event-CRM- und Operations-System für den Alsterpavillon (Hamburg).

> Status: **M0 Foundation** — leeres aber lauffähiges System ohne fachliche Module.
> Fachliche Module (CRM, Offers, Events, Tasks, Material-Listen, Suppliers, Invoices) folgen ab M1.

Vollständige Spezifikation: siehe Plan-Dokument.

## Stack

- Next.js 15.5.15 / React 19.2.4 (App Router, TypeScript strict)
- Tailwind CSS 4
- Supabase (Postgres / Auth / RLS / Storage)
- Vitest + Playwright + Testing Library
- ESLint 9 (flat config via `@eslint/eslintrc` FlatCompat-Bridge) + Prettier 3
- pnpm 10
- Vercel (Production + Preview)

Plan AD-1 ist eingehalten. `create-next-app@latest` hatte initial Next.js 16 gescaffoldet, im M0-Sprint auf 15.5.15 zurückgesetzt.

## Setup (lokal)

```bash
nvm use            # Node 22
pnpm install
cp .env.example .env.local
# .env.local mit Supabase-Werten füllen (URL, Anon-Key, Service-Role-Key, App-URL)
pnpm env:check     # validiert ENV (Zod, fail-closed)
pnpm dev
```

Login: http://localhost:3000/login (Magic Link an die eingegebene E-Mail-Adresse).

## Skripte

| Skript              | Zweck                               |
| ------------------- | ----------------------------------- |
| `pnpm dev`          | Dev-Server (Turbopack)              |
| `pnpm build`        | Production-Build                    |
| `pnpm start`        | Production-Server (lokal)           |
| `pnpm typecheck`    | `tsc --noEmit`                      |
| `pnpm lint`         | ESLint                              |
| `pnpm format`       | Prettier write                      |
| `pnpm format:check` | Prettier check                      |
| `pnpm test`         | Vitest run                          |
| `pnpm test:watch`   | Vitest watch mode                   |
| `pnpm test:e2e`     | Playwright                          |
| `pnpm audit:deps`   | `pnpm audit --audit-level=critical` |
| `pnpm env:check`    | ENV-Validation Smoke (CI + lokal)   |

## Environment Variables

| Variable                        | Scope  | Pflicht | Beschreibung                                                    |
| ------------------------------- | ------ | ------- | --------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | public | ✓       | Supabase-Projekt-URL                                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | ✓       | Supabase Anon Key (für RLS-respecting clients)                  |
| `NEXT_PUBLIC_APP_URL`           | public | ✓       | Base-URL der App, z. B. `http://localhost:3000` oder Vercel-URL |
| `SUPABASE_SERVICE_ROLE_KEY`     | server | ✓       | Service-Role Key (RLS-bypass, NIEMALS in Browser-Bundle)        |
| `NODE_ENV`                      | server | ✓       | `development` / `test` / `production`                           |

Validierung erfolgt fail-closed via Zod-Schemas in `src/lib/env/`.
Boot bricht ab, sobald eine Variable fehlt oder ungültig ist.

## Datenbank-Migrations

```
supabase/migrations/
  0001_profiles_rls_baseline.sql   # profiles mirror table + RLS default-deny
  0002_audit_log.sql               # audit_log append-only + log_audit() RPC
```

Ausführung:

```bash
# Empfohlen: Supabase CLI gegen das Projekt linken
supabase link --project-ref <ref>
supabase db push
```

## Sicherheitsmodell (M0 Baseline)

- TLS-only via `Strict-Transport-Security` Header (HSTS preload).
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, restriktive `Permissions-Policy`.
- Session-Cookies via Supabase SSR (`@supabase/ssr`) — `httpOnly` + `Secure` + `SameSite` Defaults.
- Default-deny RLS auf allen Nutzer-Tabellen (M0: nur `profiles`).
- `audit_log` ist append-only: REVOKE auf direkter Schreibrechte, Mutation nur via `log_audit()` SECURITY DEFINER. UPDATE/DELETE-Trigger raisen Exception.
- Rate-Limit-Modul ist fail-closed Stub — wirft, bis echtes Backend (Upstash/Redis) angeschlossen ist.
- ENV-Validation ist Pflicht beim Boot (Zod, fail-closed).

## CI

GitHub Actions (`.github/workflows/ci.yml`):

- Typecheck, Lint, Format-Check, Vitest
- ENV-Validation Smoke
- `pnpm audit --audit-level=critical`
- Gitleaks Secret-Scan auf Diff

Alle Jobs blockierend.

## Nächste Schritte (post-M0)

Vor M1 sind folgende User-Aktionen nötig (Claude kann diese nicht durchführen):

1. GitHub-Repo erstellen + `git remote add origin` + initial push (`gh repo create alsterpavillon --private`).
2. Supabase-Projekt anlegen (eu-central-1 / Frankfurt für DSGVO), Auth → Email aktivieren, Magic Link konfigurieren.
3. ENV-Werte in Vercel + lokal eintragen.
4. `supabase link --project-ref <ref>` + `supabase db push`.
5. Vercel-Projekt verbinden, ENV synchronisieren, Production-Domain wählen.
6. Branch-Protection auf `main`: CI required, 1 Reviewer, no force-push.

Erst dann ist M0-DoD vollständig erfüllt; M1 (CRM Core) kann starten.

## Kontext

- 100 % organisatorisch und datentechnisch getrennt von WohnWerk24.
- Single-Tenant, Single-Location.
- Rechnungs-only (kein Stripe).
- Email outbound-only.
- Hybrid LLM + manueller Review für Supplier-PDFs (Phase 2).

Vollständige Architectural Decisions, Phasen-Cut, Datenmodell und Edge-Cases im Plan-Dokument.
