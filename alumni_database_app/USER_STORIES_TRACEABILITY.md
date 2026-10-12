# Alumni Database User Stories and Traceability

The user stories below are based on the functional requirements numbered FR-01 through FR-16 in the supplied Section III.3.2 excerpt. Use case references match [USE_CASES.md](USE_CASES.md).

## User Stories

### `III.4.1.1. US-1: Search and Review Alumni`

As an authenticated alumni relations user, I should be able to search and filter alumni records and review analytics, so that I can find relevant alumni information and prepare reports.

**Feature:** Alumni Search and Review

**Scenario:** User searches and reviews alumni

Given the user is signed in and is on the alumni dashboard,

When they enter a name or company, or select filters such as major, graduation year, LinkedIn status, or questionnaire response,

Then the dashboard should show only alumni records that match the selected criteria.

And the user should be able to download the matching results as a CSV file.

**Scenario:** User reviews analytics and all records

Given the user is signed in,

When they open the Analytics or View All Data page,

Then the application should show available alumni counts, charts, and records.

And the user should be able to download all records as a CSV file.

### `III.4.1.2. US-2: Import Alumni Records`

As an admin, I should be able to preview and import an alumni CSV matched by email, so that I can add new alumni and update existing records without creating duplicates.

**Feature:** Alumni CSV Ingestion

**Scenario:** Admin imports alumni records

Given the admin is signed in and is on the Upload / Ingest CSV page,

When they select a CSV file containing an email column,

And review the preview and confirm ingestion,

Then new email addresses should create alumni records and existing email addresses should update matching records.

And rows missing an email should be skipped and included in the ingestion summary.

**Scenario:** Admin uploads an invalid CSV

Given the admin has selected a CSV file,

When the file cannot be read or does not contain an email column,

Then the application should show an error and should not ingest the invalid file.

### `III.4.1.3. US-3: Manage Secure Access`

As an initial or existing admin, I should be able to securely establish and manage user accounts and roles, so that only authorized active people can use the system and admin access is maintained.

**Feature:** Account and Role Management

**Scenario:** Initial administrator is created

Given the application has no user accounts and valid bootstrap administrator secrets are configured,

When the application starts,

Then it should create the initial administrator account with a securely hashed password.

**Scenario:** Admin creates or edits an account

Given the admin is signed in and is on the User Management page,

When they enter or update the username, email, role, active status, or password and save the form,

Then the application should validate and save the account changes.

**Scenario:** Admin deletes an account

Given the admin has selected an account in User Management,

When they confirm the delete action,

Then the selected account should be removed unless it is the admin's own account or the last active admin account.

## Traceability Matrix

| **Functional Requirements** | **Use Cases** | **User Stories** | **Priority** |
|---|---|---|---|
| FR-01: Require Authentication | UC-01 | US-1, US-2, US-3 | Level 1: Desired functionality |
| FR-02: Sign In with Username or Email | UC-01 | US-1, US-2, US-3 | Level 1: Desired functionality |
| FR-03: Enforce Role-Based Access | UC-01, UC-05, UC-06 | US-1, US-2, US-3 | Level 1: Desired functionality |
| FR-04: End and Revalidate Sessions | UC-01, UC-06 | US-1, US-3 | Level 1: Desired functionality |
| FR-05: Bootstrap Initial Administrator | UC-01 | US-3 | Level 1: Desired functionality |
| FR-06: Search and Filter Alumni | UC-02 | US-1 | Level 1: Desired functionality |
| FR-07: Export Search Results | UC-02 | US-1 | Level 1: Desired functionality |
| FR-08: View All Alumni Records | UC-04 | US-1 | Level 1: Desired functionality |
| FR-09: Export All Alumni Records | UC-04 | US-1 | Level 1: Desired functionality |
| FR-10: Display Summary Counts | UC-03 | US-1 | Level 1: Desired functionality |
| FR-11: Display Alumni and Survey Charts | UC-03 | US-1 | Level 1: Desired functionality |
| FR-12: Restrict CSV Ingestion to Admins | UC-05 | US-2 | Level 1: Desired functionality |
| FR-13: Require Email as the Matching Key | UC-05 | US-2 | Level 1: Desired functionality |
| FR-14: Insert, Update, and Report Ingested Rows | UC-05 | US-2 | Level 1: Desired functionality |
| FR-15: Create Accounts | UC-06 | US-3 | Level 1: Desired functionality |
| FR-16: Edit/Delete Accounts | UC-06 | US-3 | Level 1: Desired functionality |

**Numbering note:** FR-12 is not shown in the supplied excerpt. It is mapped here to the existing admin-only CSV ingestion requirement (UC-05); adjust this row if FR-12 has a different title in your final requirements section.
