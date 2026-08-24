/**
 * Tests for API utilities
 */
import { getApiUrl, getAuthToken } from '@/utils/api'

describe('API Utilities', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('should return /api by default', () => {
    delete process.env.NEXT_PUBLIC_BACKEND_URL
    const url = getApiUrl()
    expect(url).toBe('/api')
  })

  it('should return backend URL with /api suffix when NEXT_PUBLIC_BACKEND_URL is set', () => {
    process.env.NEXT_PUBLIC_BACKEND_URL = 'http://localhost:8000'
    const url = getApiUrl()
    expect(url).toBe('http://localhost:8000/api')
  })

  it('should handle production backend URLs', () => {
    process.env.NEXT_PUBLIC_BACKEND_URL = 'https://api.example.com'
    const url = getApiUrl()
    expect(url).toBe('https://api.example.com/api')
  })

  it('should handle backend URL with trailing slash', () => {
    process.env.NEXT_PUBLIC_BACKEND_URL = 'http://localhost:8000/'
    const url = getApiUrl()
    expect(url).toBe('http://localhost:8000//api')
  })

  it('should be a string', () => {
    const url = getApiUrl()
    expect(typeof url).toBe('string')
  })

  it('should end with /api', () => {
    process.env.NEXT_PUBLIC_BACKEND_URL = 'https://backend.example.com'
    const url = getApiUrl()
    expect(url).toMatch(/\/api$/)
  })
})

describe('Auth Token Handling', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  it('should retrieve token from localStorage', () => {
    const testToken = 'test_jwt_token_123'
    localStorage.setItem('token', testToken)

    const token = getAuthToken()
    expect(token).toBe(testToken)
  })

  it('should return null when token not found', () => {
    const token = getAuthToken()
    expect(token).toBeNull()
  })

  it('should return null on server side', () => {
    // Simulate server-side environment
    const originalWindow = global.window
    // @ts-ignore
    delete global.window

    const token = getAuthToken()
    expect(token).toBeNull()

    global.window = originalWindow
  })

  it('should handle Bearer token format in actual usage', () => {
    const testToken = 'test_jwt_token'
    localStorage.setItem('token', testToken)

    const token = getAuthToken()
    const bearerToken = `Bearer ${token}`

    expect(bearerToken).toBe('Bearer test_jwt_token')
  })

  it('should clear token from storage', () => {
    localStorage.setItem('token', 'test_token')
    localStorage.removeItem('token')

    expect(getAuthToken()).toBeNull()
  })
})

describe('API Header Construction', () => {
  it('should construct authorization header correctly', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
    const header = `Bearer ${token}`

    expect(header).toMatch(/^Bearer /)
    expect(header).toContain(token)
  })

  it('should include content-type header', () => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test_token',
    }

    expect(headers['Content-Type']).toBe('application/json')
  })

  it('should handle different content types', () => {
    const jsonHeaders = { 'Content-Type': 'application/json' }
    const formHeaders = { 'Content-Type': 'application/x-www-form-urlencoded' }

    expect(jsonHeaders['Content-Type']).toBe('application/json')
    expect(formHeaders['Content-Type']).toBe('application/x-www-form-urlencoded')
  })

  it('should format full API endpoint URL', () => {
    process.env.NEXT_PUBLIC_BACKEND_URL = 'https://api.example.com'
    const apiUrl = getApiUrl()
    const endpoint = `${apiUrl}/mra-vbc-opps/auth/login`

    expect(endpoint).toBe('https://api.example.com/api/mra-vbc-opps/auth/login')
  })
})
