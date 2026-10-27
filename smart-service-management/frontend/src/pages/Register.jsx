
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { apiRequest } from '../utils/api'
import './Register.css'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const dashboardPaths = {
  customer: '/customer',
  technician: '/technician',
  admin: '/admin',
}

function Register() {
  const { isAuthenticated, loading, user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('customer')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please complete all fields.')
      return
    }

    if (!emailPattern.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      const result = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: {
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        },
      })

      setPassword('')
      setConfirmPassword('')

      navigate('/login', {
        replace: true,
        state: {
          message: result.message || 'Registration successful. You can now log in.',
        },
      })
    } catch (registrationError) {
      setError(
        registrationError.message || 'Registration failed. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="ssms-register-page">
      <section className="ssms-register-layout">
        <aside className="ssms-register-brand">
          <Link to="/" className="ssms-register-logo">
            <span className="ssms-register-brand-icon">
              <i className="bi bi-tools" aria-hidden="true" />
            </span>
            <span>
              Smart<span className="ssms-register-highlight">Serve</span>
            </span>
          </Link>

          <div className="ssms-register-brand-content">
            <span className="ssms-register-eyebrow">
              YOUR SERVICE JOURNEY STARTS HERE
            </span>

            <h1>
              Join us.
              <br />
              <span>Get things done.</span>
            </h1>

            <p>
              Create your account to manage service requests, connect with
              technicians, and follow every step of your service journey.
            </p>

            <div className="ssms-register-features">
              <div className="ssms-register-feature">
                <span className="ssms-register-feature-icon">
                  <i className="bi bi-calendar-check" aria-hidden="true" />
                </span>
                <div>
                  <strong>Simple service requests</strong>
                  <span>Request and track services easily.</span>
                </div>
              </div>

              <div className="ssms-register-feature">
                <span className="ssms-register-feature-icon">
                  <i className="bi bi-people" aria-hidden="true" />
                </span>
                <div>
                  <strong>One connected platform</strong>
                  <span>Stay connected with your service team.</span>
                </div>
              </div>

              <div className="ssms-register-feature">
                <span className="ssms-register-feature-icon">
                  <i className="bi bi-shield-check" aria-hidden="true" />
                </span>
                <div>
                  <strong>Secure account access</strong>
                  <span>Your account is protected by authentication.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="ssms-register-brand-footer">
            <i className="bi bi-check-circle me-2" aria-hidden="true" />
            One platform. Every service.
          </div>
        </aside>

        <section className="ssms-register-panel">
          <div className="ssms-register-form-wrap">
            <Link to="/" className="ssms-register-mobile-logo">
              <span className="ssms-register-brand-icon">
                <i className="bi bi-tools" aria-hidden="true" />
              </span>
              <span>
                Smart<span className="ssms-register-highlight">Serve</span>
              </span>
            </Link>

            <div className="ssms-register-heading">
              <span className="ssms-register-welcome-icon">
                <i className="bi bi-person-plus" aria-hidden="true" />
              </span>
              <p className="ssms-register-kicker">GET STARTED</p>
              <h2>Create your account</h2>
              <p>Fill in your details to join SmartServe.</p>
            </div>

            {error && (
              <div className="alert alert-danger" role="alert">
                <i className="bi bi-exclamation-circle me-2" aria-hidden="true" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="ssms-register-field">
                <label htmlFor="register-name">Full name</label>
                <div className="ssms-register-input-wrap">
                  <i className="bi bi-person" aria-hidden="true" />
                  <input
                    id="register-name"
                    type="text"
                    placeholder="Enter your full name"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="ssms-register-field">
                <label htmlFor="register-email">Email address</label>
                <div className="ssms-register-input-wrap">
                  <i className="bi bi-envelope" aria-hidden="true" />
                  <input
                    id="register-email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="ssms-register-field">
                <label htmlFor="register-role">Account type</label>
                <div className="ssms-register-input-wrap">
                  <i className="bi bi-person-badge" aria-hidden="true" />
                  <select
                    id="register-role"
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    required
                  >
                    <option value="customer">Customer</option>
                    <option value="technician">Technician</option>
                  </select>
                  <i className="bi bi-chevron-down ssms-register-select-arrow" aria-hidden="true" />
                </div>
                <p className="ssms-register-help">
                  Choose the account type that suits you.
                </p>
              </div>

              <div className="ssms-register-field">
                <label htmlFor="register-password">Password</label>
                <div className="ssms-register-input-wrap">
                  <i className="bi bi-lock" aria-hidden="true" />
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <button
                    className="ssms-register-password-toggle"
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

              <div className="ssms-register-field">
                <label htmlFor="register-confirm-password">
                  Confirm password
                </label>
                <div className="ssms-register-input-wrap">
                  <i className="bi bi-lock-fill" aria-hidden="true" />
                  <input
                    id="register-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                  <button
                    className="ssms-register-password-toggle"
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    aria-label={
                      showConfirmPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    <i
                      className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>

              <button
                className="ssms-register-button"
                type="submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      aria-hidden="true"
                    />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create account
                    <i className="bi bi-arrow-right" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <div className="ssms-register-login-prompt">
              Already have an account? <Link to="/login">Sign in</Link>
            </div>

            <div className="ssms-register-security">
              <i className="bi bi-shield-lock" aria-hidden="true" />
              Your details are handled through secure account registration.
            </div>
          </div>

          <footer className="ssms-register-panel-footer">
            Smart Service Management System
          </footer>
        </section>
      </section>
    </main>
  )
}

export default Register
