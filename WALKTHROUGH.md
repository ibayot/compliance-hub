# RICTMS Compliance Hub - User Walkthrough Guide

> **Release `v1.3.0.6` (2026-02-28):** KPI Dashboard is now a richer multi-line visualization. The Unit KPI Scores chart shows a separate colored trend line per unit across the selected time window — making it easy to compare performance trajectories side by side. The Unit Detail chart shows one colored line per KPI code, letting you spot which indicators are driving the unit score. Both tables now show a Color swatch (matching the chart color) and a Trend sparkline instead of the Band column. When you change the period filter the Unit Detail panel refreshes automatically. For months with no data the line has a gap rather than a fake zero. After running the seed you will see IT Unit data for all 12 months of 2025 and Finance Unit data for Feb–Aug 2025.
> **Release `v1.3.0.5` (2026-02-27):** KPI sparkline fix — the Trend column in the KPI Detail table now correctly shows diagonal lines. When no prior period data exists the sparkline starts from 0 and ascends to the current score. When both periods have data the line slopes up or down based on the actual change. The Band Distribution pie chart now shows the unit count as a bold white number inside each colored slice instead of external callout text.
> **Release `v1.3.0.4` (2026-02-28):** KPI Dashboard is cleaner and more informative. The Overall Score Card shows a neutral progress bar (no band color to avoid bias at aggregate level). The Band Scale now shows numeric ranges only. The Unit KPI Scores table has a full-cell color band column — click any row to drill in. The Unit Detail panel now shows a trend line chart (composite score over time, colored dots by band) instead of a per-KPI bar chart. The KPI breakdown table shows each KPI's Actual, Target, Score, a mini sparkline trend, and a color-block band. The in-app User Manual (`Dashboard → User Manual`) now includes a full KPI module section.
> **Release `v1.3.0.3` (2026-02-27):** KPI dashboard no longer throws NaN SQL errors on load. New frequency picker (Monthly/Quarterly/Semestral/Annual) lets you drill into any period. Band color legend appears below scorecards. Bar chart handles 7+ unit names with angled labels. 10 sample KPIs + 30 monitoring rows pre-loaded.
> **Release `v1.3.0.2` (2026-02-27):** KPI Dashboard is now immediately visible when opening `Dashboard → KPI` — no tab switching required. Graphs (unit score bars, KPI detail bars, band distribution pie) are the first thing you see. Click any unit row to drill into its KPI breakdown. The scorecard shows a color-coded progress bar representing the overall band.
> **Release `v1.3.0.1` (2026-02-27):** KPI button routing now navigates correctly to `/dashboard/kpi`. KPI dashboard now uses graph-based scorecards and unit performance visuals. Focal users can open KPI dashboards with unit-scoped visibility, while super-admin/reviewer users can view consolidated KPI data across units.

> **Release `v1.2.0.4` (2026-02-26):** New `Dashboard â†’ KPI` page introduces KPI Master (admin/compliance), KPI Monitoring input (admin/compliance), and KPI Dashboard (role-scoped by unit). Settings now supports editing existing users (name/unit/role/position/designation) while `staff_id` remains immutable. System Role Definitions now support add/edit metadata from Settings.

> Update (`v1.1.0-dev`, 2026-02-24): walkthrough now reflects blob-first upload and preview behavior for document versions.

> Patch (`v1.1.1-dev`, 2026-02-25): includes settings password/theme workflow, super-admin focal provisioning, and category-scoped issue-type behavior.

> **Release `v1.2.0.1` (2026-02-26):** Reportorial Document Types â€” go to Units, expand a unit accordion, use "Add" button to create document types with base name + frequency. On the Upload Document page, the unit is auto-filled (for focal users), and you select a document type from the per-unit list; the expected filename is shown before you pick a file. Metrics now use a "Reportorial Document Type" dropdown (instead of Unit+DocType free text). Settings â†’ User Management â†’ "Create New User" opens a dialog with a unit multi-select. Dashboard nav exact-match fix: navigating to Documents no longer highlights Dashboard. Breadcrumbs on Document Detail show the document title.

> **Hotfix `v1.1.2.3` (2026-02-25):** DOCX Document Viewer now works for newly uploaded DOCX files â€” on-demand HTML generation via mammoth ensures instant preview even when the background queue job hasn't run yet. Security: `passwordHash` is no longer exposed in API responses.

> **Hotfix `v1.1.2.2` (2026-02-25):** frontend dev server (`npm run dev`) now starts successfully. Root cause was a UTF-8 BOM added to `package.json` by an editor, causing Vite to crash with a JSON parse error. Fix applied; all walkthrough steps verified against running servers.

> **Release `v1.1.2` (2026-02-25):** Document Viewer now renders DOCX files as styled HTML inline (renamed from "Document Preview"). Document downloads return proper filenames. Reviews digital preview works for both HTML and PDF content types. Settings page reorganized into cards: Account Info, Theme, Change Password, Role Definitions (dynamic from API), and Focal User Management with activate/deactivate and change-role actions. User Manual has per-field explanations for all 8 modules including the new Settings & Role Management section.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Login & Authentication](#login--authentication)
3. [Dashboard Overview](#dashboard-overview)
4. [Document Management](#document-management)
5. [Metrics Template Builder (How-To)](#metrics-template-builder-how-to)
6. [QA Testing Workflow](#qa-testing-workflow)
7. [Issuances & References](#issuances--references)
8. [Tickets & Issues](#tickets--issues)
9. [User Manual Module](#user-manual-module)
10. [Settings & Focal Management](#settings--focal-management)
11. [User Roles & Permissions](#user-roles--permissions)
12. [Tips & Best Practices](#tips--best-practices)

---

## Getting Started

### First Time Access

1. **Open the Application**
   - Open your web browser (Chrome, Firefox, Edge, or Safari)
   - Navigate to: `http://localhost:3000` (or your deployed URL)

2. **Login Page**
   - You'll see the RICTMS Compliance Hub login screen
   - Enter your credentials
   - Click "Sign In"

### Default Credentials (Development Only)

If you ran the seed script during installation:
- **Username**: `admin`
- **Password**: `Admin123!`

> âš ï¸ **Important**: Change the default password immediately after first login in production environments!

---

## Login & Authentication

### Logging In

1. **Enter Credentials**
   ```
   Username: your_username
   Password: your_password
   ```

2. **Click Sign In**
   - If credentials are correct, you'll be redirected to the dashboard
   - Your session will remain active for 30 minutes

3. **Session Management**
   - The system automatically refreshes your session while you're active
   - If inactive for too long, you'll be logged out for security

### Logging Out

1. Click your **username** in the top-right corner
2. Select **"Logout"** from the dropdown menu
3. You'll be redirected to the login page

---

## Dashboard Overview

After logging in, you'll see the main dashboard with key information:

### Dashboard Components

#### 1. Statistics Cards

| Card | Description |
|------|-------------|
| **Total Documents** | Total number of documents in the system |
| **Compliant Documents** | Documents that passed all compliance checks |
| **Pending Documents** | Documents awaiting processing or review |
| **Open Tickets** | Active support/issue tickets |

#### 2. Compliance Rate

- Displayed as a percentage
- Formula: (Compliant Documents Ã· Total Documents) Ã— 100
- Green indicator: Good compliance (>80%)
- Yellow indicator: Needs improvement (60-80%)
- Red indicator: Critical (<60%)

#### 3. Recent Documents Table

- Shows the 5 most recently uploaded documents
- Displays: Title, Type, Period, Year, Status
- Click on any document to view details

#### 4. Quick Actions

- **Upload Document**: Shortcut to upload new documents
- **View All Documents**: Navigate to the documents page
- **Manage Tickets**: Go to the tickets page
- **View Issuances**: Access the reference library

---

## Document Management

### Uploading Documents

> For focal users, upload choices are assignment-driven. Only active assigned report types are available per cycle.

#### Step 1: Navigate to Upload Page

1. From the dashboard, click **"Documents"** in the sidebar
2. Click the **"Upload Document"** button (top-right)

#### Step 2: Fill in Document Information

Complete the following fields:

| Field | Description | Required | Example |
|-------|-------------|----------|---------|
| **Title** | Document name | Yes | "IT Security Policy 2024" |
| **Document Type** | Category of document | Yes | Policy, Report, Manual, SOP, Checklist |
| **Period** | Reporting period | Yes | Q1, Q2, Q3, Q4, Monthly, Annual |
| **Year** | Document year | Yes | 2024 |
| **Unit** | Organizational unit | Yes | IT Unit, Finance, HR, Legal, Operations |
| **File** | PDF or DOCX file | Yes | Maximum 50MB |

For assignment-governed focal uploads:
- Document Type and Unit are filtered from active assignments.
- One submission per assigned report type per period/year cycle is enforced.
- If configured, expected filename format is shown before upload.

#### Step 3: Submit

1. Click **"Choose File"** to select your document
2. Wait for the file to upload (progress bar will show)
3. Review all information
4. Click **"Upload"** button
5. You'll see a success message when complete

### Viewing Documents

#### Documents List Page

1. Click **"Documents"** in the sidebar
2. You'll see a table with all documents:
   - Title
   - Type
   - Period/Year
   - Unit
   - Status
   - Actions

#### Status Indicators

| Status | Color | Meaning |
|--------|-------|---------|
| **Pending** | Gray | Awaiting processing |
| **Processing** | Blue | Currently being analyzed |
| **Ready** | Green | Processed and available |
| **Failed** | Red | Processing error occurred |

Workflow clarification:
- `Ready` indicates compliance-approved and linkable documents.
- `Pending` includes newly extracted documents awaiting manual review and documents returned after non-compliant/needs-revision decisions.
- Super Admin/Compliance view: `Pending` and `Compliant` (returned items are hidden from their list).
- Focal view: `Submitted` â†’ `Under Review` â†’ `Returned/Compliant`.

#### Filtering Documents

1. Use the **filter controls** at the top of the page
2. Filter by:
   - **Unit**: Select specific organizational unit
   - **Document Type**: Filter by Policy, Report, etc.
   - **Status**: Show only pending, ready, etc.
   - **Search**: Search by title or keywords

#### Viewing Document Details

1. Click on any **document title** in the table
2. You'll see:
   - Document metadata
   - Current version information
   - Version history
   - Compliance metrics (if processed)
   - Manual review status
   - Preview (if available)

### Document Versions

#### Understanding Versions

- Each document can have multiple versions
- Version 1 is created when you first upload
- Create new versions when updating the document
- All versions are retained for history

#### Creating a New Version

1. Go to the document detail page
2. Scroll to the **"Versions"** section
3. Click **"Upload New Version"**
4. Select your updated file
5. Optionally add **change notes** explaining what changed
6. Click **"Upload Version"**

#### Comparing Versions

1. On the document detail page, find the **"Versions"** section
2. Select two versions you want to compare
3. Click **"Compare"** button
4. View the differences:
   - Added content (green highlight)
   - Removed content (red highlight)
   - Modified content (yellow highlight)
   - Similarity score percentage

### Downloading Documents

1. Navigate to the document detail page
2. In the **Versions** section, find the version you want
3. Click the **"Download"** button next to that version
4. File will download to your browser's download folder

---

## Metrics Template Builder (How-To)

The Metrics module allows admins/reviewers to define automated compliance checks by unit and report type.

### Who can manage templates

- `super_admin`
- `reviewer`

### Create a metrics template

1. Go to **Administration â†’ Metrics**.
2. Click **Create Template**.
3. Fill in:
    - Template name
    - Metric type
    - Weight
    - Optional unit and document type scope
4. Configure rule details by metric type.
5. Click **Save**.

### Metric Type Guide

#### 1) Section Rules
- Use when documents must include required sections.
- Enter required headings (comma/newline separated).
- Example sections: `Introduction`, `Findings`, `Recommendations`.

#### 2) Keyword Rules
- Use when documents must include target keywords.
- Set minimum match count.
- Optional toggles:
   - Case sensitive
   - Whole-word matching

#### 3) Number Extraction
- Use when one or more numbers near one or more keywords must satisfy thresholds.
- Example:
   - Keywords: `total incidents`, `resolved incidents`
   - Comparison: `>=`
   - Expected Numbers: `1`, `1`

#### 4) Date / Deadline Check
- Use to validate timeliness of submissions.
- Configure:
   - **Submission Frequency**: monthly / quarterly / annual / custom
   - **Deadline Day**: 1-28
   - **Deadline Month Offset**: how many months after period end
   - **Max Allowed Days Late**
   - **Submission Month** (annual only)

### Submission Frequency examples

| Frequency | Example Period | Interpretation |
|---|---|---|
| Monthly | `2026-01` | January period |
| Quarterly | `Q1` or `2026-Q1` | Quarter 1 period |
| Annual | `2026` | Annual period |
| Custom | Any custom period text | Uses configured fallback rules |

For `custom` frequency templates, configure:
- Custom regex pattern
- Year capture group index
- Month capture group index
- Fallback month

---

## QA Testing Workflow

Use this quick QA run every time there is a metrics/reviews/tickets update.

### A. Metrics QA

1. Create one template for each type.
2. Edit each template and verify values persist.
3. Confirm template appears under the correct tab.

### B. Date/Deadline QA

1. Create date-check templates for monthly, quarterly, annual frequencies.
2. Validate deadline settings are saved.
3. Confirm no validation errors when values are within allowed ranges.

### C. Reviews QA

1. Open **Dashboard â†’ Reviews**.
2. Click **Review** on a `ready` document.
3. Verify inline digital viewer loads.
4. Tag as compliant/non-compliant/needs revision and submit.

### D. Tickets QA

1. Create a ticket with `issue_type`.
2. Open details and set `resolution_steps` and `resolution_date`.
3. Save and refresh; verify values persist.

### E. Security/Operational QA Quick Check

1. Submit repeated API calls and verify rate-limit response appears after threshold.
2. Verify privileged actions (metrics create/update/delete, ticket updates, review submits) are logged in backend output.
3. Ensure startup fails fast if required backend environment variables are missing.

### Full checklist reference

For a detailed QA checklist, use [QA-USER-MANUAL.md](QA-USER-MANUAL.md).

---

## Issuances & References

The Issuances module maintains a library of regulatory references (laws, executive orders, memoranda, etc.).

### Document Mapping (Compliance/Super Admin)

1. Open **Issuances** from the sidebar.
2. Click the **link** icon on an issuance row to open the mapping manager.
3. Review currently linked documents under **Linked Documents**.
4. Use **Search Documents** to find a document by title/type/unit.
5. Click **Link** to create a mapping or **Unlink** to remove one.

Expected behavior:
- Mapping writes to the `document_issuances` link table.
- Compliance and super-admin roles can perform link/unlink operations.
- Only `ready` documents can be linked to issuances.
- Other roles can view issuance data in read-only mode.

### Document-to-Document Mapping

1. Open **Documents** and select a document.
2. In the document details page, open **Map References**.
3. Select a target document from the ready/compliant list.
4. Create or remove links as needed.

Expected behavior:
- Mapping writes to the `document_references` link table.
- Both source and target documents must be `ready`.
- Incoming and outgoing references are shown in the mapping dialog.
- Linked documents cannot be deleted until references are removed.

### Viewing Issuances

1. Click **"Issuances"** in the sidebar
2. You'll see a table of all issuances with:
   - Issuance Number (e.g., RA-11032)
   - Title
   - Issuing Authority
   - Issue Date
   - Effectivity Date
   - Status (Active/Inactive)

### Creating a New Issuance

#### Who Can Create

- Admin users only

#### Steps

1. Click **"Add Issuance"** button
2. Fill in the form:

| Field | Description | Example |
|-------|-------------|---------|
| **Issuance Number** | Official reference number | RA-11032, EO-002 |
| **Title** | Full title of the issuance | Ease of Doing Business Act |
| **Issuing Authority** | Government body that issued it | Congress of the Philippines |
| **Issue Date** | Date when issued | 2018-05-28 |
| **Effectivity Date** | Date when it took effect | 2018-06-15 |
| **Description** | Brief summary | An act promoting ease of doing business... |
| **Source URL** | Link to official gazette | https://www.officialgazette.gov.ph/... |

3. Click **"Save"**

### Linking Documents to Issuances

1. Go to the document detail page
2. Find the **"Referenced Issuances"** section
3. Click **"Link Issuance"**
4. Select the issuance from the dropdown
5. Click **"Link"**

This helps track which documents comply with which regulations.

### Editing/Deactivating Issuances

1. On the issuances list page
2. Find the issuance you want to modify
3. Click the **"Edit"** icon (pencil)
4. Make your changes
5. To deactivate (for superseded regulations):
   - Uncheck **"Is Active"**
   - Click **"Save"**

---

## Tickets & Issues

The Tickets module helps track compliance issues, technical problems, and general support requests.

### Viewing Tickets

1. Click **"Tickets"** in the sidebar
2. You'll see all tickets with:
   - Ticket ID
   - Subject
   - Category
   - Priority
   - Status
   - Assigned To
   - Created Date

### Ticket Statuses

| Status | Color | Meaning |
|--------|-------|---------|
| **Open** | Blue | Newly created, not yet worked on |
| **In Progress** | Yellow | Currently being addressed |
| **Resolved** | Green | Issue fixed, awaiting confirmation |
| **Closed** | Gray | Confirmed resolved, archived |

### Priority Levels

| Priority | Color | Response Time |
|----------|-------|---------------|
| **Urgent** | Red | Immediate attention |
| **High** | Orange | Within 1 business day |
| **Medium** | Yellow | Within 3 business days |
| **Low** | Blue | Within 1 week |

### Creating a Ticket

#### Step 1: Click "Create Ticket"

1. Go to the Tickets page
2. Click **"Create Ticket"** button (top-right)

#### Step 2: Fill in Ticket Details

| Field | Description | Required |
|-------|-------------|----------|
| **Subject** | Brief description of the issue | Yes |
| **Description** | Detailed explanation | Yes |
| **Category** | Type of issue | Yes |
| **Priority** | Urgency level | Yes |
| **Unit** | Related organizational unit | Optional |
| **Document** | Related document (if applicable) | Optional |

#### Categories

- **Compliance**: Issues with regulatory compliance
- **Content**: Problems with document content
- **Format**: Formatting or structure issues
- **Technical**: System or technical problems
- **Other**: General inquiries or requests

#### Step 3: Submit

1. Review all information
2. Click **"Create Ticket"**
3. Note the ticket ID for reference

### Viewing Ticket Details

1. Click on any ticket in the list
2. You'll see:
   - Full ticket information
   - Status history
   - All comments/discussion
   - Related document (if linked)
   - Assigned reviewer

### Adding Comments

1. On the ticket detail page
2. Scroll to the **"Comments"** section
3. Type your comment in the text box
4. Click **"Add Comment"**
5. All users watching the ticket will see your comment

### Updating Ticket Status

#### For Assigned Reviewers

1. On the ticket detail page
2. Find the **"Status"** dropdown
3. Select the new status:
   - **In Progress**: When you start working on it
   - **Resolved**: When you've fixed the issue
   - **Closed**: When confirmed resolved
4. Status updates automatically

### Filtering Tickets

Use the filter controls to find tickets:

- **Status Filter**: Show only open, in progress, etc.
- **Priority Filter**: Filter by urgency
- **Category Filter**: Show specific types
- **Unit Filter**: Show tickets for specific units
- **Search**: Search by subject or description

---

## User Manual Module

The system includes an in-app visual user manual that is role-aware.

### Accessing the Module

1. Click **User Manual** in the sidebar.
2. Review the role-specific cards and quick guidance.
3. Use the referenced module paths to navigate to allowed features.

Expected behavior:
- Content visibility aligns with your role permissions.
- Guidance is presented in-app for operational onboarding.

---

## Settings & Focal Management

### Theme and Password Settings

1. Open **Settings** from the sidebar.
2. Under **Theme Preference**, toggle Light/Dark mode.
3. Under **Change Password**, enter:
   - Current Password
   - New Password
   - Confirm New Password
4. Click **Update Password**.

Expected behavior:
- Theme preference applies immediately and persists for your browser session history.
- Password update requires correct current password and matching new password confirmation.

### Super Admin: Create Focal Accounts

If logged in as `super_admin`, Settings includes **Focal User Management**.

1. Fill in required account fields:
   - Email
   - Temporary Password
   - Role (`FOCAL` or `TECHNICIAN`)
2. Fill in profile fields as needed:
   - First, Middle, Last, Suffix
   - Staff ID
   - Position
   - Designation
3. Click **Create Focal User**.

Expected behavior:
- New account is created and appears in **Existing Focal Accounts**.
- Role and staff metadata are visible in the account card list.

### Ticket Category â†’ Issue Type Dependency

In ticket create and ticket detail update workflows:

1. Select **Category** first.
2. Open **Issue Type**.

Expected behavior:
- Issue type options are filtered to those mapped to the selected category.
- Changing category clears previous incompatible issue-type selection.

---

## User Roles & Permissions

### Role Descriptions

#### Admin
**Full system access** - Can do everything:
- âœ… Manage users
- âœ… Upload documents
- âœ… Review documents
- âœ… Manage issuances
- âœ… Create and resolve tickets
- âœ… View all analytics
- âœ… Configure system settings

#### Reviewer
**Review and approve documents**:
- âœ… Upload documents
- âœ… Review and rate documents
- âœ… Approve or request changes
- âœ… Create issuances (limited)
- âœ… Resolve tickets
- âœ… View analytics for their unit
- âŒ Cannot manage users
- âŒ Cannot access system settings

#### Viewer
**Read-only access**:
- âœ… View documents
- âœ… Download documents
- âœ… View issuances
- âœ… View tickets
- âœ… Create tickets (for issues)
- âŒ Cannot upload documents
- âŒ Cannot review or approve
- âŒ Cannot modify issuances
- âŒ Cannot resolve tickets

### Checking Your Role

1. Look at the **top-right corner** of the page
2. Click on your **username**
3. Your role will be displayed in the dropdown

---

## Tips & Best Practices

### Document Management

#### âœ… DO:
- **Use descriptive titles**: "Q1 2024 Financial Audit Report" instead of "Report1"
- **Select correct document type**: Helps with filtering and compliance rules
- **Keep files organized**: One document per file, don't bundle multiple documents
- **Upload promptly**: Upload documents as soon as they're finalized
- **Add change notes**: When creating new versions, explain what changed

#### âŒ DON'T:
- Upload unfinished/draft documents to the main system
- Use generic filenames like "document.pdf"
- Upload documents in the wrong unit
- Create new documents when you should create a new version
- Upload password-protected files (system can't process them)

### Compliance Best Practices

1. **Regular Reviews**
   - Check dashboard daily for pending items
   - Review compliance metrics weekly
   - Address failed metrics promptly

2. **Metric Understanding**
   - **Completeness Score < 85%**: Document missing required sections
   - **Compliance Citation < 90%**: Missing references to regulations
   - **Format Compliance < 95%**: Formatting doesn't meet standards
   - **Document Age > 365 days**: Time for policy review

3. **Response Times**
   - Address urgent tickets within 4 hours
   - Review documents within 2 business days
   - Update ticket status when starting work
   - Close resolved tickets promptly

### Ticket Management

#### Creating Effective Tickets

1. **Good Subject Lines**
   - âœ… "Missing RA-10173 citation in IT Security Policy"
   - âŒ "Problem with document"

2. **Clear Descriptions**
   ```
   Good Example:
   "The IT Security Policy (doc-001) is missing a required 
   citation to RA-10173 (Data Privacy Act) in Section 4.2. 
   This section discusses personal data handling but does 
   not reference the legal basis."
   
   Bad Example:
   "Document needs fixing"
   ```

3. **Attach Context**
   - Link the related document
   - Specify the section or page number
   - Add screenshots if helpful

#### Following Up on Tickets

- Check ticket status daily
- Respond to questions within 24 hours
- Confirm resolution before closing
- Thank the resolver when closing

### Search & Navigation Tips

1. **Quick Search**
   - Use the search box to find documents quickly
   - Search works on title, document ID, and metadata
   - Use filters to narrow results

2. **Keyboard Shortcuts** (if implemented)
   - `Ctrl + /` or `Cmd + /`: Focus search box
   - `Esc`: Close dialogs
   - `Ctrl + S` or `Cmd + S`: Save forms

3. **Breadcrumbs**
   - Use breadcrumbs at the top to navigate back
   - Don't use browser back button (may lose unsaved data)

### Performance Tips

1. **File Sizes**
   - Keep documents under 20MB when possible
   - Compress large PDF files before uploading
   - Use OCR'd PDFs for better text extraction

2. **Browser Performance**
   - Use Chrome or Firefox for best performance
   - Clear browser cache if pages load slowly
   - Enable JavaScript (required for the application)

### Security Best Practices

1. **Password Management**
   - Use strong passwords (12+ characters)
   - Include uppercase, lowercase, numbers, and symbols
   - Change password every 90 days
   - Don't share your credentials

2. **Session Security**
   - Always log out when leaving your workstation
   - Don't save password in public computers
   - Use a password manager for secure storage

3. **Data Sensitivity**
   - Only upload appropriate documents
   - Be aware of Data Privacy Act requirements
   - Don't share sensitive information via tickets
   - Report suspicious activity to administrators

### Troubleshooting Common Issues

#### Upload Fails

**Problem**: "Upload failed" error message

**Solutions**:
1. Check file size (must be < 50MB)
2. Ensure file format is PDF or DOCX
3. Try a different browser
4. Check your internet connection
5. Contact support if persists

#### Can't See Document

**Problem**: Document appears in list but can't open details

**Solutions**:
1. Check if you have permission (role)
2. Try refreshing the page (F5)
3. Clear browser cache
4. Contact administrator

#### Slow Performance

**Problem**: Pages load slowly

**Solutions**:
1. Check internet speed
2. Close other browser tabs
3. Clear browser cache and cookies
4. Try a different browser
5. Check system status with IT

#### Metrics Not Calculating

**Problem**: Document processed but no metrics shown

**Solutions**:
1. Check document status (must be "Ready")
2. Wait 5-10 minutes (processing may take time)
3. Refresh the page
4. Check if document has linked issuances
5. Contact support if metrics don't appear after 30 minutes

---

## Getting Help

### Support Channels

1. **Create a Ticket**
   - Use the Tickets module for system issues
   - Select "Technical" category
   - Provide detailed information

2. **Contact Administrator**
   - Email: admin@rictms.gov.ph
   - Include your username and issue description

3. **Check Documentation**
   - README.md: Project overview
   - CAPABILITIES.md: Feature list
   - INSTALLATION.md: Setup guide
   - CHANGELOG.md: Recent updates

### Common Questions

**Q: How long does document processing take?**
A: Usually 2-5 minutes for standard PDFs. Large or scanned documents may take up to 15 minutes.

**Q: Can I delete a document?**
A: Operational workflow uses **Return** instead of delete. Super admin/compliance can return only pending documents to focal users with mandatory remarks; records are preserved for audit.

**Q: What happens to old versions?**
A: All versions are retained for audit purposes. You can view any historical version anytime.

**Q: How do I export reports?**
A: Export functionality is planned for a future release. Currently, you can screenshot or print pages.

**Q: Can I receive email notifications?**
A: Email notifications are planned for a future release. Check the dashboard regularly for updates.

---

## Glossary

| Term | Definition |
|------|------------|
| **Compliance Rate** | Percentage of documents that meet all compliance requirements |
| **Document Type** | Category of document (Policy, Report, Manual, SOP, Checklist) |
| **Issuance** | A law, executive order, memorandum, or regulation |
| **Metric** | A measurable standard used to evaluate compliance |
| **Period** | Reporting timeframe (Q1, Q2, Q3, Q4, Monthly, Annual) |
| **Unit** | Organizational unit or department |
| **Version** | A specific iteration of a document |
| **Ticket** | A tracked issue or support request |
| **Status** | Current state of a document or ticket |

---

**Need more help?** Contact your system administrator or create a support ticket!

---

*Last Updated: Document created for RICTMS Compliance Hub*
