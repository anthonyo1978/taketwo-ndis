"use client"

import { useState, useEffect } from "react"
import { Search, X, User, MapPin, Calendar } from "lucide-react"
import { Button } from "components/Button/Button"
import type { Resident } from "types/resident"
import type { House } from "types/house"

interface ResidentSelectionModalProps {
  open: boolean
  onClose: () => void
  onSelect: (resident: Resident, roomLabel?: string) => void
  houseId: string
  excludeResidentIds?: string[] // Residents already in this house
}

interface ApiResponse {
  success: boolean
  data?: Resident[]
  error?: string
}

interface HousesApiResponse {
  success: boolean
  data?: House[]
  error?: string
}

export function ResidentSelectionModal({ 
  open, 
  onClose, 
  onSelect, 
  houseId,
  excludeResidentIds = [] 
}: ResidentSelectionModalProps) {
  const [residents, setResidents] = useState<Resident[]>([])
  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [roomLabel, setRoomLabel] = useState("")

  // Fetch residents and houses data
  useEffect(() => {
    if (!open) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const [residentsResponse, housesResponse] = await Promise.all([
          fetch('/api/residents'),
          fetch('/api/houses')
        ])

        const [residentsResult, housesResult] = await Promise.all([
          residentsResponse.json() as Promise<ApiResponse>,
          housesResponse.json() as Promise<HousesApiResponse>
        ])

        if (residentsResult.success && residentsResult.data) {
          setResidents(residentsResult.data)
        } else {
          setError(residentsResult.error || 'Failed to load residents')
          return
        }

        if (housesResult.success && housesResult.data) {
          setHouses(housesResult.data)
        } else {
          setError(housesResult.error || 'Failed to load houses')
          return
        }
      } catch (err) {
        setError('Network error. Please check your connection and try again.')
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [open])

  // Get house name for a resident
  const getHouseName = (houseId: string): string => {
    const house = houses.find(h => h.id === houseId)
    if (!house) return 'Unassigned'
    return house.descriptor || `${house.address1}, ${house.suburb}`
  }

  // Filter residents based on search and status
  const filteredResidents = residents.filter(resident => {
    // Exclude residents already in this house
    if (excludeResidentIds.includes(resident.id)) return false

    // Filter by search term
    const matchesSearch = searchTerm === "" || 
      `${resident.firstName} ${resident.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resident.id.toLowerCase().includes(searchTerm.toLowerCase())

    // Filter by status
    const matchesStatus = statusFilter === "all" || resident.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const statusColors = {
      'Prospect': 'bg-blue-100 text-blue-800 border-blue-200',
      'Active': 'bg-green-100 text-green-800 border-green-200',
      'Deactivated': 'bg-red-100 text-red-800 border-red-200'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {status}
      </span>
    )
  }

  // Handle resident selection
  const handleSelect = (resident: Resident) => {
    onSelect(resident, roomLabel.trim() || undefined)
    onClose()
    setRoomLabel("") // Reset for next use
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Assign Resident to House</h2>
            <p className="text-sm text-gray-600 mt-1">
              Select a resident to assign to this house
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search residents by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="Prospect">Prospect</option>
                <option value="Active">Active</option>
                <option value="Deactivated">Deactivated</option>
              </select>
            </div>
          </div>

          {/* Room Input */}
          <div>
            <label htmlFor="roomLabel" className="block text-sm font-medium text-gray-700 mb-1">
              Room / Unit <span className="text-gray-500">(Optional)</span>
            </label>
            <input
              id="roomLabel"
              type="text"
              placeholder="e.g., Room 1, Bedroom A, Studio 2"
              value={roomLabel}
              onChange={(e) => setRoomLabel(e.target.value)}
              maxLength={50}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional: Specify which room this resident will occupy in the property
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : filteredResidents.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No residents found</p>
                <p className="text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms' : 'All residents may already be assigned to this house'}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-96">
              <div className="divide-y divide-gray-200">
                {filteredResidents.map((resident) => (
                  <div
                    key={resident.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleSelect(resident)}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0 h-12 w-12">
                        {resident.photoBase64 ? (
                          <img
                            className="h-12 w-12 rounded-full object-cover"
                            src={resident.photoBase64}
                            alt={`${resident.firstName} ${resident.lastName}`}
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-600 text-sm font-medium">
                              {resident.firstName.charAt(0)}{resident.lastName.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Resident Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {resident.firstName} {resident.lastName}
                          </p>
                          <StatusBadge status={resident.status} />
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          ID: {resident.id}
                        </p>
                        <div className="flex items-center space-x-4 mt-1">
                          {resident.phone && (
                            <p className="text-sm text-gray-500">
                              📞 {resident.phone}
                            </p>
                          )}
                          {resident.email && (
                            <p className="text-sm text-gray-500">
                              ✉️ {resident.email}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Current House Assignment */}
                      <div className="flex-shrink-0 text-right">
                        <div className="flex items-center text-sm text-gray-500 mb-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>
                            {resident.houseId ? getHouseName(resident.houseId) : 'Unassigned'}
                          </span>
                        </div>
                        <div className="flex items-center text-xs text-gray-400">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>
                            Created {new Date(resident.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Select Button */}
                      <div className="flex-shrink-0">
                        <Button size="sm">
                          Select
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <Button intent="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
