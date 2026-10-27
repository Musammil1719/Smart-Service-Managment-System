import { useCallback, useEffect, useState } from 'react'
import ServiceForm from '../../components/services/ServiceForm'
import { apiRequest } from '../../utils/api'

function ServiceManagement() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [editingService, setEditingService] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [pendingDeactivation, setPendingDeactivation] = useState(null)
  const [deactivating, setDeactivating] = useState(false)

  const fetchServices = useCallback(async () => {
    const result = await apiRequest('/api/services')
    if (!Array.isArray(result?.services)) {
      throw new Error('Unexpected services response.')
    }

    return result.services
  }, [])

  const loadServices = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      setServices(await fetchServices())
    } catch (loadError) {
      setError(loadError.status === 403
        ? 'You do not have permission to manage services.'
        : 'Unable to load services.')
    } finally {
      setLoading(false)
    }
  }, [fetchServices])

  useEffect(() => {
    let active = true
    fetchServices()
      .then((records) => {
        if (active) {
          setServices(records)
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError.status === 403
            ? 'You do not have permission to manage services.'
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
  }, [fetchServices])

  async function saveService(values) {
    setSubmitting(true)
    setError('')
    try {
      const editingId = editingService && (editingService.id || editingService._id)
      const result = await apiRequest(
        editingId ? `/api/services/${encodeURIComponent(editingId)}` : '/api/services',
        {
          method: editingId ? 'PUT' : 'POST',
          body: values,
        },
      )
      setMessage(result?.message || (editingId ? 'Service updated successfully.' : 'Service created successfully.'))
      setFormOpen(false)
      setEditingService(null)
      await loadServices()
    } catch (saveError) {
      setError(saveError.status === 403
        ? 'You do not have permission to manage services.'
        : saveError.status >= 500
          ? 'Unable to save this service. Please try again.'
          : saveError.message || 'Unable to save this service.')
      throw saveError
    } finally {
      setSubmitting(false)
    }
  }

  function openCreateForm() {
    setMessage('')
    setError('')
    setEditingService(null)
    setFormOpen(true)
  }

  function openEditForm(service) {
    setMessage('')
    setError('')
    setEditingService(service)
    setFormOpen(true)
  }

  async function reactivateService(service) {
    setMessage('')
    setError('')
    const id = service.id || service._id
    try {
      const result = await apiRequest(`/api/services/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: { isActive: true },
      })
      setMessage(result?.message || 'Service reactivated successfully.')
      await loadServices()
    } catch (reactivationError) {
      setError(reactivationError.status === 403
        ? 'You do not have permission to manage services.'
        : reactivationError.status >= 500
          ? 'Unable to reactivate this service. Please try again.'
          : reactivationError.message || 'Unable to reactivate this service.')
    }
  }

  async function deactivateService() {
    if (!pendingDeactivation) {
      return
    }

    setDeactivating(true)
    setMessage('')
    setError('')
    const id = pendingDeactivation.id || pendingDeactivation._id
    try {
      const result = await apiRequest(`/api/services/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      setMessage(result?.message || 'Service deactivated successfully.')
      setPendingDeactivation(null)
      await loadServices()
    } catch (deactivationError) {
      setError(deactivationError.status === 403
        ? 'You do not have permission to manage services.'
        : deactivationError.status >= 500
          ? 'Unable to deactivate this service. Please try again.'
          : deactivationError.message || 'Unable to deactivate this service.')
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <main className="container py-4 py-lg-5 service-page">
      <header className="d-flex flex-column flex-sm-row align-items-sm-end justify-content-between gap-3 mb-4">
        <div>
          <p className="small text-primary fw-semibold text-uppercase mb-2">Administration</p>
          <h1 className="display-6 fw-bold mb-2">Service Management</h1>
          <p className="text-body-secondary mb-0">
            Add, edit, activate and deactivate catalogue services.
          </p>
        </div>
        <button className="btn btn-primary flex-shrink-0" type="button" onClick={openCreateForm}>
          <i className="bi bi-plus-lg me-2" aria-hidden="true" />
          Add service
        </button>
      </header>

      {message && (
        <div className="alert alert-success alert-dismissible fade show" role="status">
          {message}
          <button className="btn-close" type="button" aria-label="Dismiss message" onClick={() => setMessage('')} />
        </div>
      )}
      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      {loading ? (
        <div className="d-flex align-items-center gap-3 py-5" role="status">
          <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
          <span className="text-body-secondary">Loading services...</span>
        </div>
      ) : services.length === 0 ? (
        <div className="alert alert-light border" role="status">No services available.</div>
      ) : (
        <div className="card border-0 shadow-sm service-table-card">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">Service</th>
                  <th scope="col">Category</th>
                  <th scope="col">Price</th>
                  <th scope="col">Duration</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id || service._id}>
                    <td>
                      <div className="fw-semibold">{service.name}</div>
                      <div className="small text-body-secondary service-description-cell">
                        {service.description}
                      </div>
                    </td>
                    <td>{service.category}</td>
                    <td className="text-nowrap">
                      <i className="bi bi-currency-rupee" aria-hidden="true" />
                      {Number(service.price).toLocaleString('en-IN')}
                    </td>
                    <td className="text-nowrap">{service.duration}</td>
                    <td>
                      <span className={`badge ${service.isActive ? 'text-bg-success' : 'text-bg-secondary'}`}>
                        {service.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex justify-content-end flex-wrap gap-2">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          type="button"
                          onClick={() => openEditForm(service)}
                          aria-label={`Edit ${service.name}`}
                        >
                          <i className="bi bi-pencil me-sm-1" aria-hidden="true" />
                          <span className="d-none d-sm-inline">Edit</span>
                        </button>
                        {service.isActive ? (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            type="button"
                            onClick={() => {
                              setMessage('')
                              setPendingDeactivation(service)
                            }}
                            aria-label={`Deactivate ${service.name}`}
                          >
                            <i className="bi bi-pause-circle me-sm-1" aria-hidden="true" />
                            <span className="d-none d-sm-inline">Deactivate</span>
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-outline-success"
                            type="button"
                            onClick={() => reactivateService(service)}
                            aria-label={`Reactivate ${service.name}`}
                          >
                            <i className="bi bi-play-circle me-sm-1" aria-hidden="true" />
                            <span className="d-none d-sm-inline">Reactivate</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="service-modal-backdrop" role="presentation">
          <section
            className="modal d-block"
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-form-title"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !submitting) {
                setFormOpen(false)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content border-0 shadow">
                <div className="modal-header">
                  <h2 className="modal-title fs-5" id="service-form-title">
                    {editingService ? 'Edit service' : 'Add service'}
                  </h2>
                  <button
                    className="btn-close"
                    type="button"
                    aria-label="Close"
                    disabled={submitting}
                    onClick={() => setFormOpen(false)}
                  />
                </div>
                <div className="modal-body p-4">
                  <ServiceForm
                    key={editingService?.id || editingService?._id || 'new-service'}
                    service={editingService}
                    onCancel={() => setFormOpen(false)}
                    onSubmit={saveService}
                    submitting={submitting}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {pendingDeactivation && (
        <div className="service-modal-backdrop" role="presentation">
          <section className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="deactivate-title">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header">
                  <h2 className="modal-title fs-5" id="deactivate-title">Deactivate service?</h2>
                  <button
                    className="btn-close"
                    type="button"
                    aria-label="Close"
                    disabled={deactivating}
                    onClick={() => setPendingDeactivation(null)}
                  />
                </div>
                <div className="modal-body">
                  Are you sure you want to deactivate this service?
                  <div className="fw-semibold mt-2">{pendingDeactivation.name}</div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    disabled={deactivating}
                    onClick={() => setPendingDeactivation(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-danger"
                    type="button"
                    disabled={deactivating}
                    onClick={deactivateService}
                  >
                    {deactivating ? 'Deactivating...' : 'Deactivate'}
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

export default ServiceManagement
