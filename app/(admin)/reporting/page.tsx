import { BarChart3, Home, TrendingUp, TrendingDown, DollarSign, FileCheck, Activity, Boxes } from 'lucide-react'

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
            Reporting in Haven will provide central, portfolio-level snapshots across houses, residents, billing, and compliance.
          </p>
          
          <p className="text-base text-gray-600 leading-relaxed mb-6">
            This includes overview-style reporting such as <strong className="text-gray-800">vacancy visibility across properties and rooms</strong>, helping teams quickly understand where capacity exists.
          </p>
          
          <p className="text-base text-gray-600 leading-relaxed mb-8">
            We're intentionally validating the underlying data first (occupancy, rooms, enrolment, classifications) so reporting is accurate and trusted when introduced.
          </p>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Planned reporting capabilities:
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-rose-50 rounded-lg border border-rose-200">
                <div className="flex-shrink-0 p-2 bg-rose-100 rounded-lg">
                  <Boxes className="size-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Vacancy snapshots</h3>
                  <p className="text-sm text-gray-600">Vacant houses and rooms across portfolio</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-shrink-0 p-2 bg-emerald-100 rounded-lg">
                  <TrendingUp className="size-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Portfolio occupancy summaries</h3>
                  <p className="text-sm text-gray-600">Overall occupancy rates and trends</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-shrink-0 p-2 bg-amber-100 rounded-lg">
                  <DollarSign className="size-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Billing and claim visibility</h3>
                  <p className="text-sm text-gray-600">Revenue insights and claim status</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-shrink-0 p-2 bg-purple-100 rounded-lg">
                  <FileCheck className="size-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Property and compliance milestones</h3>
                  <p className="text-sm text-gray-600">Key dates and compliance tracking</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Forecasting Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Activity className="size-6 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Forecasting <span className="text-gray-500 text-lg font-normal">(Coming Soon)</span>
            </h2>
          </div>
          
          <p className="text-base text-gray-700 leading-relaxed mb-4">
            Forecasting in Haven will project future spend and revenue based on current occupancy patterns, historical growth trends, and planned capacity changes.
          </p>
          
          <p className="text-sm text-gray-600 leading-relaxed">
            This will help teams model scenarios like "What if we fill 2 more rooms?" or "How will revenue trend if current growth continues?" — providing confidence for capacity planning and budget forecasting.
          </p>
          
          <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <p className="text-sm text-indigo-800">
              <strong className="font-semibold">Note:</strong> Forecasting will leverage validated occupancy, billing, and transaction data to produce reliable projections once the core data model is proven stable.
            </p>
          </div>
        </div>

        {/* Funding Gap Analysis Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingDown className="size-6 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Funding Gap Analysis <span className="text-gray-500 text-lg font-normal">(Coming Soon)</span>
            </h2>
          </div>
          
          <p className="text-base text-gray-700 leading-relaxed mb-4">
            Funding Gap Analysis will project current participant spending patterns against available contract funds to identify potential shortfalls before they occur.
          </p>
          
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            This analysis will help you proactively manage funding by comparing actual spend rates with remaining balances, alerting you when a participant's funding may not last until their contract end date.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold text-sm">1</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 text-sm mb-1">Spend Rate Analysis</h4>
                <p className="text-xs text-gray-600">Calculate daily/weekly spend rates per participant</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold text-sm">2</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 text-sm mb-1">Projected Depletion</h4>
                <p className="text-xs text-gray-600">Estimate when funds will run out at current pace</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold text-sm">3</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 text-sm mb-1">Gap Identification</h4>
                <p className="text-xs text-gray-600">Flag participants at risk of funding shortfall</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold text-sm">4</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 text-sm mb-1">Early Alerts</h4>
                <p className="text-xs text-gray-600">Proactive warnings before funds deplete</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">
              <strong className="font-semibold">Note:</strong> Funding Gap Analysis requires stable transaction history and billing patterns. This feature will be introduced after sufficient data has been collected to produce accurate projections.
            </p>
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


