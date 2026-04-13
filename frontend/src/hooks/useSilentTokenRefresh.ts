import { useEffect, useRef } from 'react'
import { useAuthStore } from '../api/authStore'
import { getTokenExpiryMs } from '../api/jwt'
import { refreshAccessTokenSilently } from '../api/axios'

const REFRESH_EARLY_MS = 60_000 // refresh 1 minute before expiry
const MIN_DELAY_MS = 5_000 // avoid immediate tight loops

export function useSilentTokenRefresh() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const clearExistingTimer = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    clearExistingTimer()

    if (!accessToken) {
      return clearExistingTimer
    }

    const expiryMs = getTokenExpiryMs(accessToken)
    if (!expiryMs) {
      return clearExistingTimer
    }

    const delay = Math.max(expiryMs - Date.now() - REFRESH_EARLY_MS, MIN_DELAY_MS)

    timeoutRef.current = window.setTimeout(async () => {
      await refreshAccessTokenSilently()
    }, delay)

    return clearExistingTimer
  }, [accessToken])
}