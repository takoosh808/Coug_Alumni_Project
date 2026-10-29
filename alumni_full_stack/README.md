# Coug Connect

A local WSU alumni directory using Next.js 16, React, TypeScript, and PostgreSQL.

## Features

- Search permitted profile fields and filter by education, professional background, support, and privacy preferences.
- Match any or all interests, sort by name or graduation year, and paginate results.
- Quick searches for Microsoft internship partners, guest lecturers, capstone mentors, and company visits.
- Shareable filter URLs and browser back/forward support.
- Members search permitted profiles; admins also import CSVs and add/edit profiles; the super admin creates member and admin accounts.
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

For deployment on a Rocky Linux VM with the existing Let's Encrypt certificate, follow [DOCKER_NGINX_DEPLOYMENT.md](DOCKER_NGINX_DEPLOYMENT.md). It adds Nginx as a Docker Compose reverse proxy and leaves local development unchanged.

After creating `.env` and choosing credentials:

```sh
docker compose up --build -d
```

Compose starts PostgreSQL, initializes the schema and super admin, then runs the production app at http://localhost:3000. Database data persists in the `postgres_data` volume. `docker compose down` stops services without deleting data. Stop the Docker app before `npm run dev` to free port 3000: `docker compose stop app`.

For production outside Docker: `npm run build`, then `npm start`.

## CSV imports

Download the expanded blank template from the import screen. Required columns: `first_name`, `last_name`, `email`. Original optional columns remain supported (see **Expanded alumni form** below for all new fields):

```text
current_company,graduation_year,major,linked_in,
q_internship,q_guest_lecture,q_capstone_mentor,q_company_visits
```

Legacy `q_*` opportunity columns accept yes/no, true/false, 1/0, or y/n, case-insensitively. Blank, unknown, and n/a remain unanswered; positive answers become searchable opportunity text. The new `opportunities` column accepts free text. Graduation years must be integers from 1900 to 2100. LinkedIn links must start with `https://linkedin.com/` or `https://www.linkedin.com/`. Emails are normalized to lowercase. Invalid rows, duplicate emails in one file, malformed CSVs, and unsupported headers reject the entire import.

An existing email **replaces the matching record's fields**. Missing optional columns clear those fields. Validate and preview before confirming. All rows and the import history entry are committed in a single transaction. Maximum: 2 MB and 5,000 records.

`db/demo-alumni.csv` contains 10 fictional alumni with all 24 template columns populated, including every new form field and 14 education records. Import it through the admin screen. For pgAdmin, run `db/schema.sql` first, then execute the entire `db/demo-alumni.sql` file in Query Tool. Both sample files contain the same profiles and update matching example.com emails when loaded again; neither runs automatically. See `db/README.md` for sample coverage and expected visibility. Legacy yes/no opportunity answers remain supported by imports.

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

With the app running, `npm run test:integration` verifies authentication, permissions, CSV imports, filters, pagination, profile editing, multiple qualifications, and privacy redaction using temporary records that it removes afterward. It also verifies legacy migration and repeatability in a temporary database schema (the database role needs permission to create schemas).

Production dependencies currently pass `npm audit --omit=dev`. The starter's ESLint development dependency chain has five high-severity audit findings rooted in `braces`; its latest published version has no patched release. Avoid the audit tool's suggested Next.js ESLint downgrade. Recheck when an upstream patch is available.

Keep `.env` private. `COOKIE_SECURE=false` supports local HTTP; use true when serving over HTTPS. This local app does not include password recovery, email invitations, or account deletion.

## Expanded alumni form

Run `npm run db:init` before running the updated app. The repeatable migration preserves existing alumni and legacy columns, moves education, employment, and volunteering data into the new entities, and does not invent privacy permissions. It uses a migration marker so running initialization again cannot restore stale legacy answers.

The five profile entities are:

| Table | Purpose | Relationship |
| --- | --- | --- |
| `alumni` | Name, email, LinkedIn | One person; email is the import match key |
| `alumni_education` | Degree, major / academic program, graduation year | Many qualifications per person |
| `alumni_professional` | Employment status, title, company, industry, location, expertise | One current professional profile |
| `alumni_support_preferences` | Opportunities, organization support interests, participation format, contact frequency, comments | One per person |
| `alumni_privacy_preferences` | Storage permission, profile audience, contact visibility, student contact, news preferences | One per person |

`users` continues to mean application sign-in accounts, separate from alumni. `alumni_directory` is a read-only joined view. Legacy education/company/opportunity columns on `alumni` are retained only as migration backups; the application reads and writes the normalized entities. Use the view for reporting.

### New CSV columns

In addition to the original columns, imports accept:

```text
degree,employment_status,job_title,industry,professional_location,expertise,
opportunities,support_interests,participation_format,contact_frequency,
additional_comments,storage_consent,profile_visibility,contact_visibility,
student_contact,alumni_updates,education_history,q_resume_help,q_career_fair
```

All new response fields are free text, including privacy preferences. No fixed industry, degree, job, or support category is required. Separate multiple opportunity answers with semicolons (for example `Internship opportunities; Resume help; Robotics lab tour`). Dedicated opportunity checkboxes find common phrases; use the free-text opportunity filter for custom answers. `support_interests` is separate from willingness to provide opportunities. Blank responses remain unanswered. The legacy `q_*` columns still accept nullable yes/no values; when `opportunities` is blank, positive legacy answers are converted to opportunity text. An explicit nonblank `opportunities` answer takes precedence.

For a single qualification use `degree`, `major`, and `graduation_year`. For multiple qualifications, `education_history` accepts a JSON array, up to 30 records, and takes precedence over those three columns. Each object requires string `degree`, string `major`, and integer `graduation_year` (1900–2100) or null. Example before CSV quoting:

```json
[{"degree":"BS","major":"Computer Science","graduation_year":2018},{"degree":"MS","major":"Data Analytics","graduation_year":2022}]
```

Standard CSV quoting is required: wrap the entire JSON value in double quotes and double every internal double quote. The profile editor is a simpler alternative for entering multiple qualifications. Fields allow up to 10,000 characters; the 2 MB / 5,000-record file limits still apply. An existing email replaces all five entities, including education history and privacy answers. Missing optional columns clear those answers.

### Directory and permissions

Admins can add or edit profiles directly and review all responses. The editor uses suggestions but accepts custom text. Email identifies the record and is read-only during editing; a new email creates a new person. Search covers all permitted profile text. Grouped filters support professional, education, support, and privacy answers using case-insensitive partial matching. All selected education criteria must match the same qualification. URLs preserve filters, sorting, and pagination.

Member accounts are conservatively treated as potentially including students. Members see a profile only when storage permission is explicitly `Yes` (also `true`, `1`, `y`, or `I agree`) and profile visibility is `Authorized WSU EECS faculty, staff, and students`. Contact links additionally require the corresponding `contact_visibility` and `student_contact` answers offered in the editor. Matching is case-insensitive and ignores leading/trailing spaces. Both-contact visibility also recognizes the form's wording `both email and address and linked in profile`. Unknown, custom, blank, staff-only, permission-first, and do-not-display responses grant no member access. Administrators can review these responses for authorized departmental work; the app does not send messages. Support comments are departmental-only because they may contain additional contact details. Member search, counts, and major suggestions use the same restricted/redacted dataset and cannot match hidden contact fields.

Profile visibility is separate from permission to send messages. Review engagement frequency, selected interests, student contact permission, and news preferences before outreach. The app has no automated outreach. Legacy alumni remain visible to admins but are hidden from members until explicit permissions are recorded.
