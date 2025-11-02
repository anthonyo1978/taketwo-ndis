"use client"

import { useState } from 'react'
import { Book, FileText, HelpCircle, Rocket, Search } from 'lucide-react'
import Link from 'next/link'

interface GuideCard {
  id: string
  title: string
  description: string
  file: string
  icon: typeof Book
  category: 'getting-started' | 'guides' | 'faq'
}

const GUIDES: GuideCard[] = [
  {
    id: 'quick-start',
    title: 'Quick Start Guide',
    description: 'Get up and running in 15 minutes',
    file: 'QUICK-START-GUIDE.md',
    icon: Rocket,
    category: 'getting-started'
  },
  {
    id: 'training',
    title: 'Training Guide',
    description: 'Comprehensive training manual for new users',
    file: 'TRAINING-GUIDE.md',
    icon: Book,
    category: 'getting-started'
  },
  {
    id: 'user-guide',
    title: 'Complete User Guide',
    description: 'In-depth documentation for all features',
    file: 'USER-GUIDE.md',
    icon: FileText,
    category: 'guides'
  },
  {
    id: 'faq',
    title: 'Frequently Asked Questions',
    description: 'Common questions and answers',
    file: 'FAQ-GUIDE.md',
    icon: HelpCircle,
    category: 'faq'
  }
]

export function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const filteredGuides = GUIDES.filter(guide => {
    const matchesSearch = guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         guide.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Help & Training</h1>
          <p className="text-gray-600">Guides, tutorials, and FAQs to help you get the most out of Haven</p>
          
          {/* Search Bar */}
          <div className="mt-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search guides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div className="mt-4 flex gap-2">
            {[
              { value: 'all', label: 'All Guides' },
              { value: 'getting-started', label: 'Getting Started' },
              { value: 'guides', label: 'User Guides' },
              { value: 'faq', label: 'FAQs' }
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSelectedCategory(value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Guide Cards */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {filteredGuides.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No guides found matching "{searchQuery}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGuides.map((guide) => {
              const Icon = guide.icon
              return (
                <Link
                  key={guide.id}
                  href={`/help/${guide.id}`}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-300 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                      <Icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                        {guide.title}
                      </h3>
                      <p className="text-sm text-gray-600">{guide.description}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Need More Help */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Need More Help?</h2>
          <p className="text-gray-700 mb-4">
            Can't find what you're looking for? Our team is here to help.
          </p>
          <div className="flex gap-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Contact Support
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const tourHook = document.querySelector('[data-tour="user-profile"]')
                  if (tourHook) {
                    // Trigger tour restart via the hook
                    localStorage.removeItem('haven-tour-completed')
                    window.location.href = '/dashboard'
                  }
                }
              }}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Restart Product Tour
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

