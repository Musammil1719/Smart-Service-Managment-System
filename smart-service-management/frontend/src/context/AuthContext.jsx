import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../utils/api'
import AuthContext from './AuthContextValue'

const userRoles = new Set(['customer', 'technician', 'admin'])

function normalizeUser(user, existingUser = null) {
  if (!user || typeof user !== 'object' || !userRoles.has(user.role)) {
    return null
  }

  const id = user.id || user.userId || existingUser?.id || existingUser?.userId
  const name = user.name || existingUser?.name
  const email = user.email || existingUser?.email

  if (typeof id !== 'string' || typeof email !== 'string') {
    return null
  }

  return { id, userId: id, name: name || email, email, role: user.role }
}

function clearStoredAuthentication() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const restorationRef = useRef(null)
  const redirectToLoginRef = useRef(false)

  const clearAuthentication = useCallback((redirect = false) => {
    clearStoredAuthentication()
    setToken(null)
    setUser(null)
    setLoading(false)
    redirectToLoginRef.current = redirect
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => clearAuthentication(true)
    window.addEventListener('ssms:unauthorized', handleUnauthorized)

    if (!restorationRef.current) {
      restorationRef.current = (async () => {
        const storedToken = localStorage.getItem('token')
        const storedUserText = localStorage.getItem('user')

        if (!storedToken || !storedUserText) {
          clearStoredAuthentication()
          return null
        }

        let storedUser
        try {
          storedUser = JSON.parse(storedUserText)
        } catch {
          clearStoredAuthentication()
          return null
        }

        const normalizedStoredUser = normalizeUser(storedUser)
        if (!normalizedStoredUser) {
          clearStoredAuthentication()
          return null
        }

        try {
          const verifiedUser = await apiRequest('/api/auth/me', { token: storedToken })
          if (verifiedUser.userId !== normalizedStoredUser.id) {
            clearStoredAuthentication()
            return null
          }

          const restoredUser = normalizeUser(verifiedUser, normalizedStoredUser)
          if (!restoredUser) {
            clearStoredAuthentication()
            return null
          }

          localStorage.setItem('user', JSON.stringify(restoredUser))
          return { token: storedToken, user: restoredUser }
        } catch {
          clearStoredAuthentication()
          return null
        }
      })()
    }

    let isMounted = true
    restorationRef.current.then((authentication) => {
      if (isMounted) {
        setToken(authentication?.token || null)
        setUser(authentication?.user || null)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      window.removeEventListener('ssms:unauthorized', handleUnauthorized)
    }
  }, [clearAuthentication])

  useEffect(() => {
    if (redirectToLoginRef.current && !loading && !token && !user) {
      redirectToLoginRef.current = false
      navigate('/login', { replace: true })
    }
  }, [loading, token, user, navigate])

  const login = useCallback(async (credentials) => {
    const result = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: credentials,
    })
    const authenticatedUser = normalizeUser(result.user)

    if (typeof result.token !== 'string' || !authenticatedUser) {
      throw new Error('The login response was incomplete. Please try again.')
    }

    localStorage.setItem('token', result.token)
    localStorage.setItem('user', JSON.stringify(authenticatedUser))
    setToken(result.token)
    setUser(authenticatedUser)
    setLoading(false)
    redirectToLoginRef.current = false

    return authenticatedUser
  }, [])

  const logout = useCallback(() => {
    clearAuthentication(true)
  }, [clearAuthentication])

  const value = useMemo(() => ({
    token,
    user,
    isAuthenticated: Boolean(token && user),
    loading,
    login,
    logout,
  }), [token, user, loading, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
