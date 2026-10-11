# Coug Connect

A local WSU alumni directory using Next.js 16, React, TypeScript, and PostgreSQL.

## Features

- Search by name, email, company, major, graduation range, and volunteering interests.
- Match any or all interests, sort by name or graduation year, and paginate results.
- Quick searches for Microsoft internship partners, guest lecturers, capstone mentors, and company visits.
- Shareable filter URLs and browser back/forward support.
- Members search; admins also import CSVs; the super admin creates member and admin accounts.
- CSV validation and preview, email-based updates, atomic imports, and import history.
- Scrypt password hashes, expiring database sessions, sign-in throttling, same-origin mutation checks, and server-enforced roles.

## Local development

Requires Node.js 22 or newer, npm, and PostgreSQL (locally installed or through Docker Desktop).

1. `npm install`
2. Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell).
3. Set your super admin email and a password of at least 12 characters in `.env`.
4. Start the database: `docker compose up -d db`.
5. `npm run db:init`
6. `npm run dev`
7. Open http://localhost:3000 and sign in using the credentials from `.env`.

A private `.env` with a generated password may already exist if Codex initialized this workspace. Its values are never committed. The Docker database uses host port **5433**, avoiding a conflict with local PostgreSQL on 5432. To use existing PostgreSQL, create a dedicated database and role and set `DATABASE_URL` to its connection string. Percent-encode special characters in connection-string credentials.

`db:init` is repeatable: it creates missing tables and the initial super admin only if its email is new. It never resets an existing password or elevates an existing account. Choose credentials before the first initialization. Public registration is disabled; the super admin creates accounts under **Manage accounts**.

## Docker

After creating `.env` and choosing credentials:

```sh
docker compose up --build -d
```

Compose starts PostgreSQL, initializes the schema and super admin, then runs the production app at http://localhost:3000. Database data persists in the `postgres_data` volume. `docker compose down` stops services without deleting data. Stop the Docker app before `npm run dev` to free port 3000: `docker compose stop app`.

For production outside Docker: `npm run build`, then `npm start`.

## CSV imports

Download the blank template from the import screen. Required columns: `first_name`, `last_name`, `email`. Optional columns:

```text
current_company,graduation_year,major,linked_in,
q_internship,q_guest_lecture,q_capstone_mentor,q_company_visits
```

Opportunity values accept yes/no, true/false, 1/0, or y/n, case-insensitively. Blank, unknown, and n/a become SQL NULL. Graduation years must be integers from 1900 to 2100. LinkedIn links must start with `https://linkedin.com/` or `https://www.linkedin.com/`. Emails are normalized to lowercase. Invalid rows, duplicate emails in one file, malformed CSVs, and unsupported headers reject the entire import.

An existing email **replaces the matching record's fields**. Missing optional columns clear those fields. Validate and preview before confirming. All rows and the import history entry are committed in a single transaction. Maximum: 2 MB and 5,000 records.

`db/demo-alumni.csv` contains optional fictional records with example.com emails. Import it through the admin screen; it is never inserted automatically. The original Python TEXT opportunity fields become nullable PostgreSQL booleans for reliable consent queries. Export existing SQLite records into this CSV format before importing.

## Organization

```text
app/api/       Separate authentication, directory, imports, and account endpoints
app/ui/        Separate login, sidebar, directory, import, and account components
app/hooks/     Workspace state and asynchronous request handling
app/styles/    Styles grouped by UI functionality
lib/           Shared types, API helper, database, auth, CSV, password modules
 db/           PostgreSQL schema and optional fictional CSV
scripts/       Database initialization
 tests/        CSV edge cases and password verification
Dockerfile     Multi-stage production image
compose.yaml   Database, initialization, and app services
```

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

With the app running, `npm run test:integration` verifies authentication, permissions, CSV imports, filters, and pagination using isolated temporary records that it removes afterward.

Production dependencies currently pass `npm audit --omit=dev`. The starter's ESLint development dependency chain has five high-severity audit findings rooted in `braces`; its latest published version has no patched release. Avoid the audit tool's suggested Next.js ESLint downgrade. Recheck when an upstream patch is available.

Keep `.env` private. `COOKIE_SECURE=false` supports local HTTP; use true when serving over HTTPS. This initial local app does not include password recovery, email invitations, account deletion, or manual alumni editing.
