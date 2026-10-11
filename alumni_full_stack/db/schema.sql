CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user','admin','super_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS login_attempts (
  email TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS alumni (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  current_company TEXT NOT NULL DEFAULT '',
  graduation_year INTEGER CHECK(graduation_year BETWEEN 1900 AND 2100),
  major TEXT NOT NULL DEFAULT '',
  linked_in TEXT NOT NULL DEFAULT '',
  q_internship BOOLEAN,
  q_guest_lecture BOOLEAN,
  q_capstone_mentor BOOLEAN,
  q_company_visits BOOLEAN,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS alumni_company_idx ON alumni(LOWER(current_company));
CREATE INDEX IF NOT EXISTS alumni_year_idx ON alumni(graduation_year);
CREATE TABLE IF NOT EXISTS imports (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
