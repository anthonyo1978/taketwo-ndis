/** Australian state and territory codes. */
export type AustralianState = 'ACT' | 'NSW' | 'NT' | 'QLD' | 'SA' | 'TAS' | 'VIC' | 'WA'

/** Status options for houses. */
export type HouseStatus = 'Active' | 'Vacant' | 'Under maintenance'

/**
 * Complete house information including address and status.
 */
export interface House {
  id: string
  descriptor?: string
  address1: string
  unit?: string
  suburb: string
  state: AustralianState
  postcode: string
  country: string
  status: HouseStatus
  notes?: string
  goLiveDate: Date
  resident?: string
  imageUrl?: string
  createdAt: Date
  createdBy: string
  updatedAt: Date
  updatedBy: string
}

/**
 * Input data for creating a new house.
 */
export interface HouseCreateInput {
  descriptor?: string
  address1: string
  unit?: string
  suburb: string
  state: AustralianState
  postcode: string
  country: string
  status: HouseStatus
  notes?: string
  goLiveDate: Date
  resident?: string
  imageUrl?: string
}