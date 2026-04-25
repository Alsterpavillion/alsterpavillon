# DSGVO Verarbeitungsverzeichnis (Art. 30)

> Status: **Skelett — M0 Foundation.**
> Inhaltliche Befüllung erfolgt sukzessive ab M1, wenn fachliche Module mit PII landen.

## Verantwortlicher

- **Verantwortliche Stelle:** [Alsterpavillon-Betreiberfirma — vor M1 eintragen]
- **Anschrift:** [Adresse]
- **Kontakt Datenschutz:** [E-Mail / Telefon]
- **Datenschutzbeauftragter:** [Name oder "nicht bestellt — Schwellwert nicht erreicht"]

## Verarbeitungstätigkeiten

### V01 — Mitarbeiter-Authentifizierung (M0)

| Feld                   | Inhalt                                                                 |
| ---------------------- | ---------------------------------------------------------------------- |
| Zweck                  | Anmeldung interner Mitarbeitender am System                            |
| Rechtsgrundlage        | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung Arbeitsverhältnis)       |
| Datenkategorien        | E-Mail-Adresse, ggf. Name                                              |
| Betroffene             | Mitarbeitende des Alsterpavillons                                      |
| Empfänger              | Supabase (EU-Region, Auftragsverarbeitung Art. 28 DSGVO)               |
| Übermittlung Drittland | Nein (Supabase EU-West)                                                |
| Löschfristen           | Account-Deaktivierung bei Austritt; technische Löschung 30 Tage später |
| TOM                    | TLS, httpOnly+Secure Cookies, Magic-Link statt Passwort                |
| Eingerichtet           | M0                                                                     |

### V02 — Audit-Log (M0)

| Feld                   | Inhalt                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Zweck                  | Nachvollziehbarkeit kritischer Mutationen, Breach-Detection (Art. 33/34)                             |
| Rechtsgrundlage        | Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse — IT-Sicherheit) + Art. 32 DSGVO (TOM)            |
| Datenkategorien        | User-ID, Aktion, Entity-Typ + ID, Vorher/Nachher-JSON, Zeitstempel                                   |
| Betroffene             | Mitarbeitende, perspektivisch Kund:innen + Lieferanten                                               |
| Empfänger              | Supabase (EU-Region)                                                                                 |
| Übermittlung Drittland | Nein                                                                                                 |
| Löschfristen           | 10 Jahre (HGB / AO) bei zahlungsrelevanten Vorgängen, 3 Jahre sonst — finalisieren mit Steuerberater |
| TOM                    | append-only via REVOKE + Trigger-Block, RLS deny-all reads außer service_role                        |
| Eingerichtet           | M0                                                                                                   |

### V03–V99 — folgen ab M1

Pro künftigem Modul ist eine V0X-Sektion zu ergänzen:

- M1 CRM Core → V03 Kundenstammdaten, V04 Lieferanten-Stammdaten (Phase 2)
- M3 Pipeline → V05 Anfragen / Sales-Historie
- M4 Offers → V06 Angebotsdaten + Tracking-Pixel
- M11 Invoices → V07 Rechnungs-/Zahlungsdaten
- M12 DSGVO-Modul → V08 Löschanfragen-Verarbeitung (Art. 17)

## Auftragsverarbeiter

| AV                           | Zweck                                 | Sitz                             | Vertrag                                     |
| ---------------------------- | ------------------------------------- | -------------------------------- | ------------------------------------------- |
| Supabase Inc.                | Hosting + Auth + DB                   | EU-Region (Frankfurt vorgesehen) | AVV Art. 28 — vor Produktivnahme schließen  |
| Vercel Inc.                  | App-Hosting                           | EU-Region (vorgesehen)           | AVV Art. 28 — vor Produktivnahme schließen  |
| Resend / Postmark / SendGrid | Outbound Mail                         | je nach OD-2-Entscheidung        | AVV Art. 28                                 |
| Anthropic (Claude API)       | LLM-Extraktion Supplier-PDF (Phase 2) | EU-Routing prüfen                | AVV Art. 28 + ggf. Standardvertragsklauseln |

## Technisch-organisatorische Maßnahmen (TOM, Art. 32)

Siehe Plan-Sektion "Security & Compliance Baseline" und CI-Enforcement (`.github/workflows/ci.yml`).

## Breach Notification (Art. 33/34)

- Erkennung: Audit-Log-Anomalien-Query + Supabase-Logs (zu definieren M12).
- Meldung: Aufsichtsbehörde (HmbBfDI) innerhalb 72 h nach Kenntnis.
- Verfahren: vor Produktivnahme dokumentieren.

## Pflege dieses Dokuments

- Jeder neue Datenfluss → neue V-Sektion + Eintrag im Audit-Log.
- Review jährlich oder bei jedem Architektur-Change.
- Verantwortlich: Admin / Datenschutz-Kontakt.
