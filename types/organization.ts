/**
 * Organization types for multi-tenancy
 */

export type SubscriptionStatus = 
  | 'trial' 
  | 'active' 
  | 'past_due' 
  | 'canceled' 
  | 'suspended'

export type SubscriptionPlan = 
  | 'free' 
  | 'starter' 
  | 'pro' 
  | 'enterprise'

export interface Organization {
  id: string
  name: string
  slug: string
  subscription_status: SubscriptionStatus
  subscription_plan: SubscriptionPlan
  trial_ends_at?: Date
  stripe_customer_id?: string
  stripe_subscription_id?: string
  max_houses: number
  max_residents: number
  max_users: number
  features: OrganizationFeatures
  created_at: Date
  updated_at: Date
  created_by: string
  updated_by: string
}

export interface OrganizationFeatures {
  automation_enabled: boolean
  pdf_generation_enabled: boolean
  claims_enabled: boolean
  api_access: boolean
  white_label: boolean
}

export interface OrganizationCreateInput {
  name: string
  slug?: string
  subscription_plan?: SubscriptionPlan
  admin_email: string
  admin_first_name: string
  admin_last_name: string
  admin_password: string
}

export interface OrganizationUpdateInput {
  name?: string
  max_houses?: number
  max_residents?: number
  max_users?: number
  features?: Partial<OrganizationFeatures>
}

export interface OrganizationLimitCheck {
  allowed: boolean
  current: number
  max: number
  limitType: 'houses' | 'residents' | 'users'
}

// Plan definitions with limits
export const PLAN_LIMITS = {
  free: {
    max_houses: 5,
    max_residents: 20,
    max_users: 2,
    features: {
      automation_enabled: true,
      pdf_generation_enabled: true,
      claims_enabled: true,
      api_access: false,
      white_label: false
    }
  },
  starter: {
    max_houses: 20,
    max_residents: 100,
    max_users: 5,
    features: {
      automation_enabled: true,
      pdf_generation_enabled: true,
      claims_enabled: true,
      api_access: true,
      white_label: false
    }
  },
  pro: {
    max_houses: 100,
    max_residents: 500,
    max_users: 20,
    features: {
      automation_enabled: true,
      pdf_generation_enabled: true,
      claims_enabled: true,
      api_access: true,
      white_label: true
    }
  },
  enterprise: {
    max_houses: 999999,
    max_residents: 999999,
    max_users: 999999,
    features: {
      automation_enabled: true,
      pdf_generation_enabled: true,
      claims_enabled: true,
      api_access: true,
      white_label: true
    }
  }
} as const
