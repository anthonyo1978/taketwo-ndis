

 
Product Requirements Document (PRD)

Project: USer in session


1. Overview

Purpose:
This feature defines how authenticated users are recognised, represented, and logged while using Haven.
Authentication (login and token validation) already exists, but once inside the system there is no consistent awareness of “who” is using it.
This feature introduces a persistent session layer and lightweight user profile, so the system can identify, display, and log user actions throughout the app.

Problem Statement:
Currently, Haven has no in-session user identity awareness. Once logged in, there’s no visible indication of which user is active, and system actions (e.g. editing, creating, or approving items) cannot be attributed to a specific person. This limits auditability and user confidence.
The “User in Session” feature will fix this by displaying the current user, linking their activity to audit logs, and providing a basic profile and logout control.

2. Goals & Non-Goals

Goals

 Users can see who they are logged in as while using Haven.
 Users can open a simple profile view showing their name, email, and optional contact details.
 All key system actions (create, edit, delete) are logged with the user’s ID and timestamp.
 Users can log out manually or be auto-logged out after inactivity (configurable).

Non Goals

 Role-based permissions or restricted visibility.
 Complex user settings or avatar uploads.
 Public user directory.
 Full admin activity dashboards (audit log access only).

3. Audience / Users

Authenticated users only.
All users in Haven share similar privileges; no differentiated roles in Phase 1.
Admin-equivalent users (e.g., Finance or Property Managers) who require visibility into which user performed which actions.

4. Scope

In Scope (Phase 1)

 Persistent session tracking for authenticated users.
 Basic “User Profile” modal or drawer.
 Logging user actions in database events.
 Manual and timed logout capability.

Out of Scope

 Profile pictures or custom themes.
 Role management or permission tiers.
 Multi-tenant impersonation (admin-viewing-as-user).

5. User Experience (UX)
When a user logs into Haven, the system should clearly indicate who is logged in, allow them to view/edit minimal details, and log every significant interaction under their user ID.

Flow

    User authenticates via the existing Supabase Auth flow.
    Dashboard loads with a small profile icon in the top-right corner (showing initials).
    Clicking the icon opens a Profile menu with:
    Name, email, phone, job title (view-only)
    No edit capability - profile managed by admins only
    "Log Out" button

When the user performs actions (e.g., creates a house, edits a contract), the system automatically includes their user_id in all logs and entity records.

On inactivity (e.g., 10 mins), session expires and the user is logged out automatically.


Key Screens / Components:

 - Dashboard screen has a little icon on the right top where users can see their profile and click it and view (read-only) their basic user info.
 - This users profile is the vehicle for how the system knows who is logged in and who is not.
 - This iuser profile is included in logs and stamps when prople do stuff.



6. Functional Requirements

| ID  | Function                    | Description                               | Acceptance Criteria           |
| --- | --------------------------- | ----------------------------------------- | ----------------------------- |
| F-1 | Show current user           | Display initials/icon in header           | Appears post-login            |
| F-2 | View profile                | View basic info (name, email)             | Matches user data in Supabase |
| F-3 | Logout                      | Manual logout button                      | Redirects to login page       |
| F-4 | Auto logout                 | Inactivity timeout                        | Session cleared after 10 min  |
| F-6 | Action logging              | Every record change tagged with `user_id` | Confirmable in audit log      |
| F-7 | Audit trail view (internal) | Admin can query `system_logs`             | User actions are traceable    |



7. Technical Requirements

** The sysem may have to assign a unwiue user id per new user!
Logs:

Each mutation (create/update/delete) attaches user_id
Logged in a system_logs table with:
user_id, entity_type, entity_id, action, timestamp

Logout:

Implement 10-min inactivity timer (extendable in Phase 2)

8. Metrics / Success Criteria

100% of database writes include a user_id.
Profile icon appears for all authenticated sessions.
Successful logout (manual or timeout) clears token from local storage.
Average time from inactivity to auto-logout < 60 seconds.



9. Risks & Mitigations

Risk that users can use the system wiuthout the system knowing who is who
risk that an authenticated user can do something and the system doesnt know or log
Risk that toikens expire mid session


10. Future Enhancements

down the road we will ad profile pics, increased logging and more


**** Update Extensions ******

With certain events now logging, the logs are not actually visible and or available to the end user.
To solve this, within the "Settings" page, Make it so that when the user clicks on the existing "System Setting" tile that a page of setting launches.

Update that initial System prefences tile  to have the foptter text read "Configure application behavior and logging levels"

Then, when the user clicks on this page they can...

* enable logging in the UI ( although this is always on) - this is cosmentic
* Create a lkogging report, where by they can click a button and choose a data range and click submit.. ( pre canned ranges = TODAY, Yesterday, last 1 week, last 2 week, last 12 weeks, all time)
* This will run a report and provide logs from the system_logs table based on the created at date.
* The report is not stored on the UI but intead a CSV is downloaded by the browser

