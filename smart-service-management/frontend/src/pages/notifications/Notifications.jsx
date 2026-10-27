import { useState } from 'react'
import NotificationItem from '../../components/notifications/NotificationItem'
import { useNotifications } from '../../context/useNotifications'

function Notifications() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    getErrorMessage,
  } = useNotifications()
  const [busyNotification, setBusyNotification] = useState(null)
  const [markingAll, setMarkingAll] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function openNotification(notification) {
    if (notification.isRead) {
      return
    }
    await handleMarkAsRead(notification.id)
  }

  async function handleMarkAsRead(notificationId) {
    setBusyNotification({ id: notificationId, action: 'read' })
    setActionError('')
    setSuccessMessage('')
    try {
      await markAsRead(notificationId)
    } catch (actionFailure) {
      setActionError(getErrorMessage(actionFailure, 'update'))
    } finally {
      setBusyNotification(null)
    }
  }

  async function handleMarkAllAsRead() {
    setMarkingAll(true)
    setActionError('')
    setSuccessMessage('')
    try {
      await markAllAsRead()
      setSuccessMessage('All notifications marked as read.')
    } catch (actionFailure) {
      setActionError(getErrorMessage(actionFailure, 'update'))
    } finally {
      setMarkingAll(false)
    }
  }

  async function confirmDelete() {
    if (!selectedNotification) {
      return
    }

    const notification = selectedNotification
    setBusyNotification({ id: notification.id, action: 'delete' })
    setActionError('')
    setSuccessMessage('')
    try {
      await deleteNotification(notification.id)
      setSelectedNotification(null)
      setSuccessMessage('Notification deleted.')
    } catch (actionFailure) {
      setActionError(getErrorMessage(actionFailure, 'delete'))
    } finally {
      setBusyNotification(null)
    }
  }

  function retryLoad() {
    if (notifications.length === 0) {
      fetchNotifications({ force: true }).catch(() => {})
      return
    }
    refreshNotifications().catch(() => {})
  }

  return (
    <main className="container py-4 py-lg-5 notification-page">
      <section className="card border-0 shadow-sm notification-list-card">
        <header className="notification-page-header d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 p-3 p-md-4">
          <div className="d-flex align-items-center gap-3">
            <span className="notification-page-icon" aria-hidden="true">
              <i className="bi bi-bell" />
            </span>
            <div>
              <h1 className="h2 fw-bold mb-1">Notifications</h1>
              <p className="text-body-secondary mb-0">
                {unreadCount ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'You are all caught up.'}
              </p>
            </div>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button
              className="btn btn-outline-secondary"
              disabled={loading}
              onClick={retryLoad}
              type="button"
            >
              <i className="bi bi-arrow-clockwise me-2" aria-hidden="true" />
              Refresh
            </button>
            <button
              className="btn btn-primary"
              disabled={!unreadCount || markingAll}
              onClick={handleMarkAllAsRead}
              type="button"
            >
              {markingAll ? 'Marking all as read...' : 'Mark All as Read'}
            </button>
          </div>
        </header>

        {(error || actionError) && (
          <div className="alert alert-danger d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mx-3 mx-md-4 mt-3" role="alert">
            <span>{actionError || error || 'Unable to load notifications.'}</span>
            {error && (
              <button className="btn btn-outline-danger btn-sm" onClick={retryLoad} type="button">
                Try Again
              </button>
            )}
          </div>
        )}
        {successMessage && (
          <div className="alert alert-success mx-3 mx-md-4 mt-3" role="status">
            {successMessage}
          </div>
        )}

        {loading && notifications.length === 0 ? (
          <div className="d-flex align-items-center gap-3 p-4 p-md-5" role="status">
            <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
            <span>Loading notifications...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-bell display-5 text-body-secondary" aria-hidden="true" />
            <p className="fw-semibold mt-3 mb-0">No notifications yet.</p>
          </div>
        ) : (
          <div className="list-group list-group-flush">
            {notifications.map((notification) => (
              <NotificationItem
                busyAction={busyNotification?.id === notification.id ? busyNotification.action : ''}
                key={notification.id}
                notification={notification}
                onDelete={setSelectedNotification}
                onMarkAsRead={handleMarkAsRead}
                onOpen={openNotification}
              />
            ))}
          </div>
        )}
      </section>

      {selectedNotification && (
        <div className="service-modal-backdrop" role="presentation">
          <section className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="delete-notification-title">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header">
                  <h2 className="modal-title fs-5" id="delete-notification-title">Delete notification?</h2>
                  <button
                    aria-label="Close"
                    className="btn-close"
                    disabled={busyNotification?.action === 'delete'}
                    onClick={() => setSelectedNotification(null)}
                    type="button"
                  />
                </div>
                <div className="modal-body">Are you sure you want to delete this notification?</div>
                <div className="modal-footer">
                  <button
                    className="btn btn-outline-secondary"
                    disabled={busyNotification?.action === 'delete'}
                    onClick={() => setSelectedNotification(null)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-danger"
                    disabled={busyNotification?.action === 'delete'}
                    onClick={confirmDelete}
                    type="button"
                  >
                    {busyNotification?.action === 'delete' ? 'Deleting notification...' : 'Delete notification'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default Notifications
