# Reimbursement Management App — Master Product Specification

**The Placement Cell, SRCC — Finance & Strategy Department**
Version 1.0

---

## 1. Overview & Purpose

This document is the single source of truth for the Reimbursement Management App built for the Finance & Strategy (FnS) department of The Placement Cell, SRCC. It captures every workflow, role, rule, and UI requirement agreed upon during the specification process.

The app replaces the current manual reimbursement process — where bills are tracked on paper sheets and managed across WhatsApp and physical handovers — with a unified digital platform accessible to all JCs, SCs, and FnS.

---

## 2. Organisation & Role Structure

### 2.1 People

| Role | Count | Description |
|------|-------|-------------|
| Junior Coordinator (JC) | ~50 | Volunteer in company processes; submit expense bills |
| Senior Coordinator (SC) | ~15 | Permanently assigned to specific companies; head processes; reimburse JCs |
| FnS JC | 7 | Also a regular JC — can participate in company processes AND has access to FnS admin portal via shared FnS account |
| FnS SC | ~2–3 | Also a regular SC with their own company assignments — same FnS portal permissions as FnS JCs; no elevated distinction within the portal |

### 2.2 Role Clarifications

- FnS JCs have a dual identity: they can submit bills as regular JCs AND access the FnS admin portal through one shared FnS Google account.
- FnS SCs are treated as normal SCs in the app. They have their own SC login and separately use the shared FnS account for admin work.
- There is NO permission distinction between FnS JCs and FnS SCs within the FnS portal — all FnS members share identical portal access.
- SCs are permanently assigned to specific companies for the entire placement season (not per-process).
- One SC can head multiple concurrent company processes.

### 2.3 FnS POC Assignments

Each FnS JC is the point of contact (POC) for a subset of SCs. This assignment is flexible and manually managed — it is NOT enforced by the app. The FnS portal gives a full view of all SCs and all bills regardless of POC assignment.

---

## 3. Bill Lifecycle & Reimbursement Flow

### 3.1 End-to-End Flow

| Step | Actor | Action |
|------|-------|--------|
| 1 | JC / SC | Incurs an expense during a company process (or general departmental expense) |
| 2 | JC / SC | Submits bill details + uploads photo/PDF via the app |
| 3 | SC | Physically receives the original paper bill from the JC (mandatory) |
| 4 | SC | Marks physical bill as received in the app; marks each JC bill as reimbursed (per bill) once paid via UPI |
| 5 | SC | Accumulates all bills across their processes over the month |
| 6 | SC → FnS | Hands over physical bills to their FnS POC JC at month-end |
| 7 | FnS | Collates all bills, reviews them in the app, exports CSV report |
| 8 | FnS → Admin | Submits serialised CSV report to Admin Office to receive funds |
| 9 | FnS → SC | Reimburses SCs via UPI (tracked offline — not in the app) |

### 3.2 Bill Submission Rules

- Every bill must have: date, vendor, unique bill number, category, sub-category, process type, amount, and an uploaded image or PDF.
- The app auto-detects and logs the submitter (JC or SC) from their login session.
- Company name is required EXCEPT for general/non-company bills.
- Physical bill handover to the SC is COMPULSORY for all paper bills — the digital upload does not replace the physical copy.
- There are NO submission deadlines enforced by the app.

### 3.3 Who Can Submit Bills

| Bill Type | Who Can Submit |
|-----------|---------------|
| Company process bill | Any JC or SC |
| General / non-company bill | SCs and FnS members only (not regular JCs) |

### 3.4 Bill Rejection & Voiding

- An SC can reject any bill submitted by a JC where that SC is selected on the bill.
- Rejection must include a reason/note written by the SC.
- Rejected bills remain visible to the JC, clearly marked as 'Rejected' with the SC's note.
- Rejected bills are excluded from FnS's reimbursement workflow — FnS does not concern itself with rejected bills.
- There is no appeals process in the app — rejection is final.
- FnS can void any bill (soft-delete): the bill is hidden from all JC/SC views and excluded from exports, but the data is retained in the DB. No bills are ever hard-deleted.

### 3.5 Reimbursement Tracking

- SC → JC reimbursement is tracked per individual bill (not per JC or per process).
- Each bill has a 'Reimbursed by SC' checkbox that the SC marks once they have paid the JC via UPI.
- When an SC marks a bill as reimbursed, this status is immediately visible to the JC.
- FnS → SC reimbursement is handled entirely offline (cash or UPI) and is NOT tracked in the app.

---

## 4. User Roles, Views & Permissions

### 4.1 Login System

- Authentication uses **Google OAuth login**.
- Login is whitelist-gated by email — only users whose Google-account email is pre-registered by FnS in the backend can log in. Self-signup is not permitted; any login attempt from an account not in the whitelist is rejected.
- The FnS portal is accessed via one shared FnS account — all FnS members use this single login.
- Upon login, users are automatically directed to the correct view based on their account's role.
- Users not in the whitelist see an "Access denied — contact FnS" screen.

### 4.2 User Account Management

- FnS manages all user accounts via an in-app user management panel (which writes to Supabase).
- FnS adds all JC and SC accounts at the start of the academic year.
- FnS removes/deactivates accounts as people leave.
- The system resets at the start of each academic year — old data is not carried over (the exported CSV serves as the historical record).

### 4.3 JC View

**Tab: Submit Bill**
- Access to the bill submission form (see Section 5).

**Tab: My Bills**
- List of all bills the JC has submitted, newest first.
- Summary banner: total amount pending reimbursement and total amount reimbursed to date.
- Each bill shows: date, vendor, company, amount, category, and two status indicators:
  - Physical Bill Received — marked by the SC (read-only for JC)
  - Reimbursed — marked by the SC (read-only for JC)
- Rejected bills are visible and clearly marked with the SC's rejection reason.

### 4.4 SC View

**Tab: Submit Bill**
- Same as JC form, with the addition of a "General / Non-Company Bill" toggle (hides Company, SC, and Process Type fields).

**Tab: My Bills**

A single unified bill list with a filter bar. SCs can filter to see any subset of their bills — there are no forced separate sections.

Filter options available to SC:
- Submitted by: "JCs" / "Myself" / "All"
- Bill type: "Company" / "General" / "All"
- Status: Physical Received, Reimbursed, Rejected, Pending
- Company, Process Type, Category, Date Range

Actions available on bill cards (only on JC-submitted bills where this SC is selected):
- Mark 'Physical Bill Received'
- Mark 'Reimbursed' (enabled only after Physical Received is checked)
- Reject with mandatory reason/note

Bills submitted by the SC themselves are view-only (no action buttons).

### 4.5 FnS View (Shared Account)

**Tab: All Bills**
- Full view of all non-voided bills across all SCs, JCs, and companies.
- Filterable by: SC, JC, company, process type, category, sub-category, date range, vendor, reimbursement status, month.
- FnS can edit any field on any bill.
- FnS can void any bill (sets `is_voided = true`; hidden from all other views).
- Voided bills are shown with a visual indicator in FnS's own view.

**Tab: Export**
- Apply filters (by SC, JC, company, process type, category, sub-category, cycle, date range, reimbursement status) and select columns before exporting.
- Export format is Excel (.xlsx), in a custom column format to be finalised.
- Serial numbers are auto-assigned chronologically at export time based on the filtered set.
- **Deferred feature — Reimbursement Sheet:** A richer Excel export containing all bills, all fields, plus pre-built categorised tables and SC-wise summary tables. Not a priority for the initial build; to be designed and implemented in a later phase.

**Tab: User Management**
- Add, remove/deactivate, and edit registered user accounts and their roles (JC / SC).
- Set each user's email, role, and active status.

**Tab: Cycles**
- FnS creates and manages reimbursement cycles. Each cycle has a name, start date, and end date.
- FnS sets a cycle as Active or Closed. Only one cycle can be Active at a time.
- Bills are automatically associated with the cycle that is active at the time of submission.
- JCs and SCs see only bills from the current active cycle by default; a "View Historical Bills" toggle lets them access bills from past cycles.

**Tab: Dropdowns**
- Single consolidated tab for managing all dropdown data used in the bill form.
- Sections: Companies, Vendors, Categories & Sub-Categories, Process Types.
- Each section supports: Add, Edit name, and Deactivate (deactivated items are hidden from bill form dropdowns but retained in DB so historical bills are unaffected).
- Categories are expandable to show their sub-categories; both levels support Add, Edit, and Deactivate.

---

## 5. Bill Submission Form

The form is the primary data entry point for all users. All fields are required unless the conditional logic below applies.

| Field | Type | Notes |
|-------|------|-------|
| Date of Bill | Date picker | Date on the physical bill/invoice |
| Vendor | Dropdown | Managed by FnS via Dropdowns tab |
| Unique Bill Number | Text input | The printed number on the bill/invoice |
| Company Name | Dropdown | Required for company bills; hidden for general bills. Managed by FnS via Dropdowns tab. |
| SC Name | Dropdown | Independent dropdown of all active SCs; required for company bills; hidden for general bills |
| Category | Dropdown | Managed by FnS via Dropdowns tab |
| Sub-Category | Dependent dropdown | Options depend on selected Category; managed by FnS |
| Process Type | Dropdown | Options managed by FnS via Dropdowns tab; stored in backend |
| Amount | Number input | In INR |
| Bill Upload | File upload | Camera capture OR file picker — JPG/PNG/PDF |
| Submitter | Auto-detected | Pulled from login session — not editable by user |

**Conditional field logic:**
- Regular JC: Company Name, SC Name, and Process Type are always shown and required. No general bill option.
- SC / FnS: A "General / Non-Company Bill" toggle is available. When ON, Company Name, SC Name, and Process Type are hidden and stored as NULL.
- SC Name is an independent dropdown listing all active SCs — it is not filtered by Company selection. The JC selects both fields independently.

**Future consideration (not in current scope):** Bill photos could be stored on Google Drive with standardised naming, with the Drive link stored in Supabase rather than using Supabase Storage. To be evaluated in a later phase.

---

## 6. Excel Export

### 6.1 Purpose

The Excel export generates the serialised bill report that FnS submits to the Admin Office to receive reimbursement funds. It replaces the manual reimbursement sheet.

### 6.2 Who Can Export

- FnS portal (shared account) — full export with all filters.
- SCs — can export their own bill data only.

### 6.3 Export Format

- Output is an Excel file (.xlsx), not CSV.
- The exact column layout and sheet format will be defined by FnS in a later phase (to match the Admin Office's required format).
- The following columns are the current baseline and may be adjusted:

| Column | Description |
|--------|-------------|
| Serial Number | Auto-assigned chronologically at time of export |
| Date | Date on the bill |
| Bill Number | Unique number from the physical bill/invoice |
| Category | e.g. Food |
| Sub-Category | e.g. Swiggy |
| SC to be Reimbursed | Name of the SC who heads the process |
| Company Name | Company associated with the bill (blank for general bills) |
| Process Type | e.g. Pre Placement Talk, Recruitment Process |
| Vendor | e.g. Blinkit, Local Print Shop |
| Amount (INR) | Bill amount |

### 6.4 Filters & Customisation Before Export

FnS can apply any combination of the following before exporting:

- By SC (one or multiple)
- By cycle
- By month / date range
- By company
- By process type
- By category / sub-category
- By reimbursement status
- Column selection — choose which fields to include in the export

The serial number is assigned after filtering — it reflects the chronological order of only the bills included in that specific export.

### 6.5 Deferred Feature — Reimbursement Sheet

A richer Excel export that goes beyond the flat bill list. Intended to be a comprehensive reference document containing:

- All bills, all fields
- Pre-built categorised summary tables (e.g. totals by category, by company)
- SC-wise breakdown tables

This is not a priority for the initial build. The format and structure will be designed by FnS in a later phase once the core export is working.

---

## 7. Data, Backend & System Details

### 7.1 Tech Stack

| Layer | Choice |
|-------|--------|
| Backend / DB | Supabase (PostgreSQL) |
| Auth | Google OAuth via Supabase Auth |
| Platform | Responsive web app — works equally well on mobile and desktop |
| File Storage | Supabase Storage (bill images and PDFs) |
| Builders | 6 FnS JCs (internal build) |

### 7.2 Annual Reset

- The system resets at the start of each academic year.
- Before reset, FnS exports the full CSV as the permanent historical record.
- Old bill data is wiped from the app — not archived within the system.
- User accounts are also refreshed at the start of each year by FnS.

### 7.3 Notifications

- No in-app or push notifications are required.
- Status changes (physical receipt marked, reimbursed, rejected) are visible when users next log in and check their dashboard.

### 7.4 Data Migration

- No historical data migration from previous manual sheets — the app starts fresh.
- Old reimbursement sheets remain on the manual system as historical records.

---

## 8. Key Design Decisions Log

| Decision | Rationale |
|----------|-----------|
| Physical bill handover remains mandatory despite digital upload | Admin office requires original physical bills |
| FnS → SC reimbursement not tracked in app | Handled offline; adds complexity without value |
| No physical-receipt checkbox for FnS JCs | FnS JCs receive too many bills — they won't tick them reliably; SC marks receipt only |
| Rejected bills remain visible with reason | JCs need to know why they weren't reimbursed |
| One shared FnS Google account | Simplifies access; FnS is a team function, not individual |
| Serial number auto-assigned at export time | Matches current manual serialisation workflow |
| No deadline enforcement in app | Placement Cell operates on trust and flexibility |
| No notifications | Overhead not justified for the team size |
| System resets annually | Each placement season is independent; CSV export preserves history |
| No bill deletion — FnS void only | Prevents accidental data loss; maintains full audit trail in DB |
| SC Name is an independent dropdown (not filtered by company) | Simpler UX; JC selects company and SC separately as independent fields |
| Process types stored in backend, editable by FnS | Allows flexibility without a code deploy; managed via Dropdowns tab |
| All dropdown data consolidated into one Dropdowns tab | Simpler FnS navigation; fewer tabs to manage |
| Google login with email whitelist | Lets users sign in with existing Google accounts while FnS controls access centrally |
| Google Drive bill storage deferred | Feasible future option; Supabase Storage is simpler for the initial build |
| Cycle-based bill visibility | JCs and SCs only see the current cycle's bills by default, reducing noise; historical access available via toggle |
| Export format is Excel (.xlsx), not CSV | Matches Admin Office requirements; allows richer formatting in future |
| Reimbursement Sheet deferred | High-complexity feature; core flat export must work first before building structured summary sheets |

---

## 9. Notes (Pending Items)

- Full list of **Categories and Sub-Categories** — to be fed into Supabase by FnS.
- Full list of **Vendors** — to be fed into Supabase by FnS; admin-configurable.
- Full list of **Companies** for the current placement season — to be fed into Supabase by FnS; admin-configurable.
- **Exact Supabase schema design** (tables, relationships, RLS policies) — drafted in Section 11; to be finalised and implemented.

---

## 10. Frontend App Flow

### 10.1 Architecture Overview

The app is a **single-page web application (SPA)** with tab-based navigation. There is no multi-page routing — all views live within one shell. On login, the shell detects the user's role and renders the appropriate tab set.

```
App Shell
├── Login screen (Google OAuth)
└── Post-login shell (role-aware)
    ├── JC Shell   → Tab: Submit Bill | Tab: My Bills
    ├── SC Shell   → Tab: Submit Bill | Tab: My Bills
    └── FnS Shell  → Tab: All Bills | Tab: Export | Tab: Users
                     Tab: Cycles | Tab: Dropdowns
```

### 10.2 Authentication Flow

Google login is whitelist-gated by email against the `users` table.

```
User visits app
  └─ Not logged in → Show login screen
       └─ Sign in with Google (Supabase Auth)

  After credential verification:
    └─ Check users table for matching email / google_id
         ├─ Not found / is_active = false → "Access denied – contact FnS" screen
         ├─ role = 'jc'  → Load JC Shell
         ├─ role = 'sc'  → Load SC Shell
         └─ role = 'fns' → Load FnS Shell
```

FnS pre-creates all accounts. Users cannot self-register — any auth attempt from an account not in the `users` table is blocked at the app layer after Supabase Auth succeeds.

### 10.3 JC Shell

**Tab: Submit Bill**

```
Form fields (all required):
  Date of Bill → Vendor → Bill Number → Company Name
    → SC Name (auto-filtered by company)
    → Process Type (fixed 4-item list)
    → Category → Sub-Category (auto-filtered by category)
    → Amount → Bill Upload (camera OR file picker)

On submit:
  1. Validate all fields client-side
  2. Upload file → Supabase Storage → receive file URL
  3. INSERT into bills table
  4. Show success confirmation with bill summary
  5. Reset form
```

**Tab: My Bills**

```
┌─ Summary banner: "₹X pending reimbursement | ₹Y reimbursed" ─────────────┐
│                                                                            │
│  Bill card (newest first)                                                  │
│  ├─ Vendor | Company | Date | Amount                                       │
│  ├─ Category / Sub-Category | Process Type                                 │
│  ├─ Status: [Physical Received ✓/✗] [Reimbursed ✓/✗]                     │
│  └─ If rejected: "Rejected — [SC's reason]" shown in red                  │
└────────────────────────────────────────────────────────────────────────────┘
```

### 10.4 SC Shell

**Tab: Submit Bill**

Same as JC form, plus a **"General / Non-Company Bill" toggle** at the top. When toggled ON: Company Name, SC Name, and Process Type fields are hidden and stored as NULL in the DB.

**Tab: My Bills**

```
Filter bar:
  Submitted by: [JCs] [Myself] [All]
  Bill type:    [Company] [General] [All]
  Status:       [Pending] [Physical Received] [Reimbursed] [Rejected]
  Company / Process Type / Category / Date Range

Bill list (filtered results, newest first):
  Bill card
  ├─ Submitter name | Vendor | Company | SC | Date | Amount
  ├─ Category / Sub-Category | Process Type
  ├─ Status chips
  └─ Actions (only on JC-submitted bills where sc_id = this SC):
       ├─ [ ] Physical Bill Received
       ├─ [ ] Reimbursed  (disabled until Physical Received is checked)
       └─ [Reject] → modal with mandatory reason field → confirm
```

Bills submitted by the SC themselves show no action buttons.
```

### 10.5 FnS Shell

**Tab: All Bills**

```
Filter bar: SC | JC | Company | Process Type | Category | Sub-Category
            Date Range | Vendor | Status | Month

Bill table (all non-voided bills):
  ├─ All bill fields displayed
  ├─ [Edit] → opens edit modal (all fields editable, including status fields)
  └─ [Void] → confirmation prompt → sets is_voided = true
                (voided bills shown greyed-out in FnS view only)
```

**Tab: Export**

```
Filter panel: SC | JC | Cycle | Company | Process Type | Category | Date Range | Status
Column selector: choose which fields to include
  └─ Preview: "N bills | Total: ₹X"
       └─ [Export Excel] → assigns serial numbers in chronological order
                         → generates .xlsx → triggers browser download

[Reimbursement Sheet] button — DEFERRED, not in initial build
```

**Tab: User Management**

```
User list: name | email | role | login method | status
  ├─ [Add User] → form: name, email, role (JC/SC/FnS)
  ├─ [Edit]     → update any field
  └─ [Deactivate] → sets is_active = false (blocks login)
```

**Tab: Cycles**

```
Cycle list: name | start date | end date | status (Active / Closed)
  ├─ [New Cycle] → form: name, start date, end date → sets as Active
                    (previous Active cycle is automatically set to Closed)
  ├─ [Edit] → update name, dates
  └─ [Close Cycle] → marks cycle as Closed manually before end date if needed
```

**Tab: Dropdowns**

```
Sub-tabs or accordion sections: Companies | Vendors | Categories & Sub-Categories | Process Types

Each section:
  ├─ List of items: name | status (active/inactive)
  ├─ [Add item]
  ├─ [Edit name]
  └─ [Deactivate] → hidden from bill form; historical bills unaffected

Categories & Sub-Categories section:
  └─ Categories are expandable — each shows its child sub-categories
       Both levels support Add, Edit, and Deactivate independently
```

### 10.6 Key UI States to Handle

| Situation | Behaviour |
|-----------|-----------|
| SC tries to mark Reimbursed before Physical Received | Reimbursed checkbox is disabled |
| File upload fails | Inline error shown; form submission blocked |
| Bill file is a PDF | Show PDF icon preview rather than image thumbnail |
| FnS voids a bill | Disappears from JC/SC views; greyed out in FnS view |
| User not in whitelist attempts login | "Access denied — contact FnS" screen with contact info |
| JC's bill is rejected | Bill card prominently shows "Rejected" chip + SC's reason text |
| SC filters to "JCs" submitted bills | Action buttons (Physical Received, Reimbursed, Reject) visible on eligible cards |
| SC filters to "Myself" submitted bills | All cards are view-only, no action buttons |
| No active cycle exists at bill submission time | Bill is saved with `cycle_id = NULL`; FnS should be notified to create a cycle |
| JC/SC toggles "View Historical Bills" | Bills from all past cycles shown, grouped or labelled by cycle name |

---

## 11. Backend Integration Plan

### 11.1 Database Schema

**`users`**
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
google_id       text UNIQUE          -- NULL if email/password login only
email           text UNIQUE NOT NULL
name            text NOT NULL
role            text NOT NULL CHECK (role IN ('jc', 'sc', 'fns'))
is_active       boolean NOT NULL DEFAULT true
created_at      timestamptz NOT NULL DEFAULT now()
```

**`companies`**
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
name        text UNIQUE NOT NULL
is_active   boolean NOT NULL DEFAULT true
```

**`vendors`**
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
name        text UNIQUE NOT NULL
is_active   boolean NOT NULL DEFAULT true
```

**`categories`**
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
name        text UNIQUE NOT NULL
is_active   boolean NOT NULL DEFAULT true
```

**`sub_categories`**
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
category_id  uuid NOT NULL REFERENCES categories(id)
name         text NOT NULL
is_active    boolean NOT NULL DEFAULT true
UNIQUE (category_id, name)
```

**`process_types`**
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
name        text UNIQUE NOT NULL
is_active   boolean NOT NULL DEFAULT true
```

**`cycles`**
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
name        text NOT NULL
start_date  date NOT NULL
end_date    date NOT NULL
is_active   boolean NOT NULL DEFAULT false
created_at  timestamptz NOT NULL DEFAULT now()
```

> Only one cycle may have `is_active = true` at a time. Creating a new cycle automatically closes the previously active one.

**`bills`**
```sql
id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
submitted_by      uuid NOT NULL REFERENCES users(id)
sc_id             uuid REFERENCES users(id)           -- NULL for general bills
company_id        uuid REFERENCES companies(id)       -- NULL for general bills
vendor_id         uuid NOT NULL REFERENCES vendors(id)
category_id       uuid NOT NULL REFERENCES categories(id)
sub_category_id   uuid NOT NULL REFERENCES sub_categories(id)
process_type_id   uuid REFERENCES process_types(id)  -- NULL for general bills
bill_date         date NOT NULL
bill_number       text NOT NULL
amount            numeric(10,2) NOT NULL
file_url          text NOT NULL
is_general        boolean NOT NULL DEFAULT false
cycle_id          uuid REFERENCES cycles(id)     -- set at submission time; NULL if no active cycle
physical_received boolean NOT NULL DEFAULT false
is_reimbursed     boolean NOT NULL DEFAULT false
rejection_reason  text                               -- NULL = not rejected; non-NULL = rejected
is_voided         boolean NOT NULL DEFAULT false
submitted_at      timestamptz NOT NULL DEFAULT now()
updated_at        timestamptz NOT NULL DEFAULT now()
```

> `rejection_reason` doubles as the rejection flag — if non-NULL, the bill is considered rejected. A separate `is_rejected` boolean is not needed.

> `sc_company_assignments` table is not needed — SC Name is an independent field on the bill form with no company-based filtering.

### 11.2 Supabase Storage

- Bucket: `bill-uploads` (private)
- File path: `{submitted_by_user_id}/{YYYY}/{bill_id}.{ext}`
- Access: signed URLs generated server-side for viewing uploaded bills
- Accepted types: JPG, PNG, PDF
- Recommended max size: 10 MB per file

### 11.3 Row Level Security (RLS) Policies

| Table | Operation | Policy |
|-------|-----------|--------|
| `bills` | SELECT | JC: `submitted_by = auth.uid() AND is_voided = false`. SC: `(submitted_by = auth.uid() OR sc_id = auth.uid()) AND is_voided = false`. FnS: all rows. |
| `bills` | INSERT | Any authenticated user with `is_active = true` (role enforcement in app layer) |
| `bills` | UPDATE | SC: only `physical_received`, `is_reimbursed`, `rejection_reason` where `sc_id = auth.uid()`. FnS: all fields. JC: none. |
| `users` | SELECT | Own row only (JC/SC). All rows (FnS). |
| `users` | INSERT / UPDATE / DELETE | FnS only |
| `companies`, `vendors`, `categories`, `sub_categories`, `process_types` | SELECT | All authenticated users |
| `companies`, `vendors`, `categories`, `sub_categories`, `process_types` | INSERT / UPDATE | FnS only |
| `cycles` | SELECT | All authenticated users |
| `cycles` | INSERT / UPDATE | FnS only |

### 11.4 Key Data Operations

**Bill form initialisation:**
```
GET /companies       WHERE is_active = true                          → Company dropdown
GET /vendors         WHERE is_active = true                          → Vendor dropdown
GET /categories      WHERE is_active = true                          → Category dropdown
GET /sub_categories  WHERE is_active = true                          → loaded once, filtered client-side by category
GET /process_types   WHERE is_active = true                          → Process Type dropdown
GET /users           WHERE role = 'sc' AND is_active = true          → SC Name dropdown (independent)
GET /cycles          WHERE is_active = true                          → current cycle id (auto-attached to bill on submit)
```

**Bill submission:**
```
1. supabase.storage.from('bill-uploads').upload(path, file)
2. supabase.from('bills').insert({ ...fields, file_url })
```

**SC: mark physical received / reimbursed:**
```
supabase.from('bills').update({ physical_received: true }).eq('id', $id)
supabase.from('bills').update({ is_reimbursed: true }).eq('id', $id)
```

**SC: reject bill:**
```
supabase.from('bills').update({ rejection_reason: $reason }).eq('id', $id)
```

**FnS: void bill:**
```
supabase.from('bills').update({ is_voided: true }).eq('id', $id)
```

**CSV export:**
```
1. Fetch filtered bills with JOINs for user names, company name, vendor name, category, sub-category
2. Sort by bill_date ASC, submitted_at ASC
3. Assign serial numbers in-memory (1, 2, 3 …)
4. Generate CSV client-side (papaparse or manual)
5. Trigger browser file download
```

### 11.5 Annual Reset Procedure

This is a manual FnS-triggered operation, not automated:

1. FnS exports the full CSV from the Export tab (serves as the permanent archive).
2. A developer (or FnS admin) runs a reset script:
   - Truncate `bills` table.
   - Truncate or deactivate all `users` rows.
   - Truncate `sc_company_assignments`.
   - Empty the `bill-uploads` storage bucket.
3. FnS re-adds users and company/SC assignments via the User Management tab.
4. FnS updates the companies and vendors lists for the new season as needed.

> `categories` and `sub_categories` are generally stable across years and may not need to be reset. `process_types`, `vendors`, and `companies` should be reviewed and updated each season via the Dropdowns tab. Cycles do not need to be reset — old cycles are simply closed, and a new cycle is created for the new season.

### 11.6 Recommended Frontend Stack

| Concern | Recommendation | Reason |
|---------|---------------|--------|
| Framework | Next.js (App Router) | Best-in-class Supabase integration; easy deployment; familiar React DX |
| Styling | Tailwind CSS | Fast responsive layout; low overhead for a small internal tool |
| UI Components | shadcn/ui | Accessible, Tailwind-native, no vendor lock-in |
| Supabase client | `@supabase/ssr` + `@supabase/supabase-js` | Official SSR-aware auth helpers |
| File upload | Native `<input type="file" accept="image/*,application/pdf" capture="environment">` | Gives both camera capture and file picker on mobile in one input |
| CSV generation | `papaparse` | Simple, well-tested, handles edge cases |
| Deployment | Vercel (free tier) | Native Next.js support; zero config |

The entire app can be served from a single Next.js route (`/`) with client-side tab state — the team gets the full React ecosystem without fighting the framework for a simple SPA layout.
