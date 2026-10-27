import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ServiceRequestCard from '../../components/serviceRequests/ServiceRequestCard'
import ServiceCard from '../../components/services/ServiceCard'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../utils/api'
import { getRequestErrorMessage } from '../../utils/serviceRequests'

function Services() {
  const { user } = useAuth()
  const [services, setServices] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isTechnician = user?.role === 'technician'

  const fetchServices = useCallback(async () => {
    const result = await apiRequest('/api/services')
    if (!Array.isArray(result?.services)) {
      throw new Error('Unexpected services response.')
    }

    return result.services
  }, [])

  useEffect(() => {
    let active = true
    const loadContent = isTechnician
      ? apiRequest('/api/service-requests/assigned').then((result) => {
        if (!Array.isArray(result?.serviceRequests)) {
          throw new Error('Unexpected service requests response.')
        }

        return { requests: result.serviceRequests }
      })
      : fetchServices().then((records) => ({ services: records }))

    loadContent
      .then(({ requests: assignedRequests, services: serviceRecords }) => {
        if (active) {
          if (isTechnician) {
            setRequests(assignedRequests)
          } else {
            setServices(serviceRecords)
          }
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(isTechnician
            ? getRequestErrorMessage(loadError)
            : loadError.status === 403
              ? 'You do not have permission to view services.'
              : 'Unable to load services.')
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
  }, [fetchServices, isTechnician])

  return (
    <main className="container py-4 py-lg-5 service-page">
      <header className="d-flex flex-column flex-sm-row align-items-sm-end justify-content-between gap-3 mb-4">
        <div>
          <p className="small text-primary fw-semibold text-uppercase mb-2">
            {isTechnician ? 'Technician workspace' : 'Service catalogue'}
          </p>
          <h1 className="display-6 fw-bold mb-2">
            {isTechnician ? 'Assigned services' : 'Explore our services'}
          </h1>
          <p className="text-body-secondary mb-0">
            {isTechnician
              ? 'Services from requests assigned to you.'
              : 'Find the right service for your home and business needs.'}
          </p>
        </div>
        {user.role === 'admin' && (
          <Link className="btn btn-primary flex-shrink-0" to="/admin/services">
            <i className="bi bi-sliders me-2" aria-hidden="true" />
            Manage services
          </Link>
        )}
      </header>

      {loading ? (
        <div className="d-flex align-items-center gap-3 py-5" role="status">
          <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
          <span className="text-body-secondary">Loading services...</span>
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">{error}</div>
      ) : isTechnician && requests.length === 0 ? (
        <div className="alert alert-light border" role="status">
          No service requests assigned to you.
        </div>
      ) : !isTechnician && services.length === 0 ? (
        <div className="alert alert-light border" role="status">No services available.</div>
      ) : isTechnician ? (
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
      ) : (
        <div className="row g-4">
          {services.map((service) => (
            <div className="col-12 col-md-6 col-xl-4" key={service.id || service._id}>
              <ServiceCard service={service} showStatus={user.role === 'admin'} />
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

export default Services
