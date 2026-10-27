export function getReviewForServiceRequest(reviews, serviceRequestId) {
  if (!Array.isArray(reviews) || !serviceRequestId) {
    return null
  }

  return reviews.find((review) => {
    const serviceRequest = review?.serviceRequest
    const id = typeof serviceRequest === 'string'
      ? serviceRequest
      : serviceRequest?.id || serviceRequest?._id

    return id === serviceRequestId
  }) || null
}

export function getEntityId(entity) {
  if (typeof entity === 'string') {
    return entity
  }

  if (entity && typeof entity === 'object') {
    const id = entity.id || entity._id
    return id ? String(id) : null
  }

  return null
}

export function getReviewErrorMessage(error) {
  if (error?.status === 400) {
    return 'Please check the review details and try again.'
  }

  if (error?.status === 401) {
    return 'Your session has expired. Please sign in again.'
  }

  if (error?.status === 403) {
    return 'You do not have permission to access this review.'
  }

  if (error?.status === 404) {
    return 'Review or service request not found.'
  }

  if (error?.status === 409) {
    return 'This service request has already been reviewed.'
  }

  if (error?.status >= 500) {
    return 'Unable to complete the review request. Please try again.'
  }

  return 'Unable to connect to the server. Please try again.'
}
