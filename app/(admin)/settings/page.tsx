import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage application settings",
}

export default function SettingsPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>
        
        {/* Settings Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link 
            href="/settings/users" 
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer block"
          >
            <div className="flex items-center mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="size-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
            <p className="text-gray-600 text-sm mb-4">Invite users, manage accounts, and control access.</p>
            <div className="text-blue-600 text-sm font-medium hover:text-blue-800">
              Configure →
            </div>
          </Link>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="size-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">System Preferences</h3>
            <p className="text-gray-600 text-sm mb-4">Configure application behavior and default settings.</p>
            <button className="text-blue-600 text-sm font-medium hover:text-blue-800">
              Configure →
            </button>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="size-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Security Settings</h3>
            <p className="text-gray-600 text-sm mb-4">Manage authentication, password policies, and security.</p>
            <button className="text-blue-600 text-sm font-medium hover:text-blue-800">
              Configure →
            </button>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="size-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Contract Templates</h3>
            <p className="text-gray-600 text-sm mb-4">View and manage contract templates</p>
            <button className="text-blue-600 text-sm font-medium hover:text-blue-800">
              Configure →
            </button>
          </div>
          
          <Link 
            href="/settings/automation"
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer block"
          >
            <div className="flex items-center mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <svg className="size-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Automation</h3>
            <p className="text-gray-600 text-sm mb-4">Configure automated billing and transaction generation.</p>
            <div className="text-blue-600 text-sm font-medium hover:text-blue-800">
              Configure →
            </div>
          </Link>
        </div>

        {/* Configuration Panel */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Configuration</h2>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Email Notifications</label>
                  <p className="text-sm text-gray-500">Receive email updates for important events</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Auto-save Changes</label>
                  <p className="text-sm text-gray-500">Automatically save form changes</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Dark Mode</label>
                  <p className="text-sm text-gray-500">Switch to dark theme</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}