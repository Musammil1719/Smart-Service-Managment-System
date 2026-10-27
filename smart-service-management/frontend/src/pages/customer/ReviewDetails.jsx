import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import StarRating from '../../components/reviews/StarRating'
import { apiRequest } from '../../utils/api'
import { getReviewErrorMessage } from '../../utils/reviews'
import { formatDate, getServiceName } from '../../utils/serviceRequests'

function ReviewDetails() {
  const { id } = useParams()
  const location = useLocation()
  const [review, setReview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    apiRequest(`/api/reviews/${encodeURIComponent(id)}`)
      .then((result) => {
        if (!result?.review) {
          throw new Error('Unexpected review response.')
        }
        if (active) {
          setReview(result.review)
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError.status === 403 || loadError.status === 404
            ? 'This review is unavailable.'
            : loadError.status === 401
              ? getReviewErrorMessage(loadError)
              : 'Unable to load reviews.')
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [id])

  return (
    <main className="container py-4 py-lg-5 service-page">
      <div className="mb-4">
        <Link className="link-primary text-decoration-none" to="/customer/reviews">
          <i className="bi bi-arrow-left me-2" aria-hidden="true" />
          Back to my reviews
        </Link>
      </div>
      {location.state?.message && (
        <div className="alert alert-success" role="status">{location.state.message}</div>
      )}
      {loading ? (
        <div className="d-flex align-items-center gap-3 py-5" role="status">
          <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
          <span>Loading reviews...</span>
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">{error}</div>
      ) : review ? (
        <article className="card border-0 shadow-sm service-table-card">
          <div className="card-body p-4 p-lg-5">
            <p className="small text-primary fw-semibold text-uppercase mb-2">
              {review.service?.category || 'Service review'}
            </p>
            <h1 className="h2 fw-bold mb-3">{getServiceName(review.service)}</h1>
            <StarRating value={review.rating} />
            <blockquote className="border-start border-4 ps-3 my-4">
              <p className="mb-0">{review.comment}</p>
            </blockquote>
            <p className="small text-body-secondary mb-0">
              Submitted {formatDate(review.createdAt)}
            </p>
          </div>
        </article>
      ) : null}
    </main>
  )
}

export default ReviewDetails
