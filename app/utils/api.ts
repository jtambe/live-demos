export const getApiUrl = () => {
  // Vercel binding injects NEXT_PUBLIC_BACKEND_URL pointing to backend service
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    // Binding returns direct backend URL, append /api prefix
    // for local development
    return `${process.env.NEXT_PUBLIC_BACKEND_URL}/api`
  }
  // Cloud fallback: return /api (Vercel routes /api/* to backend service)
  return '/api'
}

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}