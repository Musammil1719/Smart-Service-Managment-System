import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ServiceRequestCard from '../../components/serviceRequests/ServiceRequestCard'
import { apiRequest } from '../../utils/api'
import { getRequestErrorMessage } from '../../utils/serviceRequests'

function AssignedRequests() {
  const location = useLocation()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    apiRequest('/api/service-requests/assigned')
      .then((result) => {
        if (!Array.isArray(result?.serviceRequests)) {
          throw new Error('Unexpected service requests response.')
        }

        if (active) {
          setRequests(result.serviceRequests)
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(getRequestErrorMessage(loadError))
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
        <p className="small text-primary fw-semibold text-uppercase mb-2">Technician workspace</p>
        <h1 className="display-6 fw-bold mb-2">Assigned service requests</h1>
        <p className="text-body-secondary mb-0">Requests assigned to you are listed here.</p>
      </header>
      {location.state?.message && (
        <div className="alert alert-success" role="status">{location.state.message}</div>
      )}
      {loading ? (
        <div className="d-flex align-items-center gap-3 py-5" role="status">
          <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
          <span>Loading service requests...</span>
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">{error}</div>
      ) : requests.length === 0 ? (
        <div className="alert alert-light border" role="status">
          No service requests assigned to you.
        </div>
      ) : (
        <div className="row g-4">
          {requests.map((request) => (
            <div className="col-12 col-md-6 col-xl-4" key={request.id}>
              <ServiceRequestCard
                request={request}
                detailsPath={`/technician/service-requests/${encodeURIComponent(request.id)}`}
                showCustomer
                showTechnician={false}
                showServiceDescription
              />
            </div>
          ))}
        </div>
      )}
      <div className="mt-4">
        <Link to="/technician" className="link-primary text-decoration-none">
          <i className="bi bi-arrow-left me-2" aria-hidden="true" />
          Back to dashboard
        </Link>
      </div>
    </main>
  )
}

export default AssignedRequests
