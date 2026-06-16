import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'

const BASE_URL = 'https://api.tmj-connect.com/api/v1'

/**
 * preAuthApi — unauthenticated endpoints (register, login, verify-email, etc.)
 * No Bearer token, no withCredentials.
 */
export const preAuthApi = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
})

/**
 * api — authenticated endpoints.
 * Auto-attaches Bearer token. Handles 401 with refresh.
 */
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

// Shared refresh promise so concurrent 401s all wait on the same refresh call
let refreshPromise: Promise<string> | null = null

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const orig = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (error.response?.status !== 401 || orig._retry) {
      return Promise.reject(error)
    }
    orig._retry = true

    if (!refreshPromise) {
      refreshPromise = (async () => {
        isRefreshing = true
        try {
          const rt = useAuthStore.getState().refreshToken
          if (!rt) throw new Error('No refresh token')
          const { data } = await preAuthApi.post('/auth/refresh', { refresh_token: rt })
          const d = data?.data ?? data
          const at = d.access_token
          const nrt = d.refresh_token
          useAuthStore.getState().setTokens(at, nrt)
          refreshQueue.forEach((cb) => cb(at))
          refreshQueue = []
          return at
        } catch (e) {
          refreshQueue = []
          useAuthStore.getState().logout()
          window.location.href = '/login'
          throw e
        } finally {
          isRefreshing = false
          refreshPromise = null
        }
      })()
    }

    return refreshPromise.then((at) => {
      orig.headers.Authorization = `Bearer ${at}`
      return api(orig)
    })
  }
)

/** Extract error message from any API error shape */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = (err as any)?.response?.data
  const m = d?.error?.message ?? d?.message ?? (typeof d?.error === 'string' ? d.error : null) ?? d?.detail
  if (m && typeof m === 'string') return m
  if (import.meta.env.DEV) console.warn('[API Error]', d, err)
  return fallback
}

export default api
