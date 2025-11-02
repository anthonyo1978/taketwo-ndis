import { Metadata } from 'next'
import { HelpCenter } from 'components/help/HelpCenter'

export const metadata: Metadata = {
  title: 'Help & Training | Haven',
  description: 'Training guides, FAQs, and documentation for Haven'
}

export default function HelpPage() {
  return <HelpCenter />
}

