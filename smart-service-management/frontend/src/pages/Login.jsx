
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import './Login.css'

const dashboardPaths = {
  customer: '/customer',
  technician: '/technician',
  admin: '/admin',
}

function Login() {
  const { isAuthenticated, loading, login, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <main className="ssms-loading" role="status">
        <span className="spinner-border text-primary" aria-hidden="true" />
        <span>Restoring your session...</span>
      </main>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={dashboardPaths[user.role] || '/'} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const authenticatedUser = await login({
        email: email.trim(),
        password,
      })

      setPassword('')
      navigate(dashboardPaths[authenticatedUser.role] || '/', {
        replace: true,
      })
    } catch (loginError) {
      setError(loginError.message || 'Login failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="ssms-login-page">
      <section className="ssms-login-layout">
        <aside className="ssms-login-brand">
          <Link to="/" className="ssms-brand-logo">
            <span className="ssms-brand-icon">
              <i className="bi bi-tools" aria-hidden="true" />
            </span>
            <span>Smart<span className="ssms-brand-highlight">Serve</span></span>
          </Link>

          <div className="ssms-brand-content">
            <span className="ssms-eyebrow">
              SMART SERVICE MANAGEMENT SYSTEM
            </span>

            <h1>
              Service made
              <br />
              <span>simple.</span>
            </h1>

            <p>
              Manage service requests, connect with skilled technicians,
              and keep every service journey organized in one place.
            </p>

            <div className="ssms-feature-list">
              <div className="ssms-feature">
                <span className="ssms-feature-icon">
                  <i className="bi bi-calendar-check" aria-hidden="true" />
                </span>
                <div>
                  <strong>Easy service booking</strong>
                  <span>Create and track your requests.</span>
                </div>
              </div>

              <div className="ssms-feature">
                <span className="ssms-feature-icon">
                  <i className="bi bi-person-gear" aria-hidden="true" />
                </span>
                <div>
                  <strong>Connected service teams</strong>
                  <span>Keep customers and technicians connected.</span>
                </div>
              </div>

              <div className="ssms-feature">
                <span className="ssms-feature-icon">
                  <i className="bi bi-shield-check" aria-hidden="true" />
                </span>
                <div>
                  <strong>Organized management</strong>
                  <span>Follow service progress in one place.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="ssms-brand-footer">
            <i className="bi bi-check-circle me-2" aria-hidden="true" />
            One platform. Every service.
          </div>
        </aside>

        <section className="ssms-login-panel">
          <div className="ssms-login-form-wrap">
            <div className="ssms-mobile-logo">
              <span className="ssms-brand-icon">
                <i className="bi bi-tools" aria-hidden="true" />
              </span>
              <span>Smart<span className="ssms-brand-highlight">Serve</span></span>
            </div>

            <div className="ssms-form-heading">
              <span className="ssms-welcome-icon">
                <i className="bi bi-person-lock" aria-hidden="true" />
              </span>
              <p className="ssms-form-kicker">WELCOME BACK</p>
              <h2>Sign in to your account</h2>
              <p>Enter your details to continue to your workspace.</p>
            </div>

            {location.state?.message && (
              <div className="alert alert-success" role="status">
                {location.state.message}
              </div>
            )}

            {error && (
              <div className="alert alert-danger" role="alert">
                <i className="bi bi-exclamation-circle me-2" aria-hidden="true" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="ssms-field">
                <label htmlFor="login-email">Email address</label>
                <div className="ssms-input-wrap">
                  <i className="bi bi-envelope" aria-hidden="true" />
                  <input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="ssms-field">
                <label htmlFor="login-password">Password</label>
                <div className="ssms-input-wrap">
                  <i className="bi bi-lock" aria-hidden="true" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <button
                    className="ssms-password-toggle"
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <i
                      className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>

              <button
                className="ssms-login-button"
                type="submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      aria-hidden="true"
                    />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <i className="bi bi-arrow-right" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <div className="ssms-register-prompt">
              Don&apos;t have an account? <Link to="/register">Create an account</Link>
            </div>

            <div className="ssms-security-note">
              <i className="bi bi-shield-lock" aria-hidden="true" />
              Your account is protected by secure authentication.
            </div>
          </div>

          <footer className="ssms-panel-footer">
            Smart Service Management System
          </footer>
        </section>
      </section>
    </main>
  )
}

export default Login
