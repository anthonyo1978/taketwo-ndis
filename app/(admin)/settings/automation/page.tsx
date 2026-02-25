import { redirect } from "next/navigation"

/**
 * Legacy automation settings page — now redirects to the Automations module.
 * All automation configuration has been migrated to /automations.
 */
export default function AutomationSettingsRedirect() {
  redirect('/automations')
}
