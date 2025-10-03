import { Metadata } from "next"
import { AutomationSettingsPage } from "components/admin/AutomationSettingsPage"

export const metadata: Metadata = {
  title: "Automation Settings",
  description: "Configure automated billing and transaction generation",
}

export default function AutomationPage() {
  return <AutomationSettingsPage />
}
