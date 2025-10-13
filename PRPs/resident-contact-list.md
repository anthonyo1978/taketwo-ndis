Purpose

The Resident Contact List allows users to maintain a small, structured set of key contacts for each resident — such as family members, doctors, or allied health providers.
It provides a quick “phone book” view that makes it easier for staff to find and reference relevant people associated with a resident.

Problem Statement

Currently, staff have no easy way to view or manage important contacts related to a resident. Critical information (e.g., GP, support coordinator) is scattered across notes or offline documents.
This feature introduces a simple, structured list of contacts within each resident profile — supporting both resident-specific contacts and shared contacts (e.g., a doctor or service provider used by multiple residents).

Goals & Non-Goals

Goals
Add a Contact List tab to the resident view.
Allow users to add, view, edit, and remove contacts related to a resident.
Allow linking existing contacts that are already in the system to additional residents.
Support contact roles (e.g., Friend, Family, Doctor, Support Coordinator).
Keep the interface minimal and usable — capped around 10 contacts per resident.

Non-Goals (Phase 1)

Advanced contact hierarchies or organizations.
File uploads or attachments for contacts.
Permissions or role-based visibility (all logged-in users can view/edit).
Communication features (no call/email actions yet).

Audience / Users

Primary users: Admins, care coordinators, and staff who manage resident data.
Access: All authenticated Haven users (single permission level).
Use case: Quickly reference or update people relevant to a resident.

Scope
In Scope

New tab: Contact List (with phone icon) in the Resident record.
CRUD functionality for contacts (create, read, update, delete).
Linking shared contacts across multiple residents.
Role definitions and simple descriptive fields.

Out of Scope

Messaging, notifications, or calls.
File attachments.
Role-based permissions.

Layout

Resident → Contact List Tab

Appears before Funding Contracts tab.

Icon: 📞 (Phone icon).

Displays a simple table or list of up to 10 contacts.

Default View
Contact Name	Role	Phone	Email	Description	Note
Dr. Sarah Lee	Doctor	0402 123 456	s.lee@clinic.com
	GP	Mon-Wed available

“Add Contact” button at top right.

Each row clickable for edit/delete.

Add Contact Flow

Click Add Contact → modal opens.

User can:

Search for existing contacts (type-ahead by name/email/phone).

Or click Create New Contact.

Enter fields:

Contact Name (text)

Role (dropdown — predefined or custom)

Phone Number (optional)

Email (optional)

Description (short text — e.g., “Local GP”, “Brother”)

Note (multi-line)

Save → contact appears in list.

If the contact already exists, the system simply links that contact to the current resident.

Editing / Removing

Click contact → open modal for editing.

Delete → confirm prompt, removes only the link (not the shared contact record).

Shared Contacts

Each contact exists as a unique record in a contacts table.

Relationships to residents stored in a resident_contacts join table.

If a contact is linked to multiple residents, editing that contact updates it for all.

6. Functional Requirements
ID	Function	Description	Acceptance Criteria
F-1	Create new contact	Add a new contact to system & link to current resident	Contact appears in resident list
F-2	Link existing contact	Search for existing contact & link to current resident	Shared contact visible in both residents
F-3	Edit contact	Update contact info; updates reflect for all linked residents	Changes persist system-wide
F-4	Delete link	Remove link between contact and resident	Contact remains in system if linked elsewhere
F-5	Delete contact	If contact only linked to one resident, deleting removes record entirely	Confirm modal required
F-6	View list	Display table of contacts for current resident	Max 10 rows default
F-7	Search existing	Type-ahead search for name/email/phone	Returns matches within same organisation
F-8	Validation	Ensure at least Contact Name + Role required	Validation errors shown inline
7. Technical Requirements

Frontend:

Framework: Next.js + shadcn/ui

Components: List/Table view, modal form, typeahead search.

Backend / Database:

Table: contacts

id (uuid)

organisation_id (DEFERRED: Multi-tenancy support will be added in Phase 2. For now, all contacts are global within the system.)

name

role (free text, user-defined)

phone

email

description

note

created_at, updated_at

Table: resident_contacts (join table)

resident_id

contact_id

created_at

Index on (organisation_id, name) for quick search.

API endpoints / Supabase functions:

/api/residents/:id/contacts (GET, POST, DELETE)

/api/contacts/search?q= (GET — for linking existing contacts)

Auth:

Limit results to contacts within same organisation_id.

8. Metrics / Success Criteria

Add/edit/delete actions complete < 2s.

Users can link existing contacts without duplication.

100% of contact records associated with an organisation_id.

Each resident can have up to 10 linked contacts (soft cap).

9. Risks & Mitigations
Risk	Impact	Mitigation
Duplicate contacts (same name)	Medium	Typeahead search before create; soft dedupe by email/phone
Over-shared edits	Medium	Confirmation tooltip: “Editing this contact updates it for all residents.”
Data sprawl	Low	Cap display to 10; paginate if necessary
Accidental deletes	Low	Confirm modals for delete actions
10. Milestones & Timeline
Phase	Deliverable	Target
M1	Create DB tables & endpoints	Week 1
M2	Resident tab & list UI	Week 2
M3	Add / Edit / Link / Delete flows	Week 3
M4	Validation & UX polish	Week 4
11. Future Enhancements

Add “Contact Type” taxonomy with colour labels.

Integrate with communication tools (click-to-call or mailto links).

Role-based permissions for editing shared contacts.

Audit logging (“who added this contact”).

Export resident contact list as PDF or CSV.