const notificationTypes = {
  REQUEST_CREATED: { label: 'New Service Request', icon: 'bi-clipboard-plus', variant: 'info' },
  TECHNICIAN_ASSIGNED: { label: 'Technician Assigned', icon: 'bi-person-check', variant: 'primary' },
  REQUEST_ACCEPTED: { label: 'Request Accepted', icon: 'bi-check-circle', variant: 'success' },
  SERVICE_STARTED: { label: 'Service Started', icon: 'bi-tools', variant: 'warning' },
  SERVICE_COMPLETED: { label: 'Service Completed', icon: 'bi-check2-all', variant: 'success' },
  REQUEST_CANCELLED: { label: 'Request Cancelled', icon: 'bi-x-circle', variant: 'danger' },
  NEW_REVIEW: { label: 'New Review', icon: 'bi-star-fill', variant: 'warning' },
}

export function getNotificationType(type) {
  return notificationTypes[type] || { label: 'Notification', icon: 'bi-bell', variant: 'secondary' }
}
