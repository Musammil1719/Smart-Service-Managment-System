import { useEffect, useState } from 'react'
import StarRating from '../../components/reviews/StarRating'
import { apiRequest } from '../../utils/api'
import { getReviewErrorMessage } from '../../utils/reviews'
import { formatDate, getServiceName } from '../../utils/serviceRequests'

function ReviewManagement() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState('')
  const [selectedReview, setSelectedReview] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    apiRequest('/api/reviews')
      .then((result) => {
        if (!Array.isArray(result?.reviews)) {
          throw new Error('Unexpected reviews response.')
        }
        if (active) {
          setReviews(result.reviews)
        }
      })
      .catch(() => {
        if (active) {
          setError('Unable to load reviews.')
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

  async function deleteReview() {
    if (!selectedReview || deletingId) {
      return
    }

    setDeletingId(selectedReview.id)
    setError('')
    setMessage('')
    try {
      const result = await apiRequest(`/api/reviews/${encodeURIComponent(selectedReview.id)}`, {
        method: 'DELETE',
      })
      setReviews((current) => current.filter((review) => review.id !== selectedReview.id))
      setMessage(result?.message || 'Review deleted successfully.')
      setSelectedReview(null)
    } catch (deleteError) {
      setError(deleteError.status === 401
        ? getReviewErrorMessage(deleteError)
        : deleteError.status === 403
          ? 'You do not have permission to delete this review.'
          : deleteError.status === 404
            ? 'Review not found.'
            : 'Unable to delete the review. Please try again.')
    } finally {
      setDeletingId('')
    }
  }

  return (
    <main className="container py-4 py-lg-5 service-page">
      <header className="mb-4">
        <p className="small text-primary fw-semibold text-uppercase mb-2">Administration</p>
        <h1 className="display-6 fw-bold mb-2">Review management</h1>
        <p className="text-body-secondary mb-0">Review customer feedback and remove inappropriate entries.</p>
      </header>
      {message && <div className="alert alert-success" role="status">{message}</div>}
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {loading ? (
        <div className="d-flex align-items-center gap-3 py-5" role="status">
          <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
          <span>Loading reviews...</span>
        </div>
      ) : error && reviews.length === 0 ? null : reviews.length === 0 ? (
        <div className="alert alert-light border" role="status">No reviews yet.</div>
      ) : (
        <div className="card border-0 shadow-sm service-table-card">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">Customer</th>
                  <th scope="col">Service</th>
                  <th scope="col">Rating</th>
                  <th scope="col">Comment</th>
                  <th scope="col">Created</th>
                  <th scope="col" className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.id}>
                    <td>
                      <div className="fw-semibold">{review.customer?.name || 'Customer'}</div>
                      <div className="small text-body-secondary">{review.customer?.email || ''}</div>
                    </td>
                    <td>
                      <div className="fw-semibold">{getServiceName(review.service)}</div>
                      <div className="small text-body-secondary">{review.service?.category || ''}</div>
                    </td>
                    <td className="text-nowrap"><StarRating value={review.rating} /></td>
                    <td className="service-description-cell">{review.comment}</td>
                    <td className="text-nowrap">{formatDate(review.createdAt)}</td>
                    <td className="text-end">
                      <button
                        className="btn btn-outline-danger btn-sm"
                        disabled={Boolean(deletingId)}
                        onClick={() => setSelectedReview(review)}
                        type="button"
                      >
                        <i className="bi bi-trash me-1" aria-hidden="true" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedReview && (
        <div className="service-modal-backdrop" role="presentation">
          <section className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="delete-review-title">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header">
                  <h2 className="modal-title fs-5" id="delete-review-title">Delete review?</h2>
                  <button
                    aria-label="Close"
                    className="btn-close"
                    disabled={Boolean(deletingId)}
                    onClick={() => setSelectedReview(null)}
                    type="button"
                  />
                </div>
                <div className="modal-body">Are you sure you want to delete this review?</div>
                <div className="modal-footer">
                  <button
                    className="btn btn-outline-secondary"
                    disabled={Boolean(deletingId)}
                    onClick={() => setSelectedReview(null)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-danger"
                    disabled={Boolean(deletingId)}
                    onClick={deleteReview}
                    type="button"
                  >
                    {deletingId ? 'Deleting review...' : 'Delete review'}
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

export default ReviewManagement
