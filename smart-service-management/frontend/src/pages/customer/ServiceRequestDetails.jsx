import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import RequestConfirmationModal from '../../components/serviceRequests/RequestConfirmationModal'
import RequestStatusBadge from '../../components/serviceRequests/RequestStatusBadge'
import { apiRequest } from '../../utils/api'
import { getEntityId, getReviewForServiceRequest } from '../../utils/reviews'
import {
  formatDate,
  getDisplayName,
  getRequestErrorMessage,
  getServiceName,
} from '../../utils/serviceRequests'

function ServiceRequestDetails() {
  const { id } = useParams()
  const { user } = useAuth()
  const [request, setRequest] = useState(null)
  const [review, setReview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviewStatusError, setReviewStatusError] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const loadRequest = useCallback(async () => {
    const result = await apiRequest(`/api/service-requests/${encodeURIComponent(id)}`)
    if (!result?.serviceRequest) {
      throw new Error('Unexpected service request response.')
    }

    return result.serviceRequest
  }, [id])

  useEffect(() => {
    let active = true
    async function loadDetails() {
      try {
        const record = await loadRequest()
        if (getEntityId(record.customer) !== user.id) {
          throw Object.assign(new Error('Not authorized.'), { status: 403 })
        }

        if (active) {
          setRequest(record)
        }

        if (record.status === 'Completed') {
          try {
            const result = await apiRequest('/api/reviews/my')
            if (!Array.isArray(result?.reviews)) {
              throw new Error('Unexpected reviews response.')
            }
            if (active) {
              setReview(getReviewForServiceRequest(result.reviews, record.id))
            }
          } catch {
            if (active) {
              setReviewStatusError(true)
            }
          }
        }
      } catch (loadError) {
        if (active) {
          setError(getRequestErrorMessage(loadError))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadDetails()

    return () => {
      active = false
    }
  }, [loadRequest, user.id])

  async function cancelRequest() {
    setCancelling(true)
    setError('')
    try {
      const result = await apiRequest(`/api/service-requests/${encodeURIComponent(id)}/cancel`, {
        method: 'PUT',
      })
      if (result?.serviceRequest) {
        setRequest((current) => ({
          ...current,
          ...result.serviceRequest,
          service: current.service,
          customer: current.customer,
          technician: current.technician,
        }))
      }
      setMessage(result?.message || 'Service request cancelled successfully.')
      setConfirmCancel(false)
      try {
        setRequest(await loadRequest())
      } catch {
        setError('The request was cancelled, but its details could not be refreshed. Reload the page to see the latest status.')
      }
    } catch (cancelError) {
      setError(cancelError.status === 403
        ? 'You do not have permission to cancel this service request.'
        : cancelError.status >= 500
          ? 'Unable to cancel this request. Please try again.'
          : cancelError.message || 'Unable to cancel this request.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <main className="container py-4 py-lg-5 service-page">
      <div className="mb-4">
        <Link className="link-primary text-decoration-none" to="/customer/service-requests">
          <i className="bi bi-arrow-left me-2" aria-hidden="true" />
          Back to my requests
        </Link>
      </div>
      {loading ? (
        <div className="d-flex align-items-center gap-3 py-5" role="status">
          <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
          <span>Loading service requests...</span>
        </div>
      ) : error && !request ? (
        <div className="alert alert-danger" role="alert">{error}</div>
      ) : request ? (
        <>
          {message && <div className="alert alert-success" role="status">{message}</div>}
          {error && <div className="alert alert-danger" role="alert">{error}</div>}
          <section className="card border-0 shadow-sm service-table-card">
            <div className="card-body p-4 p-lg-5">
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-start gap-3 mb-4">
                <div>
                  <p className="small text-primary fw-semibold text-uppercase mb-2">
                    {request.service?.category || 'Service request'}
                  </p>
                  <h1 className="h2 fw-bold mb-0">{getServiceName(request.service)}</h1>
                </div>
                <RequestStatusBadge status={request.status} />
              </div>
              <p className="text-body-secondary mb-4">{request.description}</p>
              <div className="row g-4">
                <div className="col-12 col-md-6">
                  <div className="small text-body-secondary">Preferred date</div>
                  <div className="fw-medium">{formatDate(request.preferredDate)}</div>
                </div>
                <div className="col-12 col-md-6">
                  <div className="small text-body-secondary">Technician</div>
                  <div className="fw-medium">{getDisplayName(request.technician)}</div>
                </div>
                <div className="col-12 col-md-6">
                  <div className="small text-body-secondary">Created</div>
                  <div className="fw-medium">{formatDate(request.createdAt)}</div>
                </div>
                {request.completedAt && (
                  <div className="col-12 col-md-6">
                    <div className="small text-body-secondary">Completed</div>
                    <div className="fw-medium">{formatDate(request.completedAt)}</div>
                  </div>
                )}
              </div>
              {request.status === 'Completed' && (
                <>
                  <div className="alert alert-success mt-4">
                    <i className="bi bi-check-circle me-2" aria-hidden="true" />
                    This service request has been completed.
                  </div>
                  {reviewStatusError ? (
                    <div className="alert alert-warning">
                      Review status could not be checked. Refresh the page before submitting a review.
                    </div>
                  ) : review ? (
                    <Link className="btn btn-outline-primary" to={`/customer/reviews/${encodeURIComponent(review.id)}`}>
                      <i className="bi bi-star me-2" aria-hidden="true" />
                      View review
                    </Link>
                  ) : (
                    <Link className="btn btn-primary" to={`/customer/service-requests/${encodeURIComponent(id)}/review`}>
                      <i className="bi bi-star me-2" aria-hidden="true" />
                      Leave review
                    </Link>
                  )}
                </>
              )}
              {request.status === 'Cancelled' && (
                <div className="alert alert-secondary mt-4 mb-0">
                  This service request was cancelled.
                </div>
              )}
              {['Pending', 'Assigned'].includes(request.status) && (
                <div className="border-top mt-4 pt-4">
                  <button
                    className="btn btn-outline-danger"
                    type="button"
                    onClick={() => setConfirmCancel(true)}
                  >
                    <i className="bi bi-x-circle me-2" aria-hidden="true" />
                    Cancel request
                  </button>
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <div className="alert alert-light border" role="status">No service requests found.</div>
      )}
      <RequestConfirmationModal
        action={confirmCancel ? {
          title: 'Cancel service request?',
          message: 'Are you sure you want to cancel this service request?',
          confirmLabel: 'Cancel request',
          variant: 'btn-danger',
        } : null}
        busy={cancelling}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={cancelRequest}
      />
    </main>
  )
}

export default ServiceRequestDetails
