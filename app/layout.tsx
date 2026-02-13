import "styles/tailwind.css"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    default: "Haven — SDA Business Management Software",
    template: "%s — Haven",
  },
  description: "Automate billing, track contracts, and manage your SDA portfolio. Built for Australian Specialist Disability Accommodation providers.",
  keywords: ["SDA", "NDIS", "disability accommodation", "SDA software", "NDIS billing", "SDA provider", "automated billing"],
  openGraph: {
    title: "Haven — Automate Your SDA Business",
    description: "The management platform built specifically for SDA providers. Automated billing, contract tracking, NDIS claims — all in one place.",
    type: "website",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
