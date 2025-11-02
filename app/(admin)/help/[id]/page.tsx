import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { GuideViewer } from 'components/help/GuideViewer'
import { promises as fs } from 'fs'
import path from 'path'

interface GuideParams {
  id: string
}

const GUIDE_MAP: Record<string, string> = {
  'quick-start': 'QUICK-START-GUIDE.md',
  'training': 'TRAINING-GUIDE.md',
  'user-guide': 'USER-GUIDE.md',
  'faq': 'FAQ-GUIDE.md'
}

export async function generateStaticParams() {
  return Object.keys(GUIDE_MAP).map((id) => ({ id }))
}

export async function generateMetadata({ params }: { params: Promise<GuideParams> }): Promise<Metadata> {
  const { id } = await params
  const titles: Record<string, string> = {
    'quick-start': 'Quick Start Guide',
    'training': 'Training Guide',
    'user-guide': 'User Guide',
    'faq': 'FAQ'
  }
  
  return {
    title: `${titles[id] || 'Guide'} | Haven Help`,
    description: 'Haven training and documentation'
  }
}

export default async function GuidePage({ params }: { params: Promise<GuideParams> }) {
  const { id } = await params
  const fileName = GUIDE_MAP[id]
  
  if (!fileName) {
    notFound()
  }

  // Read the markdown file from the root directory
  const filePath = path.join(process.cwd(), fileName)
  let content: string
  
  try {
    content = await fs.readFile(filePath, 'utf8')
  } catch (error) {
    console.error(`Error reading guide file ${fileName}:`, error)
    notFound()
  }

  return <GuideViewer content={content} guideId={id} />
}

