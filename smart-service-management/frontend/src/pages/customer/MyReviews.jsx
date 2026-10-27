import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import StarRating from '../../components/reviews/StarRating'
import { apiRequest } from '../../utils/api'
import { getReviewErrorMessage } from '../../utils/reviews'
import { formatDate, getServiceName } from '../../utils/serviceRequests'

function MyReviews() {
  const location = useLocation()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    apiRequest('/api/reviews/my')
      .then((result) => {
        if (!Array.isArray(result?.reviews)) {
          throw new Error('Unexpected reviews response.')
        }
        if (active) {
          setReviews(result.reviews)
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError.status === 401
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
  }, [])

  return (
    <main className="container py-4 py-lg-5 service-page">
      <header className="mb-4">
        <p className="small text-primary fw-semibold text-uppercase mb-2">Customer reviews</p>
        <h1 className="display-6 fw-bold mb-2">My reviews</h1>
        <p className="text-body-secondary mb-0">Your feedback for completed service requests.</p>
      </header>
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
      ) : reviews.length === 0 ? (
        <div className="alert alert-light border" role="status">No reviews yet.</div>
      ) : (
        <div className="row g-4">
          {reviews.map((review) => (
            <div className="col-12 col-md-6 col-xl-4" key={review.id}>
              <article className="card h-100 border-0 shadow-sm service-card">
                <div className="card-body d-flex flex-column p-4">
                  <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                    <div>
                      <p className="small text-primary fw-semibold text-uppercase mb-1">
                        {review.service?.category || 'Service'}
                      </p>
                      <h2 className="h5 fw-bold mb-0">{getServiceName(review.service)}</h2>
                    </div>
                    <span className="badge text-bg-light">Review</span>
                  </div>
                  <StarRating value={review.rating} />
                  <p className="my-3 flex-grow-1">{review.comment}</p>
                  <div className="small text-body-secondary border-top pt-3 mb-3">
                    Submitted {formatDate(review.createdAt)}
                  </div>
                  <Link className="btn btn-outline-primary btn-sm align-self-start" to={`/customer/reviews/${encodeURIComponent(review.id)}`}>
                    View review
                    <i className="bi bi-arrow-right ms-2" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

export default MyReviews
