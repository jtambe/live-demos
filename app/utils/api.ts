export const getApiUrl = () => {
  // Vercel binding injects NEXT_PUBLIC_BACKEND_URL pointing to backend service
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    // Binding returns direct backend URL, append /api prefix
    // for local development
    return `${process.env.NEXT_PUBLIC_BACKEND_URL}/api`
  }
  // Cloud fallback: return empty string, rewrite handles /api routing
  return ''
}