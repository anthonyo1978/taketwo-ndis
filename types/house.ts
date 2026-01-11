/** Australian state and territory codes. */
export type AustralianState = 'ACT' | 'NSW' | 'NT' | 'QLD' | 'SA' | 'TAS' | 'VIC' | 'WA'

/** Status options for houses. */
export type HouseStatus = 'Active' | 'Vacant' | 'Maintenance'

/** SDA dwelling type options */
export type DwellingType = 'House' | 'Villa' | 'Apartment' | 'Townhouse' | 'Duplex' | 'Other'

/** SDA design category options */
export type SDADesignCategory = 'Improved Liveability' | 'Fully Accessible' | 'Robust' | 'High Physical Support' | 'Other/Unknown'

/** SDA registration status options */
export type SDARegistrationStatus = 'Registered' | 'In Progress' | 'Unknown'

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
  bedroomCount?: number
  dwellingType?: DwellingType
  sdaDesignCategory?: SDADesignCategory
  sdaRegistrationStatus?: SDARegistrationStatus
  hasOoa?: boolean
  ooaNotes?: string
  enrolmentDate?: Date
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
  bedroomCount?: number
  dwellingType?: DwellingType
  sdaDesignCategory?: SDADesignCategory
  sdaRegistrationStatus?: SDARegistrationStatus
  hasOoa?: boolean
  ooaNotes?: string
  enrolmentDate?: Date
  notes?: string
  goLiveDate: Date
  resident?: string
  imageUrl?: string
}