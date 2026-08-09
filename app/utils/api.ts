export const getApiUrl = () => {
  // Vercel binding injects NEXT_PUBLIC_BACKEND_URL pointing to backend service
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL
  }
  // Fallback for local dev when not running via vercel dev
  return 'http://localhost:8000'
}
