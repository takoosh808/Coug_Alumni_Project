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

-- Versioned, transactional migration: existing legacy columns remain as a backup.
BEGIN;
CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS alumni_education (
  id SERIAL PRIMARY KEY,
  alumni_id INTEGER NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
  degree TEXT NOT NULL DEFAULT '',
  major TEXT NOT NULL DEFAULT '',
  graduation_year INTEGER CHECK(graduation_year BETWEEN 1900 AND 2100)
);
CREATE INDEX IF NOT EXISTS education_alumni_idx ON alumni_education(alumni_id);
CREATE INDEX IF NOT EXISTS education_year_idx ON alumni_education(graduation_year);
CREATE TABLE IF NOT EXISTS alumni_professional (
  alumni_id INTEGER PRIMARY KEY REFERENCES alumni(id) ON DELETE CASCADE,
  employment_status TEXT NOT NULL DEFAULT '', job_title TEXT NOT NULL DEFAULT '',
  current_company TEXT NOT NULL DEFAULT '', industry TEXT NOT NULL DEFAULT '',
  professional_location TEXT NOT NULL DEFAULT '', expertise TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS professional_company_idx ON alumni_professional(LOWER(current_company));
CREATE TABLE IF NOT EXISTS alumni_support_preferences (
  alumni_id INTEGER PRIMARY KEY REFERENCES alumni(id) ON DELETE CASCADE,
  opportunities TEXT NOT NULL DEFAULT '', support_interests TEXT NOT NULL DEFAULT '',
  participation_format TEXT NOT NULL DEFAULT '', contact_frequency TEXT NOT NULL DEFAULT '',
  additional_comments TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS alumni_privacy_preferences (
  alumni_id INTEGER PRIMARY KEY REFERENCES alumni(id) ON DELETE CASCADE,
  storage_consent TEXT NOT NULL DEFAULT '', profile_visibility TEXT NOT NULL DEFAULT '',
  contact_visibility TEXT NOT NULL DEFAULT '', student_contact TEXT NOT NULL DEFAULT '',
  alumni_updates TEXT NOT NULL DEFAULT ''
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version='expanded-profiles-v1') THEN
    INSERT INTO alumni_education(alumni_id,major,graduation_year)
      SELECT id,major,graduation_year FROM alumni WHERE major<>'' OR graduation_year IS NOT NULL;
    INSERT INTO alumni_professional(alumni_id,current_company) SELECT id,current_company FROM alumni ON CONFLICT DO NOTHING;
    INSERT INTO alumni_support_preferences(alumni_id,opportunities)
      SELECT id,CONCAT_WS('; ',CASE WHEN q_internship THEN 'Internship opportunities' END,
        CASE WHEN q_guest_lecture THEN 'Guest lecture' END, CASE WHEN q_capstone_mentor THEN 'Senior capstone project' END,
        CASE WHEN q_company_visits THEN 'Company visit' END) FROM alumni ON CONFLICT DO NOTHING;
    -- No privacy permissions are inferred from legacy volunteering answers.
    INSERT INTO alumni_privacy_preferences(alumni_id) SELECT id FROM alumni ON CONFLICT DO NOTHING;
    INSERT INTO schema_migrations(version) VALUES('expanded-profiles-v1');
  END IF;
END $$;
CREATE OR REPLACE VIEW alumni_directory AS
SELECT a.id,a.first_name,a.last_name,a.email,a.linked_in,a.updated_at,
  COALESCE(p.current_company,'') AS current_company, COALESCE(p.employment_status,'') AS employment_status,
  COALESCE(p.job_title,'') AS job_title, COALESCE(p.industry,'') AS industry,
  COALESCE(p.professional_location,'') AS professional_location, COALESCE(p.expertise,'') AS expertise,
  COALESCE(e.degree,'') AS degree, COALESCE(e.major,'') AS major,e.graduation_year,
  COALESCE(h.education_history,'[]'::jsonb) AS education_history,
  COALESCE(s.opportunities,'') AS opportunities, COALESCE(s.support_interests,'') AS support_interests,
  COALESCE(s.participation_format,'') AS participation_format,COALESCE(s.contact_frequency,'') AS contact_frequency,
  COALESCE(s.additional_comments,'') AS additional_comments,
  COALESCE(r.storage_consent,'') AS storage_consent,COALESCE(r.profile_visibility,'') AS profile_visibility,
  COALESCE(r.contact_visibility,'') AS contact_visibility,COALESCE(r.student_contact,'') AS student_contact,
  COALESCE(r.alumni_updates,'') AS alumni_updates,
  s.opportunities ILIKE '%internship%' AS q_internship,
  s.opportunities ILIKE '%guest lecture%' AS q_guest_lecture,
  (s.opportunities ILIKE '%capstone%' OR s.opportunities ILIKE '%senior design%') AS q_capstone_mentor,
  s.opportunities ILIKE '%company visit%' AS q_company_visits,
  s.opportunities ILIKE '%resume%' AS q_resume_help,
  s.opportunities ILIKE '%career fair%' AS q_career_fair
FROM alumni a
LEFT JOIN alumni_professional p ON p.alumni_id=a.id
LEFT JOIN alumni_support_preferences s ON s.alumni_id=a.id
LEFT JOIN alumni_privacy_preferences r ON r.alumni_id=a.id
LEFT JOIN LATERAL (SELECT degree,major,graduation_year FROM alumni_education WHERE alumni_id=a.id ORDER BY graduation_year DESC NULLS LAST,id LIMIT 1) e ON TRUE
LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object('degree',degree,'major',major,'graduation_year',graduation_year) ORDER BY graduation_year DESC NULLS LAST,id) AS education_history FROM alumni_education WHERE alumni_id=a.id) h ON TRUE;
COMMIT;
