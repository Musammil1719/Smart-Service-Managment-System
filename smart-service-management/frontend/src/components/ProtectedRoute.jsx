import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) {
    return (
      <main className="container py-5">
        <div className="d-flex align-items-center justify-content-center gap-3" role="status">
          <span className="spinner-border text-primary" aria-hidden="true" />
          <span className="text-body-secondary">Restoring your session...</span>
        </div>
      </main>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children || <Outlet />
}

export default ProtectedRoute
