import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './useAuth'
import NotificationContext from './NotificationContextValue'
import { apiRequest } from '../utils/api'

function getErrorMessage(error, action = 'load') {
  if (error?.status === 401) {
    return 'Your session has expired. Please sign in again.'
  }

  if (error?.status === 403) {
    return 'You do not have permission to access this notification.'
  }

  if (error?.status === 404) {
    return 'This notification or service request is no longer available.'
  }

  if (error?.status >= 500) {
    return `Unable to ${action} notifications. Please try again.`
  }

  return `Unable to ${action} notifications. Please check your connection and try again.`
}

export function NotificationProvider({ children }) {
  const { isAuthenticated, loading: authLoading, user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const activeUserIdRef = useRef(null)
  const fetchPromiseRef = useRef(null)

  const fetchNotifications = useCallback(async ({ force = false } = {}) => {
    const requestUserId = activeUserIdRef.current
    if (!requestUserId) {
      setNotifications([])
      setUnreadCount(0)
      setError('')
      return []
    }

    if (!force && fetchPromiseRef.current?.userId === requestUserId) {
      return fetchPromiseRef.current.promise
    }

    setLoading(true)
    setError('')
    const promise = apiRequest('/api/notifications')
      .then((result) => {
        if (!Array.isArray(result?.notifications)) {
          throw new Error('Unexpected notifications response.')
        }

        if (activeUserIdRef.current === requestUserId) {
          setNotifications(result.notifications)
          setUnreadCount(result.notifications.reduce(
            (count, notification) => count + (notification.isRead ? 0 : 1),
            0,
          ))
        }

        return result.notifications
      })
      .catch((loadError) => {
        if (activeUserIdRef.current === requestUserId) {
          setError(getErrorMessage(loadError))
        }
        throw loadError
      })
      .finally(() => {
        if (activeUserIdRef.current === requestUserId) {
          setLoading(false)
        }
        if (fetchPromiseRef.current?.promise === promise) {
          fetchPromiseRef.current = null
        }
      })

    fetchPromiseRef.current = { userId: requestUserId, promise }
    return promise
  }, [])

  const fetchUnreadCount = useCallback(async () => {
    if (!activeUserIdRef.current) {
      setUnreadCount(0)
      return 0
    }

    const requestUserId = activeUserIdRef.current
    try {
      const result = await apiRequest('/api/notifications/unread')
      if (!Array.isArray(result?.notifications)) {
        throw new Error('Unexpected unread notifications response.')
      }
      const count = result.notifications.length
      if (activeUserIdRef.current === requestUserId) {
        setUnreadCount(count)
      }
      return count
    } catch (fetchError) {
      if (activeUserIdRef.current === requestUserId) {
        setError(getErrorMessage(fetchError))
      }
      throw fetchError
    }
  }, [])

  const markAsRead = useCallback(async (notificationId) => {
    const notification = notifications.find((item) => item.id === notificationId)
    if (!notification || notification.isRead) {
      return notification || null
    }

    setError('')
    const result = await apiRequest(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: 'PUT',
    })
    setNotifications((current) => current.map((item) => (
      item.id === notificationId ? { ...item, isRead: true } : item
    )))
    setUnreadCount((current) => Math.max(0, current - 1))
    return result?.notification || { ...notification, isRead: true }
  }, [notifications])

  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0) {
      return
    }

    setError('')
    await apiRequest('/api/notifications/read-all', { method: 'PUT' })
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })))
    setUnreadCount(0)
  }, [unreadCount])

  const deleteNotification = useCallback(async (notificationId) => {
    const notification = notifications.find((item) => item.id === notificationId)
    if (!notification) {
      return
    }

    setError('')
    await apiRequest(`/api/notifications/${encodeURIComponent(notificationId)}`, {
      method: 'DELETE',
    })
    setNotifications((current) => current.filter((item) => item.id !== notificationId))
    if (!notification.isRead) {
      setUnreadCount((current) => Math.max(0, current - 1))
    }
  }, [notifications])

  const refreshNotifications = useCallback(() => fetchNotifications({ force: true }), [fetchNotifications])

  useEffect(() => {
    if (authLoading) {
      return undefined
    }

    const userId = isAuthenticated ? user?.id : null
    if (activeUserIdRef.current !== userId) {
      activeUserIdRef.current = userId
      fetchPromiseRef.current = null
      setNotifications([])
      setUnreadCount(0)
      setError('')
      setLoading(false)
    }

    if (userId) {
      fetchNotifications().catch(() => {})
    }
    return undefined
  }, [authLoading, isAuthenticated, user?.id, fetchNotifications])

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    getErrorMessage,
  }), [
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  ])

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}
