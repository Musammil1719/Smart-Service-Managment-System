import { formatDate } from '../../utils/serviceRequests'
import { getNotificationType } from '../../utils/notificationTypes'

function NotificationItem({
  notification,
  compact = false,
  onOpen,
  onMarkAsRead,
  onDelete,
  busyAction = '',
}) {
  const type = getNotificationType(notification.type)
  const title = notification.title || type.label

  return (
    <article className={`notification-item list-group-item ${notification.isRead ? 'notification-read' : 'notification-unread'} ${compact ? 'notification-item-compact' : ''}`}>
      <div className="d-flex align-items-start gap-3">
        <span className={`notification-type-icon text-${type.variant}`} aria-hidden="true">
          <i className={`bi ${type.icon}`} />
        </span>
        <div className="notification-content min-w-0 flex-grow-1">
          <div className="notification-heading-row d-flex align-items-start justify-content-between gap-3">
            <div className="min-w-0">
              {compact ? (
                <div className="fw-semibold notification-title">{title}</div>
              ) : (
                <h2 className="h6 fw-bold mb-1 notification-title">{title}</h2>
              )}
              {!compact && <div className="small text-body-secondary mb-2">{type.label}</div>}
            </div>
            <span
              className={`badge notification-status ${notification.isRead ? 'notification-status-read' : 'notification-status-unread'}`}
              role="status"
            >
              {notification.isRead ? 'Read' : 'Unread'}
            </span>
          </div>
          <p className={`notification-message mb-1 ${compact ? 'small' : ''}`}>
            {notification.message}
          </p>
          <time className="small text-body-secondary" dateTime={notification.createdAt}>
            {formatDate(notification.createdAt)}
          </time>
          {onOpen && !notification.isRead && (
            <button
              className={`stretched-link notification-open${compact ? ' notification-open-compact' : ''}`}
              onClick={() => onOpen(notification)}
              disabled={Boolean(busyAction)}
              type="button"
              aria-label={`Mark ${title} as read`}
            />
          )}
        </div>
      </div>
      {!compact && (onMarkAsRead || onDelete) && (
        <div className="d-flex flex-wrap gap-2 mt-3 ms-5">
          {!notification.isRead && onMarkAsRead && (
            <button
              className="btn btn-outline-primary btn-sm notification-action"
              disabled={Boolean(busyAction)}
              onClick={() => onMarkAsRead(notification.id)}
              type="button"
            >
              {busyAction === 'read' ? 'Marking as read...' : 'Mark as read'}
            </button>
          )}
          {onDelete && (
            <button
              className="btn btn-outline-danger btn-sm notification-action"
              disabled={Boolean(busyAction)}
              onClick={() => onDelete(notification)}
              type="button"
            >
              {busyAction === 'delete' ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      )}
    </article>
  )
}

export default NotificationItem
