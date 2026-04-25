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

## Known operational risks

### Branch-Protection auf `main` ist serverseitig **NICHT** aktiv

**Ursache:** Org `Alsterpavillion` läuft auf **GitHub Free**. GitHub Free schaltet Branch-Protection-Rules und Repository-Rulesets für **private** Org-Repos nicht frei. Aktivierung erfordert entweder einen kostenpflichtigen Plan (GitHub Team / Pro) oder das Repo public zu schalten — beides aktuell explizit nicht gewünscht. Sowohl Legacy-Branch-Protection-API als auch die neuere Rulesets-API antworten mit `HTTP 403: "Upgrade to GitHub Pro or make this repository public to enable this feature."`

**Konsequenz:** technisch sind aktuell möglich:

- Force-Pushes auf `main`
- Löschen von `main`
- Direct-Commit-on-Main ohne PR
- Merge bei rotem CI-Run

Es gibt keine serverseitige Erzwingung. Mitigation erfolgt **prozessual** durch Disziplin der Maintainer.

### Verbindliche Prozessregeln (bis Branch-Protection aktiv ist)

1. **Kein Merge in `main` ohne grünen CI-Run.** Wenn CI rot ist, gilt der Branch als nicht mergebar — auch wenn er technisch mergebar wäre. Diese Regel gilt insbesondere für den Übergang zu **M1 und alle weiteren Milestones**: kein Sprint-Start solange der letzte Run auf `main` rot ist.
2. **Keine Force-Pushes auf `main`.** Bei Konflikten: regulärer Merge / Rebase mit linearer History, vorher Kommunikation. `git push --force` und `git push --force-with-lease` auf `main` sind tabu.
3. **Keine `main`-Branch-Deletion.** Nicht aus Versehen, nicht zur "Bereinigung".
4. **Keine direkten riskanten Änderungen ohne Statusbericht.** Riskant zählt: ENV/Secrets, DB-Migrations (insbesondere RLS / Grants / Audit-Log-Schema), CI-Workflow-Änderungen, Auth-Logik, Storage-Policies, Rate-Limit-Backend, jede Mutation kritischer Domains (Auth/Booking/Payment/Data/Matching). Jede solche Änderung erhält Statusbericht (geänderte Dateien, Tests, Typecheck, Lint, offene Risiken) bevor sie auf `main` landet.
5. **Re-Eval bei Plan-Upgrade.** Sobald ein bezahlter GitHub-Plan aktiviert ist (oder das Repo bewusst public geschaltet wird), Branch-Protection-Rules sofort nachholen: required CI-Checks (`Typecheck / Lint / Format / Test` + `Dependency audit / Secret scan`), `strict_required_status_checks_policy=true`, `non_fast_forward` blockieren, `deletion` blockieren.

## CI

GitHub Actions (`.github/workflows/ci.yml`):

- Typecheck, Lint, Format-Check, Vitest
- ENV-Validation Smoke
- `pnpm audit --audit-level=critical`
- TruffleHog Secret-Scan (`--results=verified,unknown`)

Alle Jobs blockierend.

## Nächste Schritte (post-M0)

Vor M1 sind folgende Schritte nötig. Status pro Schritt:

1. ✅ **erledigt** — GitHub-Repo `Alsterpavillion/alsterpavillon` (private, Org `Alsterpavillion`), `origin` lokal gesetzt, initial Push abgeschlossen, CI grün auf `main`.
2. ⏭ **nächster aktiver Schritt** — Supabase-Projekt anlegen (eu-central-1 / Frankfurt für DSGVO), Auth → Email aktivieren, Magic Link konfigurieren, anschließend `supabase link --project-ref <ref>` + `supabase db push` (Migrations `0001_profiles_rls_baseline.sql` + `0002_audit_log.sql`), ENV-Werte (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) in `.env.local` eintragen + via `pnpm env:check` validieren.
3. ⏳ Vercel-Projekt verbinden, ENV synchronisieren, Production-Domain wählen.
4. 🚫 **blockiert** — Branch-Protection auf `main` (CI required, no force-push, no deletion). GitHub Free schaltet Branch-Protection / Rulesets für private Org-Repos nicht frei. Details + Prozessregeln als Mitigation siehe Sektion [Known operational risks](#known-operational-risks). Re-Eval, sobald GitHub-Plan upgegradet ist.

Erst nach Abschluss von 2 + 3 ist M0-DoD vollständig erfüllt; M1 (CRM Core) kann starten.

## Kontext

- 100 % organisatorisch und datentechnisch getrennt von WohnWerk24.
- Single-Tenant, Single-Location.
- Rechnungs-only (kein Stripe).
- Email outbound-only.
- Hybrid LLM + manueller Review für Supplier-PDFs (Phase 2).

Vollständige Architectural Decisions, Phasen-Cut, Datenmodell und Edge-Cases im Plan-Dokument.
