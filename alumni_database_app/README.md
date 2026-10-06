# Alumni Database Querier (Prototype)

A simple local web app for searching, filtering, and analyzing alumni
engagement survey data. Runs entirely on your own machine — no cloud
account, no external database server, no configuration.

## Why SQLite instead of PostgreSQL?

The main requirement for this prototype was "download the files and just
run it, on any machine." PostgreSQL needs a database *server* installed
and running before the app can even start, which works against that goal.
SQLite is a single file and ships built into Python, so there is nothing
to install or configure — the app creates `alumni_database.db`
automatically the first time it runs. It comfortably handles well beyond
250,000 rows for this kind of query workload.

If this ever needs to grow into a shared, multi-user, always-on system,
the data layer (`db.py`) uses SQLAlchemy, so moving to PostgreSQL later
is a matter of changing one connection string (`DB_URL`) — the rest of
the app doesn't need to change.

## Login schema foundation

The database initializes a separate `app_users` table for authentication. It
stores unique usernames and email addresses, a salted scrypt `password_hash`
(never a plaintext password), a role, an active flag, and account timestamps.
The app requires sign-in and accepts either username or email.

To create the first administrator, add these secrets to Streamlit Cloud under
**App settings → Secrets** before starting the app:

```toml
BOOTSTRAP_ADMIN_USERNAME = "admin"
BOOTSTRAP_ADMIN_EMAIL = "admin@example.com"
BOOTSTRAP_ADMIN_PASSWORD = "use-a-unique-password-at-least-12-characters"
```

The administrator is created only when `app_users` is empty. Once the account
has been created, remove these bootstrap secrets and reboot the app. For a
Rocky Linux deployment, provide the same three values as environment variables
to the app's systemd service instead of committing them to a file. This initial
version has no public registration or user-management page; additional users
must be provisioned through trusted administrative tooling.

## What's included

| File | Purpose |
|---|---|
| `Alumni_Database_App.ipynb` | Jupyter notebook — installs dependencies and launches the app for you |
| `app.py` | The Streamlit web app (UI) |
| `db.py` | Database logic (SQLite via SQLAlchemy) |
| `requirements.txt` | Python package dependencies |
| `sample_alumni_data.csv` | 30 rows of dummy data to try the app with |
| `run.sh` / `run.bat` | Double-click launchers for Mac/Linux and Windows |

## How to run it

**Easiest: use the notebook.** Open `Alumni_Database_App.ipynb` in Jupyter
and run all cells top to bottom. It will install anything missing and
open the app in your browser automatically.

**Or from a terminal:**

```bash
pip install -r requirements.txt
streamlit run app.py
```

Then open the URL it prints (usually `http://localhost:8501`).

**Or double-click:** `run.sh` (Mac/Linux) or `run.bat` (Windows).

Requires Python 3.9+. Nothing else needs to be pre-installed — pip will
fetch Streamlit, pandas, and SQLAlchemy for you.

## Using the app

- **🔍 Search & Filter** — search by name, company, major, graduation
  year (a specific year or a range), and any Yes/No questionnaire
  answer. Results update live and can be downloaded as a CSV.
- **📊 Analytics** — headline counts, graduation-year distribution,
  questionnaire response rates, top companies, and top majors.
- **📋 View All Data** — the full table, downloadable as CSV.
- **📤 Upload / Ingest CSV** — upload a CSV to add or update records
  (matched by email), or load the included sample dataset with one click.
- **⚙️ Settings** — see the database file location and current columns,
  or clear all data to start over.

## CSV format for data ingestion

Required column:
- `email` — used as the unique key. Uploading a CSV with an email that
  already exists in the database **updates** that person's record
  instead of creating a duplicate.

Recommended columns:
`first_name`, `last_name`, `current_company`, `graduation_year`, `major`,
`linked_in`

Questionnaire columns — name them starting with `q_`, e.g.:
`q_internship`, `q_guest_lecture`, `q_capstone_mentor`, `q_company_visits`

**Adding new questions later:** just add a new `q_`-prefixed column to
your CSV (e.g. `q_alumni_panel`) and upload it — the app automatically
adds it to the database and it will show up as a new filter and chart.
Values of `yes/no/y/n/true/false/1/0` (any case) are normalized to a
clean "Yes"/"No".

A ready-to-use example is included: `sample_alumni_data.csv`.

## Sharing this with someone else

Zip up this whole folder and send it to them. They unzip it, then either
run the notebook or run `run.sh` / `run.bat`. Each person gets their own
local `alumni_database.db` file, so instances don't interfere with each
other. To share your actual data with someone, just send them your
`alumni_database.db`, or export a CSV from **View All Data** and have
them ingest it via **Upload / Ingest CSV**.

## Notes on scale

This prototype is being tested with a small amount of dummy data, but is
built to scale to the ~250,000-row range without changes — SQLite and
the indexed lookups used here handle that comfortably on a single
machine. If usage grows to many concurrent users editing data at once,
that's the point to consider moving to PostgreSQL (see above).

## Free live hosting

The app can be hosted for free with [Streamlit Community Cloud](https://streamlit.io/cloud).
For a live app, use a free PostgreSQL database such as Supabase instead of the
local SQLite file. Hosted app files are not reliable permanent storage, so do
not use SQLite for important live data.

1. Push this repository to GitHub. The app entry point is
  `alumni_database_app/app.py`.
2. Create a free Supabase project. In Supabase, click **Connect**, choose
  **Database**, then choose **Session pooler**. Do not use the direct host
  `db.<project-ref>.supabase.co`, because it may be IPv6-only and cannot be
  reached by Streamlit Community Cloud.
3. In Streamlit Community Cloud, create an app from the repository, set the
  main file to `alumni_database_app/app.py`, and add these secrets. Use the
  exact values shown by Supabase under **Connect → Database → Session pooler**:

  ```toml
  SUPABASE_DB_HOST = "aws-0-REGION.pooler.supabase.com"
  SUPABASE_DB_PORT = "5432"
  SUPABASE_DB_NAME = "postgres"
  SUPABASE_DB_USER = "postgres.PROJECT_REF"
  SUPABASE_DB_PASSWORD = "YOUR_DATABASE_PASSWORD"
  ```

  The user must be the pooler user, usually `postgres.PROJECT_REF`, not just
  `postgres`. The password is the Supabase database password, not the
  Supabase account password. The app encodes special password characters
  automatically. Keep these values in Streamlit Secrets, never in GitHub.
4. Deploy. The app creates its table automatically on first startup.

The app also accepts a `DATABASE_URL` secret for compatibility, but the split
secrets above are recommended because they avoid URI escaping mistakes.
Without either configuration, local development uses SQLite as before.
