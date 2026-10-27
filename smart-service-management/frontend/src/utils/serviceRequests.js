export function getDisplayName(person) {
  if (!person) {
    return 'Not assigned'
  }

  if (typeof person === 'string') {
    return 'User'
  }

  return person.name || person.email || 'Unknown'
}

export function getServiceName(service) {
  if (!service) {
    return 'Service unavailable'
  }

  if (typeof service === 'string') {
    return 'Service'
  }

  return service.name || 'Service unavailable'
}

export function formatDate(value, { includeTime = true } = {}) {
  if (!value) {
    return 'Not available'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Not available'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    ...(includeTime ? { timeStyle: 'short' } : {}),
  }).format(date)
}

export function getStatusVariant(status) {
  return {
    Pending: 'warning',
    Assigned: 'info',
    Accepted: 'primary',
    'In Progress': 'primary',
    Completed: 'success',
    Cancelled: 'secondary',
  }[status] || 'secondary'
}

export function getRequestErrorMessage(error) {
  if (error.status === 403) {
    return 'You do not have permission to access this service request.'
  }

  if (error.status === 404) {
    return 'Service request not found.'
  }

  return 'Unable to load service requests. Please try again.'
}
