import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from './authStore'
import { env } from './env'

axios.defaults.withCredentials = true

const api = axios.create({
  baseURL: `${env.BACKEND_URL}`,
  withCredentials: true,
})

type RetryableRequest = InternalAxiosRequestConfig & {
  _retry?: boolean
}

let refreshPromise: Promise<string> | null = null

function setAuthHeader(
  config: InternalAxiosRequestConfig,
  token: string | null
): InternalAxiosRequestConfig {
  if (!config.headers) {
    return config // don't try to assign {}
  }

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  } else {
    config.headers.delete('Authorization')
  }

  return config
}

async function requestNewAccessToken(): Promise<string> {
  const response = await axios.post(
    '/auth/refresh',
    {},
    {
      baseURL: env.BACKEND_URL,
      withCredentials: true,
    }
  )

  const newToken = response.data?.accessToken

  if (!newToken || typeof newToken !== 'string') {
    throw new Error('Refresh succeeded but no access token was returned.')
  }

  useAuthStore.getState().setAccessToken(newToken)
  return newToken
}

async function getFreshAccessToken(options?: { clearOnFailure?: boolean }): Promise<string> {
  const clearOnFailure = options?.clearOnFailure ?? true

  if (!refreshPromise) {
    refreshPromise = requestNewAccessToken()
      .catch((error) => {
        if (clearOnFailure) {
          useAuthStore.getState().clearAuth()
        }
        throw error
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

// Expose this so the app can silently refresh before expiry.
export async function refreshAccessTokenSilently(): Promise<string | null> {
  try {
    return await getFreshAccessToken({ clearOnFailure: false })
  } catch (error) {
    console.error('Silent refresh failed:', error)
    return null
  }
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  return setAuthHeader(config, token)
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status
    const originalRequest = error.config as RetryableRequest | undefined
    const currentAccessToken = useAuthStore.getState().accessToken

    if (!originalRequest) {
      return Promise.reject(error)
    }

    // If there is no access token in memory, a 401 should not trigger refresh loops.
    if (status === 401 && !currentAccessToken) {
      return Promise.reject(error)
    }

    // Never try to refresh the refresh request itself.
    if (originalRequest.url?.includes('/auth/refresh')) {
      useAuthStore.getState().clearAuth()
      return Promise.reject(error)
    }

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const newToken = await getFreshAccessToken()
        setAuthHeader(originalRequest, newToken)
        return api(originalRequest)
      } catch (refreshError) {
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api