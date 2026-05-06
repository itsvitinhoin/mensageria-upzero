export type UserRole = 'ADMIN' | 'SALES_MANAGER'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: UserRole
  storeId?: number
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
