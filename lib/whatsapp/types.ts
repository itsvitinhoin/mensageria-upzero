export const META_REQUIRED_PERMISSIONS = [
  'public_profile',
  'email',
  'business_management',
  'whatsapp_business_management',
  'whatsapp_business_messaging',
] as const

export const META_PERMISSIONS_NOT_REQUESTED_NOW = [
  'manage_app_solution',
  'whatsapp_business_manage_events',
] as const

export type MetaRequiredPermission = (typeof META_REQUIRED_PERMISSIONS)[number]

export type IntegrationStatus = 'not_started' | 'started' | 'connected' | 'needs_attention' | 'ready' | 'failed'
export type ReviewItemStatus = 'Done' | 'Missing' | 'Failed' | 'Needs attention'
export type LogStatus = 'success' | 'failed' | 'needs_attention' | 'info'
export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
export type TemplateStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'UNKNOWN'
export type MessageCategory = 'Marketing' | 'Utility' | 'Authentication' | 'Service'
export type CampaignStatus = 'Draft' | 'Scheduled' | 'Sending' | 'Sent' | 'Failed' | 'Paused' | 'Cancelled'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'received'
export type WaOnboardingType = 'new_number' | 'existing_app_number' | 'migration_required' | 'connected'

export interface SafeError {
  message: string
  code?: string | number
  traceId?: string
  action?: string
}

export interface MetaUser {
  id: string
  name?: string
  email?: string
  grantedPermissions: string[]
  missingPermissions: string[]
}

export interface MetaBusiness {
  id: string
  name: string
  verificationStatus?: string
}

export interface WhatsAppBusinessAccount {
  id: string
  name: string
  businessId?: string
  currency?: string
  timezoneId?: string
}

export interface WhatsAppPhoneNumber {
  id: string
  displayPhoneNumber: string
  verifiedName?: string
  qualityRating?: string
  status?: string
  codeVerificationStatus?: string
}

export interface WhatsAppIntegration {
  status: IntegrationStatus
  oauthStatus: 'not_started' | 'started' | 'completed' | 'failed'
  connectionStatus: IntegrationStatus
  metaUser?: MetaUser
  businessId?: string
  wabaId?: string
  phoneNumberId?: string
  selectedTemplateId?: string
  lastSyncAt?: string
  webhookVerifiedAt?: string
  lastTestMessageId?: string
  lastError?: SafeError
  alert?: string
  updatedAt: string
}

export interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS'
  text?: string
  format?: string
  buttons?: TemplateButton[]
}

export interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'
  text: string
  url?: string
  phoneNumber?: string
}

export interface WhatsAppTemplate {
  id: string
  metaTemplateId?: string
  name: string
  category: TemplateCategory
  language: string
  status: TemplateStatus
  components: TemplateComponent[]
  body: string
  variables: string[]
  footer?: string
  buttons: TemplateButton[]
  exampleValues: Record<string, string>
  rejectionReason?: string
  source: 'meta' | 'local_draft'
  createdAt: string
  updatedAt: string
}

export interface InboxMessage {
  id: string
  metaMessageId?: string
  conversationId: string
  direction: MessageDirection
  from: string
  to: string
  text: string
  status: MessageStatus
  timestamp: string
  templateId?: string
  error?: SafeError
}

export interface InboxConversation {
  id: string
  contactName?: string
  maskedPhone: string
  phone: string
  lastMessageAt?: string
  windowExpiresAt?: string
  messages: InboxMessage[]
}

export interface Contact {
  id: string
  name: string
  phone: string
  countryCode: string
  email?: string
  tags: string[]
  source?: string
  status: 'active' | 'inactive' | 'blocked'
  optInWhatsapp: boolean
  firstPurchaseAt?: string
  lastPurchaseAt?: string
  totalSpent?: number
  orderCount?: number
  createdAt: string
  updatedAt: string
}

export interface ContactFilters {
  firstPurchase?: boolean
  neverPurchased?: boolean
  moreThanOnePurchase?: boolean
  minOrderValue?: number
  lastPurchaseFrom?: string
  purchaseFrom?: string
  purchaseTo?: string
  tags?: string[]
  status?: string
  optInWhatsapp?: boolean
  countryCode?: string
  source?: string
}

export interface ContactList {
  id: string
  name: string
  description?: string
  filters: ContactFilters
  contactIds: string[]
  createdAt: string
  updatedAt: string
}

export interface CampaignMetrics {
  totalContacts: number
  scheduled: number
  sent: number
  delivered: number
  failed: number
  replies: number
  estimatedCost: number
  costPerMessage: number
  responseRate: number
}

export interface Campaign {
  id: string
  name: string
  listId?: string
  templateId?: string
  variableMapping: Record<string, string>
  scheduledAt?: string
  status: CampaignStatus
  estimatedCost: number
  metrics: CampaignMetrics
  createdAt: string
  updatedAt: string
}

export interface PricingRate {
  country: string
  currency: string
  category: MessageCategory
  unitCost: number
  source: 'configured' | 'example'
}

export interface PricingEstimateInput {
  category: MessageCategory
  country: string
  quantity: number
  currency: string
  unitCost?: number
  campaignId?: string
  listId?: string
}

export interface PricingEstimate {
  category: MessageCategory
  country: string
  quantity: number
  currency: string
  unitCost: number
  total: number
  source: 'configured' | 'manual' | 'example'
  disclaimer: string
}

export type WhatsAppLogType =
  | 'oauth_started'
  | 'oauth_completed'
  | 'permission_missing'
  | 'business_loaded'
  | 'waba_loaded'
  | 'phone_selected'
  | 'templates_synced'
  | 'template_created'
  | 'template_approved'
  | 'template_rejected'
  | 'message_sent'
  | 'webhook_received'
  | 'inbox_updated'
  | 'automation_created'
  | 'campaign_created'
  | 'campaign_sent'
  | 'campaign_paused'
  | 'campaign_error'
  | 'price_estimated'
  | 'connection_saved'
  | 'contact_list_created'
  | 'contact_created'

export interface WhatsAppLog {
  id: string
  timestamp: string
  type: WhatsAppLogType
  status: LogStatus
  description: string
  safePayload?: Record<string, unknown>
  error?: SafeError
  recommendedAction?: string
}

export interface WhatsAppState {
  version: 2
  integration: WhatsAppIntegration
  businesses: MetaBusiness[]
  wabas: WhatsAppBusinessAccount[]
  phoneNumbers: WhatsAppPhoneNumber[]
  templates: WhatsAppTemplate[]
  conversations: InboxConversation[]
  contacts: Contact[]
  contactLists: ContactList[]
  campaigns: Campaign[]
  logs: WhatsAppLog[]
}

export interface ReviewChecklistItem {
  id: string
  label: string
  status: ReviewItemStatus
  detail: string
}
