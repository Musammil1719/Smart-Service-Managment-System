function RoleDashboard({ description, icon, title, user }) {
  return (
    <main className="container py-4 py-lg-5 dashboard-shell">
      <div className="row justify-content-center">
        <div className="col-12 col-xl-10">
          <header className="mb-4">
            <p className="text-primary fw-semibold text-uppercase small mb-2">
              {user.role} workspace
            </p>
            <h1 className="display-6 fw-bold mb-2">{title}</h1>
            <p className="lead text-body-secondary mb-0">
              Welcome back, {user.name}.
            </p>
          </header>

          <section className="card border-0 shadow-sm dashboard-welcome">
            <div className="card-body p-4 p-lg-5">
              <div className="d-flex flex-column flex-sm-row align-items-sm-center gap-4">
                <div className="dashboard-icon rounded-4 text-primary d-flex align-items-center justify-content-center">
                  <i className={`bi ${icon}`} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="h4 fw-semibold">Your workspace is ready</h2>
                  <p className="text-body-secondary mb-3">{description}</p>
                  <span className="badge rounded-pill text-bg-primary-subtle text-primary px-3 py-2">
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export default RoleDashboard
