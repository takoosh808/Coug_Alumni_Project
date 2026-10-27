# Alumni Database App Functional Requirements

These requirements describe the current role-based application. Sources refer to the corresponding use cases in [USE_CASES.md](USE_CASES.md); no client-meeting notes were provided.

## Authentication and Authorization

### FR-AUTH-01: Require Authentication

**Description**

The system should require a signed-in, active account before allowing a person to access alumni records or application pages.

**Source**

Use Case UC-01: Sign In

**Priority**

Priority Level 1: Desired functionality

### FR-AUTH-02: Sign In with Username or Email

**Description**

The system should allow users to sign in with their username or email address and password, and should verify the password against its stored password hash.

**Source**

Use Case UC-01: Sign In

**Priority**

Priority Level 1: Desired functionality

### FR-AUTH-03: Enforce Role-Based Access

**Description**

The system should provide standard users with search, analytics, and record viewing, and should provide admins with those functions plus CSV ingestion, settings, and user management.

**Source**

Use Cases UC-01 and UC-06: Sign In; Manage User Accounts

**Priority**

Priority Level 1: Desired functionality

### FR-AUTH-04: End and Revalidate Sessions

**Description**

The system should allow a signed-in person to sign out and should end access when their account is deactivated or deleted.

**Source**

Use Cases UC-01 and UC-06: Sign In; Manage User Accounts

**Priority**

Priority Level 1: Desired functionality

### FR-AUTH-05: Bootstrap Initial Administrator

**Description**

The system should create an initial admin account from configured deployment secrets only when the user table contains no accounts.

**Source**

Use Case UC-01: Sign In

**Priority**

Priority Level 1: Desired functionality

## Alumni Search and Records

### FR-ALUM-01: Search and Filter Alumni

**Description**

The system should allow authenticated users to search and filter alumni by name, company, major, LinkedIn presence, graduation year or year range, and available questionnaire responses.

**Source**

Use Case UC-02: Search and Filter Alumni

**Priority**

Priority Level 1: Desired functionality

### FR-ALUM-02: Export Search Results

**Description**

The system should allow authenticated users to download the current search results as a CSV file.

**Source**

Use Case UC-02: Search and Filter Alumni

**Priority**

Priority Level 1: Desired functionality

### FR-ALUM-03: View All Alumni Records

**Description**

The system should allow authenticated users to view all alumni records ordered by last name and first name.

**Source**

Use Case UC-04: View and Export Alumni Records

**Priority**

Priority Level 1: Desired functionality

### FR-ALUM-04: Export All Alumni Records

**Description**

The system should allow authenticated users to download all alumni records as a CSV file without including the database's internal row ID.

**Source**

Use Case UC-04: View and Export Alumni Records

**Priority**

Priority Level 1: Desired functionality

## Analytics

### FR-ANALYTICS-01: Display Summary Counts

**Description**

The system should display the total alumni count and the number of distinct companies and majors.

**Source**

Use Case UC-03: Review Alumni Analytics

**Priority**

Priority Level 1: Desired functionality

### FR-ANALYTICS-02: Display Alumni and Survey Charts

**Description**

The system should display charts for graduation-year distribution, questionnaire responses, top companies, and top majors when data is available.

**Source**

Use Case UC-03: Review Alumni Analytics

**Priority**

Priority Level 1: Desired functionality

## CSV Ingestion and Data Handling

### FR-ADMIN-01: Restrict CSV Ingestion to Admins

**Description**

The system should allow only admins to upload and ingest alumni CSV files, preview uploaded rows, and confirm ingestion.

**Source**

Use Case UC-05: Ingest Alumni CSV

**Priority**

Priority Level 1: Desired functionality

### FR-DATA-01: Require Email as the Matching Key

**Description**

The system should require an email column in an uploaded CSV and use each non-empty email address to identify an alumni record.

**Source**

Use Case UC-05: Ingest Alumni CSV

**Priority**

Priority Level 1: Desired functionality

### FR-DATA-02: Insert, Update, and Report Ingested Rows

**Description**

The system should insert records with new email addresses, update records with existing email addresses, skip rows with missing email values, and report the number of rows inserted, updated, and skipped.

**Source**

Use Case UC-05: Ingest Alumni CSV

**Priority**

Priority Level 1: Desired functionality

### FR-DATA-03: Add Questionnaire Columns from CSV

**Description**

The system should add previously unknown CSV columns to the alumni table so new questionnaire fields can be ingested and used by the app.

**Source**

Use Case UC-05: Ingest Alumni CSV

**Priority**

Priority Level 1: Desired functionality

### FR-DATA-04: Normalize Yes/No Responses

**Description**

The system should normalize common yes/no values, including y/n, true/false, and 1/0, to consistent Yes and No values during ingestion.

**Source**

Use Case UC-05: Ingest Alumni CSV

**Priority**

Priority Level 1: Desired functionality

## User Management and Settings

### FR-USER-01: Create Accounts

**Description**

The system should allow admins to create accounts with a unique username, unique email address, password of at least 12 characters, and either the admin or user role.

**Source**

Use Case UC-06: Manage User Accounts

**Priority**

Priority Level 1: Desired functionality

### FR-USER-02: Edit Accounts

**Description**

The system should allow admins to edit usernames, email addresses, roles, active status, and passwords for existing accounts.

**Source**

Use Case UC-06: Manage User Accounts

**Priority**

Priority Level 1: Desired functionality

### FR-USER-03: Delete Accounts

**Description**

The system should allow admins to delete an account after an explicit confirmation.

**Source**

Use Case UC-06: Manage User Accounts

**Priority**

Priority Level 1: Desired functionality

### FR-USER-04: Prevent Administrator Lockout

**Description**

The system should prevent an admin from deleting, demoting, or deactivating their own account, and should prevent deletion or deactivation of the last active admin account.

**Source**

Use Case UC-06: Manage User Accounts

**Priority**

Priority Level 1: Desired functionality

### FR-SETTINGS-01: View and Reset Database

**Description**

The system should allow admins to view the database location and alumni table columns, and clear all alumni records only after an explicit confirmation.

**Source**

Use Cases UC-01 and UC-06: Sign In; Manage User Accounts

**Priority**

Priority Level 1: Desired functionality
