import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const dashboardPaths = {
  customer: '/customer',
  technician: '/technician',
  admin: '/admin',
}

function Unauthorized() {
  const { isAuthenticated, user } = useAuth()
  const destination = isAuthenticated ? dashboardPaths[user.role] : '/login'

  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <section className="card border-0 shadow-sm text-center">
            <div className="card-body p-4 p-lg-5">
              <div className="auth-icon mx-auto mb-3 text-danger">
                <i className="bi bi-shield-lock" aria-hidden="true" />
              </div>
              <p className="text-danger fw-semibold mb-2">403</p>
              <h1 className="h3 fw-bold">Access Denied</h1>
              <p className="text-body-secondary mb-4">
                You do not have permission to access the requested page.
              </p>
              <Link className="btn btn-primary" to={destination}>
                Return to your dashboard
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export default Unauthorized
