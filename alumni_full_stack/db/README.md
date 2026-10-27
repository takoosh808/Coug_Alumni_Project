# Fictional alumni examples

## Directory filter options

Directory choices are queried from current database answers on every directory request, independently of search filters and pagination. New imported, edited, or directly updated values appear on the next directory load; refresh an already open directory after an external database update. No lookup tables or migration are needed: the existing profile tables remain the source of truth.

Degree and major choices include every education record. Opportunities, expertise, and support interests split semicolon-separated answers into individual choices; commas remain part of answers. Blank choices are excluded, and choices are deduplicated and sorted. Member choices use only profiles visible to that member and exclude staff-only comments.

Opportunity checkboxes use repeated `opportunity_value` query parameters for exact, case-insensitive answers and support all/any matching. Existing `opportunity=q_internship` and other legacy category links remain supported. Other text filters retain partial-text matching. Fixed suggestions in the profile editor remain optional data-entry hints and do not control directory filter options.

The old 10-person list has been updated for the expanded schema. Every one of the 24 CSV template columns has a value, including all education, professional, support, and privacy responses. The examples do not establish which real form fields must be required. No validation rules or schema constraints were changed.

Names, employment details, comments, and permissions are fictional. Emails use the reserved `example.com` domain. LinkedIn URLs are clearly marked fictional placeholders and are not verified accounts. Organization names are illustrative, not claims about actual alumni or partnerships.

## Load through pgAdmin

1. Select your application's database and open Query Tool.
2. Execute `schema.sql` first if you have not applied the expanded schema.
3. Open `demo-alumni.sql` and execute the **entire file** with F5.
4. The final query displays the 10 seeded profiles. Refresh the directory in the app.

The SQL script fills all five profile entities in one transaction. Repeat runs update the same 10 example.com profiles and replace only their education records, without duplicating qualifications or deleting other alumni. It overwrites changes you have made to those 10 demo profiles.

## Load through the app

Sign in as an administrator, open **CSV imports**, and upload `demo-alumni.csv`. Validate and preview, then confirm the import. Use either this route or the SQL file; both contain the same data. Do not use pgAdmin's single-table CSV import: one CSV row belongs to several related tables.

The scalar degree, major, and graduation year match each person's latest qualification. `education_history` contains all qualifications and takes precedence during CSV import. There are 14 qualifications total: Jordan and Casey have two each, Jamie has three, and everyone else has one.

## Included profiles

| Name | Example professional background | Member directory behavior |
| --- | --- | --- |
| Alex Chen | Microsoft software engineer | Visible; email and LinkedIn |
| Jordan Rivera | Microsoft engineering program manager | Visible; email only |
| Taylor Brooks | Boeing embedded systems engineer, part time | Hidden; staff-only profile |
| Morgan Patel | Self-employed security consultant | Visible; LinkedIn only |
| Casey Wilson | SEL power systems engineer | Visible; email and LinkedIn |
| Riley Nguyen | Adobe product data analyst | Hidden; contact before displaying |
| Jamie Thompson | Retired research scientist | Visible; no direct contact links |
| Sam Martinez | WSU graduate research assistant | Visible; email and LinkedIn |
| Quinn Anderson | Computer science teacher | Hidden; departmental use only |
| Avery Kim | Seeking robotics engineering work | Hidden; storage consent is No |

Administrators can inspect all 10 examples; members see six. Avery's deliberately negative consent is a privacy test case, not authorization to retain real information without consent. Other scenarios include no offered opportunities, custom support answers, varied contact frequencies, news opt-outs, custom degree/major/industry values, and multiple education records.

## Application sign-in accounts

These are alumni profiles, not login accounts. `users` stores sign-in accounts separately. `npm run db:init` creates the initial super admin from `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` in your private `.env`. The super admin can create member and admin accounts under **Manage accounts**. The example SQL and CSV do not create accounts or contain passwords.
