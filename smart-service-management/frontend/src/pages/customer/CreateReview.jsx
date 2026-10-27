import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import StarRating from '../../components/reviews/StarRating'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../utils/api'
import {
  getEntityId,
  getReviewErrorMessage,
  getReviewForServiceRequest,
} from '../../utils/reviews'
import { formatDate, getServiceName } from '../../utils/serviceRequests'

function CreateReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [request, setRequest] = useState(null)
  const [existingReview, setExistingReview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [errorStatus, setErrorStatus] = useState(0)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const submittingRef = useRef(false)

  useEffect(() => {
    let active = true

    async function loadReviewForm() {
      try {
        const result = await apiRequest(`/api/service-requests/${encodeURIComponent(id)}`)
        const record = result?.serviceRequest
        if (!record) {
          throw new Error('Unexpected service request response.')
        }

        if (getEntityId(record.customer) !== user.id) {
          throw Object.assign(new Error('Not authorized.'), { status: 403 })
        }

        if (active) {
          setRequest(record)
        }

        if (record.status === 'Completed') {
          const reviewsResult = await apiRequest('/api/reviews/my')
          if (!Array.isArray(reviewsResult?.reviews)) {
            throw new Error('Unexpected reviews response.')
          }

          const review = getReviewForServiceRequest(reviewsResult.reviews, record.id)
          if (active && review) {
            setExistingReview(review)
          }
        }
      } catch (loadError) {
        if (active) {
          setLoadError(loadError.status === 403
            ? 'You do not have permission to review this service request.'
            : loadError.status === 404
              ? 'Service request not found.'
              : loadError.status === 401
                ? 'Your session has expired. Please sign in again.'
                : 'Unable to load the review form. Please try again.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadReviewForm()
    return () => {
      active = false
    }
  }, [id, user.id])

  const trimmedComment = comment.trim()
  const canSubmit = Boolean(
    request?.status === 'Completed' &&
    !existingReview &&
    Number.isInteger(rating) &&
    rating >= 1 &&
    rating <= 5 &&
    trimmedComment &&
    !submitting,
  )

  async function submitReview(event) {
    event.preventDefault()
    if (!canSubmit || submittingRef.current) {
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    setError('')
    setErrorStatus(0)
    try {
      await apiRequest('/api/reviews', {
        method: 'POST',
        body: {
          serviceRequest: id,
          rating,
          comment: trimmedComment,
        },
      })
      navigate('/customer/reviews', {
        replace: true,
        state: { message: 'Review submitted successfully.' },
      })
    } catch (submitError) {
      setError(getReviewErrorMessage(submitError))
      setErrorStatus(submitError.status || 0)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <main className="container py-4 py-lg-5 service-page">
      <div className="mb-4">
        <Link className="link-primary text-decoration-none" to={`/customer/service-requests/${encodeURIComponent(id)}`}>
          <i className="bi bi-arrow-left me-2" aria-hidden="true" />
          Back to service request
        </Link>
      </div>
      <header className="mb-4">
        <p className="small text-primary fw-semibold text-uppercase mb-2">Customer reviews</p>
        <h1 className="display-6 fw-bold mb-2">How was your service?</h1>
        {request && (
          <p className="text-body-secondary mb-0">
            {getServiceName(request.service)} · Completed {formatDate(request.completedAt)}
          </p>
        )}
      </header>

      {loading ? (
        <div className="d-flex align-items-center gap-3 py-5" role="status">
          <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
          <span>Loading review form...</span>
        </div>
      ) : loadError ? (
        <div className="alert alert-danger" role="alert">{loadError}</div>
      ) : existingReview ? (
        <div className="alert alert-info d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3">
          <span>This service request has already been reviewed.</span>
          <Link className="btn btn-outline-primary btn-sm" to={`/customer/reviews/${encodeURIComponent(existingReview.id)}`}>
            View review
          </Link>
        </div>
      ) : request?.status !== 'Completed' ? (
        <div className="alert alert-warning" role="status">
          Only completed service requests can be reviewed.
        </div>
      ) : (
        <section className="card border-0 shadow-sm service-table-card">
          <div className="card-body p-4 p-lg-5">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
                {errorStatus === 409 && (
                  <div className="mt-2">
                    <Link to="/customer/reviews">View your reviews</Link>
                  </div>
                )}
              </div>
            )}
            <form onSubmit={submitReview}>
              <fieldset className="mb-4">
                <legend className="form-label fw-semibold">Your rating</legend>
                <StarRating
                  editable
                  label="Select a rating"
                  onChange={setRating}
                  value={rating}
                />
                <div className="form-text">
                  {rating ? `You selected ${rating} out of 5 stars.` : 'Select 1 to 5 stars.'}
                </div>
              </fieldset>
              <div className="mb-4">
                <label className="form-label fw-semibold" htmlFor="review-comment">Comment</label>
                <textarea
                  className="form-control"
                  id="review-comment"
                  maxLength={2000}
                  onChange={(event) => setComment(event.target.value)}
                  required
                  rows={5}
                  value={comment}
                />
                <div className="form-text">Please share a few details about your experience.</div>
              </div>
              <button className="btn btn-primary" disabled={!canSubmit} type="submit">
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                    Submitting review...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send me-2" aria-hidden="true" />
                    Submit review
                  </>
                )}
              </button>
            </form>
          </div>
        </section>
      )}
    </main>
  )
}

export default CreateReview
