# Feature PRD - Organization Settings

## 1. Overview

The Organization Settings page allows users to view and edit their organization's details, including name, contact information, address, and branding elements. This information is used throughout the application for personalization, reporting, and PDF generation.

## 2. Goals

- **Personalization**: Display organization name on dashboard and throughout the app
- **Branding**: Store organization details for use in generated documents (PDFs, contracts)
- **Contact Management**: Maintain current contact information and address
- **User Control**: Allow organizations to manage their own details without admin intervention

## 3. Problem Statement

Users need a centralized location to:
- View and update their organization's name and details
- Ensure their information is correct for generated documents
- Personalize their dashboard experience
- Maintain accurate business records (ABN, address, contact info)

## 4. Audience

- **Primary Users**: Organization Admins
- **Secondary Users**: Finance Managers (view-only for context)
- **Access Control**: Must be authenticated and belong to an organization

## 5. Key Features

### 5.1 Organization Details Section
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Organization Name | Text | Yes | Legal or trading name of the organization |
| ABN | Text | No | Australian Business Number |

### 5.2 Contact Information Section
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Email | Email | No | Primary contact email |
| Phone | Tel | No | Primary contact phone |
| Website | URL | No | Organization website |

### 5.3 Address Section
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Address Line 1 | Text | No | Street address |
| Address Line 2 | Text | No | Unit/Suite number |
| Suburb | Text | No | Suburb/City |
| State | Text | No | State/Territory |
| Postcode | Text | No | Postcode |
| Country | Text | No | Default: Australia |

## 6. Functional Requirements

### 6.1 Data Fetching
- Fetch organization settings from `/api/organization/settings` on page load
- Display loading state while fetching
- Handle errors gracefully with user-friendly messages

### 6.2 Data Updates
- Submit changes via PATCH `/api/organization/settings`
- Validate required fields client-side before submission
- Show success message on successful update
- Show error message if update fails
- Automatically update dashboard after save

### 6.3 Dashboard Integration
- Dashboard header displays: "Welcome to your [Organization Name] Dashboard"
- Falls back to "Welcome to your Haven Dashboard" if organization name not set
- Organization name fetches on dashboard load

### 6.4 Settings Navigation
- Organization tile appears FIRST in Settings grid
- Icon: Building/Organization icon (sky-blue theme)
- Description: "Configure your organization's name, contact details, and branding"
- Links to `/settings/organization`

## 7. Technical Specifications

### 7.1 Database Schema
**Table**: `organization_settings`
- Already exists (migration 020)
- Fields: `organization_name`, `abn`, `email`, `phone`, `website`, `address_line1`, `address_line2`, `suburb`, `state`, `postcode`, `country`, `logo_url`, `primary_color`
- Constraint: One row per `organization_id`

### 7.2 API Endpoints

**GET /api/organization/settings**
- Returns current organization settings for authenticated user's organization
- Uses RLS to ensure users only see their own organization
- Response:
```json
{
  "success": true,
  "data": {
    "organizationName": "My Organization",
    "abn": "12 345 678 901",
    ...
  }
}
```

**PATCH /api/organization/settings**
- Updates organization settings
- Validates input
- Returns updated settings
- Request body: Partial update object (only fields being changed)

### 7.3 TypeScript Types
- `OrganizationSettings` (types/organization.ts)
- `OrganizationSettingsUpdateInput` (types/organization.ts)

### 7.4 Service Layer
- `OrganizationService.getSettings()` - Fetch settings
- `OrganizationService.updateSettings(data)` - Update settings
- Uses Supabase client with RLS

## 8. UX & Visual Design

### 8.1 Layout
- Max-width: 768px (centered)
- Three sections: Organization Details, Contact Information, Address
- Each section in a white card with border
- Clear section headers
- Form fields in vertical layout with labels

### 8.2 States
- **Loading**: Skeleton loaders for form fields
- **Editing**: All fields editable
- **Saving**: Disabled submit button with "Saving..." text
- **Success**: Green banner with success message (auto-dismiss after 3s)
- **Error**: Red banner with error message

### 8.3 Navigation
- "Back to Settings" link at top
- Cancel button returns to `/settings`
- Save button submits form

### 8.4 Validation
- Organization Name: Required field
- Email: Valid email format (if provided)
- Website: Valid URL format (if provided)
- Phone: Free text (various formats accepted)

## 9. Success Metrics

- **Adoption**: % of organizations that update their organization name within first 7 days
- **Accuracy**: Reduction in support requests for "wrong organization name"
- **Completion**: % of organizations with complete contact information
- **Usage**: Number of times organization settings are updated per month

## 10. Future Enhancements

### 10.1 Logo Upload
- Upload organization logo
- Display in dashboard header
- Use in generated PDFs

### 10.2 Branding Colors
- Customize primary color
- Apply throughout application
- Use in PDF templates

### 10.3 Multi-location Support
- Multiple addresses per organization
- Location-specific settings
- Regional contact information

### 10.4 Tax Settings
- GST registration
- Tax file number
- Billing preferences

## 11. Implementation Notes

### 11.1 Signup Integration
- Organization name already captured during signup
- Stored in both `organizations.name` and `organization_settings.organization_name`
- Consider consolidating in future refactor

### 11.2 PDF Generation
- Organization settings already used in Contract PDF generator
- Ensure all generated documents pull from organization_settings table
- Test PDF generation after organization name changes

### 11.3 Security
- RLS policies ensure users can only access their organization's settings
- Service role NOT required (users are authenticated)
- Input sanitization on server side

## 12. Testing Checklist

- [ ] Create new organization via signup
- [ ] Verify organization name appears on dashboard
- [ ] Navigate to Organization Settings
- [ ] Update organization name
- [ ] Verify dashboard updates immediately
- [ ] Save all organization details
- [ ] Verify changes persist after page reload
- [ ] Test validation (required fields, email format, URL format)
- [ ] Test error handling (network errors, server errors)
- [ ] Test with empty organization name (should require it)
- [ ] Generate PDF contract with updated organization details
- [ ] Test mobile responsiveness

## 13. Launch Plan

### Phase 1: Core Functionality ✅
- Organization Settings page
- API endpoints
- Dashboard integration
- Settings navigation tile

### Phase 2: Enhanced Features (Future)
- Logo upload
- Color customization
- Multiple locations
- Tax settings

### Phase 3: Integration (Future)
- Email signatures use organization details
- Automated emails include organization branding
- Invoice generation
- Customer portal branding

---

**Status**: ✅ Implemented
**Version**: 1.0
**Last Updated**: January 6, 2026
**Owner**: Product Team

