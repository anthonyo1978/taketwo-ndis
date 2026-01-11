import { BarChart3, Home, TrendingUp, DollarSign, FileCheck } from 'lucide-react'

export default function ReportingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-100 rounded-lg">
              <BarChart3 className="size-8 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">
              Reporting <span className="text-gray-500 text-2xl font-normal">(Coming Soon)</span>
            </h1>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            Reporting in Haven will provide a central, read-only view across houses, residents, billing, and compliance.
          </p>
          
          <p className="text-base text-gray-600 leading-relaxed mb-8">
            This area is intentionally being introduced after the core data model is validated, to ensure reports are accurate, meaningful, and trustworthy.
          </p>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              When available, Reporting will include:
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                  <Home className="size-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Portfolio-level views</h3>
                  <p className="text-sm text-gray-600">View across all houses</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-shrink-0 p-2 bg-emerald-100 rounded-lg">
                  <TrendingUp className="size-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Occupancy summaries</h3>
                  <p className="text-sm text-gray-600">Occupancy and vacancy tracking</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-shrink-0 p-2 bg-amber-100 rounded-lg">
                  <DollarSign className="size-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Billing visibility</h3>
                  <p className="text-sm text-gray-600">Billing and payment insights</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-shrink-0 p-2 bg-purple-100 rounded-lg">
                  <FileCheck className="size-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Compliance milestones</h3>
                  <p className="text-sm text-gray-600">Key compliance and lease dates</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong className="font-semibold">Note:</strong> The Reporting module will be introduced once the core data model is fully validated and stable. This ensures all reports reflect accurate, trustworthy information from day one.
          </p>
        </div>
      </div>
    </div>
  )
}

