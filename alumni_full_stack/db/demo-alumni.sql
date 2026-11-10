-- FICTIONAL SAMPLE DATA ONLY. Run db/schema.sql first in the same database.
-- Run this entire file in pgAdmin Query Tool (F5); do not use table CSV import.
-- Repeat runs update only the ten named example.com alumni and their related data.
-- Does not delete other alumni or create application sign-in accounts.
-- LinkedIn URLs are fictional placeholders, not verified profiles.
BEGIN;
CREATE TEMP TABLE demo_alumni_input ON COMMIT DROP AS
SELECT value AS profile FROM jsonb_array_elements($demo$
[
  {
    "first_name": "Alex",
    "last_name": "Chen",
    "email": "alex.chen@example.com",
    "current_company": "Microsoft",
    "graduation_year": 2018,
    "major": "Computer Science",
    "linked_in": "https://www.linkedin.com/in/fictional-wsu-demo-alex-chen/",
    "degree": "Bachelor of Science (BS)",
    "employment_status": "Employed full time",
    "job_title": "Software Engineer",
    "industry": "Software and technology",
    "professional_location": "Seattle, WA",
    "expertise": "Software engineering; Web development",
    "opportunities": "Provide or share internship opportunities; Deliver a guest lecture or technical talk; Host a company visit or facility tour",
    "participation_format": "Either in person or virtual",
    "contact_frequency": "As relevant opportunities arise",
    "additional_comments": "Fictional example: offer summer internships and a technical guest lecture.",
    "storage_consent": "Yes",
    "profile_visibility": "Authorized WSU EECS faculty, staff, and students",
    "contact_visibility": "Both email address and LinkedIn profile",
    "student_contact": "Yes by either email or LinkedIn",
    "alumni_updates": "I would like to receive occasional WSU EECS news and alumni updates",
    "education_history": [
      {
        "degree": "Bachelor of Science (BS)",
        "major": "Computer Science",
        "graduation_year": 2018
      }
    ],
    "support_interests": ""
  },
  {
    "first_name": "Jordan",
    "last_name": "Rivera",
    "email": "jordan.rivera@example.com",
    "current_company": "Microsoft",
    "graduation_year": 2020,
    "major": "Software Engineering",
    "linked_in": "https://www.linkedin.com/in/fictional-wsu-demo-jordan-rivera/",
    "degree": "Master of Science (MS)",
    "employment_status": "Employed full time",
    "job_title": "Engineering Program Manager",
    "industry": "Software and technology",
    "professional_location": "Redmond, WA",
    "expertise": "Software engineering; Mobile development",
    "opportunities": "Provide or share internship opportunities; Sponsor a Senior Design or Capstone project; Mentor a Senior Design or Capstone team; Participate in a career fair",
    "participation_format": "Virtual",
    "contact_frequency": "Only about the opportunities I selected",
    "additional_comments": "Fictional example: mentor a capstone team and participate in a career fair.",
    "storage_consent": "Yes",
    "profile_visibility": "Authorized WSU EECS faculty, staff, and students",
    "contact_visibility": "Email address only",
    "student_contact": "Yes by email",
    "alumni_updates": "Contact me only about the engagement opportunities I selected",
    "education_history": [
      {
        "degree": "Master of Science (MS)",
        "major": "Software Engineering",
        "graduation_year": 2020
      },
      {
        "degree": "Bachelor of Science (BS)",
        "major": "Computer Science",
        "graduation_year": 2018
      }
    ],
    "support_interests": ""
  },
  {
    "first_name": "Taylor",
    "last_name": "Brooks",
    "email": "taylor.brooks@example.com",
    "current_company": "Boeing",
    "graduation_year": 2015,
    "major": "Computer Engineering",
    "linked_in": "https://www.linkedin.com/in/fictional-wsu-demo-taylor-brooks/",
    "degree": "Bachelor of Science (BS)",
    "employment_status": "Employed part time",
    "job_title": "Embedded Systems Engineer",
    "industry": "Aerospace and defense",
    "professional_location": "Everett, WA",
    "expertise": "Embedded systems; Computer hardware; Safety-critical software",
    "opportunities": "Deliver a guest lecture or technical talk; Mentor a Senior Design or Capstone team; Host a company visit or facility tour",
    "participation_format": "In person",
    "contact_frequency": "No more than once per semester",
    "additional_comments": "Fictional example: discuss embedded systems projects and arrange a company visit.",
    "storage_consent": "Yes",
    "profile_visibility": "Authorized WSU EECS faculty and staff",
    "contact_visibility": "LinkedIn profile only",
    "student_contact": "Only after receiving permission from WSU EECS",
    "alumni_updates": "I would like to receive occasional WSU EECS news and alumni updates",
    "education_history": [
      {
        "degree": "Bachelor of Science (BS)",
        "major": "Computer Engineering",
        "graduation_year": 2015
      }
    ],
    "support_interests": ""
  },
  {
    "first_name": "Morgan",
    "last_name": "Patel",
    "email": "morgan.patel@example.com",
    "current_company": "Independent consulting practice",
    "graduation_year": 2021,
    "major": "Cybersecurity",
    "linked_in": "https://www.linkedin.com/in/fictional-wsu-demo-morgan-patel/",
    "degree": "Certificate",
    "employment_status": "Self-employed or entrepreneur",
    "job_title": "Security Consultant",
    "industry": "Independent security consulting",
    "professional_location": "Spokane, WA",
    "expertise": "Cybersecurity; Cloud security; Security education",
    "opportunities": "Participate in a career fair; Deliver a guest lecture or technical talk",
    "participation_format": "Depends on the opportunity",
    "contact_frequency": "As relevant opportunities arise",
    "additional_comments": "Fictional example: run a security workshop and share consulting career advice.",
    "storage_consent": "Yes",
    "profile_visibility": "Authorized WSU EECS faculty, staff, and students",
    "contact_visibility": "LinkedIn profile only",
    "student_contact": "Yes through LinkedIn",
    "alumni_updates": "Contact me only about the engagement opportunities I selected",
    "education_history": [
      {
        "degree": "Certificate",
        "major": "Cybersecurity",
        "graduation_year": 2021
      }
    ],
    "support_interests": ""
  },
  {
    "first_name": "Casey",
    "last_name": "Wilson",
    "email": "casey.wilson@example.com",
    "current_company": "Schweitzer Engineering Laboratories",
    "graduation_year": 2012,
    "major": "Electrical Engineering",
    "linked_in": "https://www.linkedin.com/in/fictional-wsu-demo-casey-wilson/",
    "degree": "Master of Science (MS)",
    "employment_status": "Employed full time",
    "job_title": "Power Systems Engineer",
    "industry": "Energy and utilities",
    "professional_location": "Pullman, WA",
    "expertise": "Power systems; Embedded systems; Electrical engineering",
    "opportunities": "Provide or share internship opportunities; Deliver a guest lecture or technical talk; Sponsor a Senior Design or Capstone project; Host a company visit or facility tour; Participate in a career fair",
    "participation_format": "Either in person or virtual",
    "contact_frequency": "No more than once per semester",
    "additional_comments": "Fictional example: connect a capstone team with power systems engineers.",
    "storage_consent": "Yes",
    "profile_visibility": "Authorized WSU EECS faculty, staff, and students",
    "contact_visibility": "Both email address and LinkedIn profile",
    "student_contact": "Yes by either email or LinkedIn",
    "alumni_updates": "I would like to receive occasional WSU EECS news and alumni updates",
    "education_history": [
      {
        "degree": "Master of Science (MS)",
        "major": "Electrical Engineering",
        "graduation_year": 2012
      },
      {
        "degree": "Bachelor of Science (BS)",
        "major": "Electrical Engineering",
        "graduation_year": 2010
      }
    ],
    "support_interests": ""
  },
  {
    "first_name": "Riley",
    "last_name": "Nguyen",
    "email": "riley.nguyen@example.com",
    "current_company": "Adobe",
    "graduation_year": 2019,
    "major": "Data Analytics",
    "linked_in": "https://www.linkedin.com/in/fictional-wsu-demo-riley-nguyen/",
    "degree": "Bachelor of Arts (BA)",
    "employment_status": "Employed full time",
    "job_title": "Product Data Analyst",
    "industry": "Artificial intelligence and machine learning",
    "professional_location": "San Jose, CA",
    "expertise": "Data science and analytics; Generative AI and foundation models",
    "opportunities": "Deliver a guest lecture or technical talk; Participate in alumni networking activities",
    "participation_format": "Virtual",
    "contact_frequency": "No more than once per year",
    "additional_comments": "Fictional example: present on responsible data analysis and join alumni networking activities.",
    "storage_consent": "Yes",
    "profile_visibility": "Please contact me before displaying my profile",
    "contact_visibility": "Neither",
    "student_contact": "No",
    "alumni_updates": "I do not wish to receive general alumni communications",
    "education_history": [
      {
        "degree": "Bachelor of Arts (BA)",
        "major": "Data Analytics",
        "graduation_year": 2019
      }
    ],
    "support_interests": ""
  },
  {
    "first_name": "Jamie",
    "last_name": "Thompson",
    "email": "jamie.thompson@example.com",
    "current_company": "Retired from industry",
    "graduation_year": 2009,
    "major": "Computer Science",
    "linked_in": "https://www.linkedin.com/in/fictional-wsu-demo-jamie-thompson/",
    "degree": "Doctor of Philosophy (PhD)",
    "employment_status": "Retired",
    "job_title": "Retired Research Scientist",
    "industry": "Semiconductor and computer hardware",
    "professional_location": "Vancouver, WA",
    "expertise": "Computer architecture; Research mentoring; AI and ML",
    "opportunities": "Deliver a guest lecture or technical talk; Mentor a Senior Design or Capstone team; Support research collaboration",
    "participation_format": "Either in person or virtual",
    "contact_frequency": "Only about the opportunities I selected",
    "additional_comments": "Fictional example: mentor research-oriented students and advise capstone teams.",
    "storage_consent": "Yes",
    "profile_visibility": "Authorized WSU EECS faculty, staff, and students",
    "contact_visibility": "Neither",
    "student_contact": "Only after receiving permission from WSU EECS",
    "alumni_updates": "Contact me only about the engagement opportunities I selected",
    "education_history": [
      {
        "degree": "Doctor of Philosophy (PhD)",
        "major": "Computer Science",
        "graduation_year": 2009
      },
      {
        "degree": "Master of Science (MS)",
        "major": "Computer Science",
        "graduation_year": 2005
      },
      {
        "degree": "Bachelor of Science (BS)",
        "major": "Computer Engineering",
        "graduation_year": 2003
      }
    ],
    "support_interests": ""
  },
  {
    "first_name": "Sam",
    "last_name": "Martinez",
    "email": "sam.martinez@example.com",
    "current_company": "Washington State University",
    "graduation_year": 2022,
    "major": "Data Analytics",
    "linked_in": "https://www.linkedin.com/in/fictional-wsu-demo-sam-martinez/",
    "degree": "Bachelor of Science (BS)",
    "employment_status": "Graduate or professional student",
    "job_title": "Graduate Research Assistant",
    "industry": "Higher education and research",
    "professional_location": "Pullman, WA",
    "expertise": "Data science and analytics; AI and ML; Scientific computing",
    "opportunities": "Host a company visit or facility tour; Support research collaboration",
    "participation_format": "In person",
    "contact_frequency": "As relevant opportunities arise",
    "additional_comments": "Fictional example: arrange a campus research lab tour and discuss graduate study.",
    "storage_consent": "Yes",
    "profile_visibility": "Authorized WSU EECS faculty, staff, and students",
    "contact_visibility": "Both email address and LinkedIn profile",
    "student_contact": "Yes by either email or LinkedIn",
    "alumni_updates": "I would like to receive occasional WSU EECS news and alumni updates",
    "education_history": [
      {
        "degree": "Bachelor of Science (BS)",
        "major": "Data Analytics",
        "graduation_year": 2022
      }
    ],
    "support_interests": ""
  },
  {
    "first_name": "Quinn",
    "last_name": "Anderson",
    "email": "quinn.anderson@example.com",
    "current_company": "Spokane Public Schools",
    "graduation_year": 2010,
    "major": "Computer Science",
    "linked_in": "https://www.linkedin.com/in/fictional-wsu-demo-quinn-anderson/",
    "degree": "Bachelor of Arts (BA)",
    "employment_status": "Employed full time",
    "job_title": "Computer Science Teacher",
    "industry": "K-12 education",
    "professional_location": "Spokane, WA",
    "expertise": "Computer science education; Web development; Student mentoring",
    "opportunities": "Deliver a guest lecture or technical talk; Participate in alumni networking activities",
    "participation_format": "Depends on the opportunity",
    "contact_frequency": "No more than once per semester",
    "additional_comments": "Fictional example: discuss teaching careers and support student outreach activities.",
    "storage_consent": "Yes",
    "profile_visibility": "Do not display my profile; use my information only for authorized departmental purposes",
    "contact_visibility": "Not applicable because I do not want my profile displayed",
    "student_contact": "No",
    "alumni_updates": "I do not wish to receive general alumni communications",
    "education_history": [
      {
        "degree": "Bachelor of Arts (BA)",
        "major": "Computer Science",
        "graduation_year": 2010
      }
    ],
    "support_interests": ""
  },
  {
    "first_name": "Avery",
    "last_name": "Kim",
    "email": "avery.kim@example.com",
    "current_company": "Not currently affiliated with a company",
    "graduation_year": 2016,
    "major": "Robotics and Intelligent Systems",
    "linked_in": "https://www.linkedin.com/in/fictional-wsu-demo-avery-kim/",
    "degree": "Professional development diploma",
    "employment_status": "Not currently employed",
    "job_title": "Seeking robotics engineering opportunities",
    "industry": "Robotics and automation",
    "professional_location": "Richland, WA",
    "expertise": "Robotics; Mobile development; Computer vision",
    "opportunities": "None",
    "participation_format": "Not applicable at this time",
    "contact_frequency": "Please do not contact me about engagement opportunities at this time",
    "additional_comments": "Fictional example: currently focused on a job search; no engagement opportunities offered.",
    "storage_consent": "No",
    "profile_visibility": "Authorized WSU EECS faculty, staff, and students",
    "contact_visibility": "Neither",
    "student_contact": "No",
    "alumni_updates": "I do not wish to receive general alumni communications",
    "education_history": [
      {
        "degree": "Professional development diploma",
        "major": "Robotics and Intelligent Systems",
        "graduation_year": 2016
      }
    ],
    "support_interests": ""
  }
]
$demo$::jsonb);
INSERT INTO alumni(first_name,last_name,email,linked_in)
SELECT profile->>'first_name',profile->>'last_name',profile->>'email',profile->>'linked_in' FROM demo_alumni_input
ON CONFLICT(email) DO UPDATE SET first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,linked_in=EXCLUDED.linked_in,updated_at=NOW();

INSERT INTO alumni_professional(alumni_id,employment_status,job_title,current_company,industry,professional_location,expertise)
SELECT a.id,d.profile->>'employment_status',d.profile->>'job_title',d.profile->>'current_company',d.profile->>'industry',d.profile->>'professional_location',d.profile->>'expertise' FROM demo_alumni_input d JOIN alumni a ON a.email=d.profile->>'email'
ON CONFLICT(alumni_id) DO UPDATE SET employment_status=EXCLUDED.employment_status,job_title=EXCLUDED.job_title,current_company=EXCLUDED.current_company,industry=EXCLUDED.industry,professional_location=EXCLUDED.professional_location,expertise=EXCLUDED.expertise;

INSERT INTO alumni_support_preferences(alumni_id,opportunities,support_interests,participation_format,contact_frequency,additional_comments)
SELECT a.id,d.profile->>'opportunities',d.profile->>'support_interests',d.profile->>'participation_format',d.profile->>'contact_frequency',d.profile->>'additional_comments' FROM demo_alumni_input d JOIN alumni a ON a.email=d.profile->>'email'
ON CONFLICT(alumni_id) DO UPDATE SET opportunities=EXCLUDED.opportunities,support_interests=EXCLUDED.support_interests,participation_format=EXCLUDED.participation_format,contact_frequency=EXCLUDED.contact_frequency,additional_comments=EXCLUDED.additional_comments;

INSERT INTO alumni_privacy_preferences(alumni_id,storage_consent,profile_visibility,contact_visibility,student_contact,alumni_updates)
SELECT a.id,d.profile->>'storage_consent',d.profile->>'profile_visibility',d.profile->>'contact_visibility',d.profile->>'student_contact',d.profile->>'alumni_updates' FROM demo_alumni_input d JOIN alumni a ON a.email=d.profile->>'email'
ON CONFLICT(alumni_id) DO UPDATE SET storage_consent=EXCLUDED.storage_consent,profile_visibility=EXCLUDED.profile_visibility,contact_visibility=EXCLUDED.contact_visibility,student_contact=EXCLUDED.student_contact,alumni_updates=EXCLUDED.alumni_updates;

DELETE FROM alumni_education e USING alumni a,demo_alumni_input d
WHERE e.alumni_id=a.id AND a.email=d.profile->>'email';
INSERT INTO alumni_education(alumni_id,degree,major,graduation_year)
SELECT a.id,e->>'degree',e->>'major',(e->>'graduation_year')::int
FROM demo_alumni_input d JOIN alumni a ON a.email=d.profile->>'email'
CROSS JOIN LATERAL jsonb_array_elements(d.profile->'education_history') e;
COMMIT;
-- Inspect the ten profiles, including education history and permissions.
SELECT p.* FROM alumni_directory p WHERE p.email IN (
  'alex.chen@example.com',
  'jordan.rivera@example.com',
  'taylor.brooks@example.com',
  'morgan.patel@example.com',
  'casey.wilson@example.com',
  'riley.nguyen@example.com',
  'jamie.thompson@example.com',
  'sam.martinez@example.com',
  'quinn.anderson@example.com',
  'avery.kim@example.com'
) ORDER BY p.last_name,p.first_name;
