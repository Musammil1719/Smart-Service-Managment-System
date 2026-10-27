function ServiceCard({ service, showStatus = false }) {
  return (
    <article className="card h-100 border-0 shadow-sm service-card">
      <div className="card-body d-flex flex-column p-4">
        <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
          <div>
            <p className="small text-primary fw-semibold text-uppercase mb-1">
              {service.category}
            </p>
            <h2 className="h5 fw-bold mb-0">{service.name}</h2>
          </div>
          {showStatus && (
            <span className={`badge ${service.isActive ? 'text-bg-success' : 'text-bg-secondary'}`}>
              {service.isActive ? 'Active' : 'Inactive'}
            </span>
          )}
        </div>

        <p className="text-body-secondary flex-grow-1 mb-4">{service.description}</p>

        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 border-top pt-3">
          <span className="fw-bold fs-5 text-primary">
            <i className="bi bi-currency-rupee" aria-hidden="true" />
            {Number(service.price).toLocaleString('en-IN')}
          </span>
          <span className="small text-body-secondary">
            <i className="bi bi-clock me-1" aria-hidden="true" />
            {service.duration}
          </span>
        </div>
      </div>
    </article>
  )
}

export default ServiceCard
