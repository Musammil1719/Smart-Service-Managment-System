import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useNotifications } from '../context/useNotifications'
import { apiRequest } from '../utils/api'

const dashboardPaths = {
  customer: '/customer',
  technician: '/technician',
  admin: '/admin',
}

const roleNavigation = {
  customer: [
    { label: 'Services', path: '/services', icon: 'bi-grid' },
    { label: 'My Service Requests', path: '/customer/service-requests', icon: 'bi-clipboard-check' },
    { label: 'Create Request', path: '/customer/service-requests/new', icon: 'bi-plus-circle' },
    { label: 'My Reviews', path: '/customer/reviews', icon: 'bi-star' },
  ],
  technician: [
    { label: 'Services', path: '/services', icon: 'bi-grid' },
    { label: 'Assigned Requests', path: '/technician/service-requests', icon: 'bi-clipboard-check' },
  ],
  admin: [
    { label: 'Services', path: '/services', icon: 'bi-grid' },
    { label: 'Manage Services', path: '/admin/services', icon: 'bi-sliders' },
    { label: 'Service Requests', path: '/admin/service-requests', icon: 'bi-clipboard-check' },
    { label: 'Reviews', path: '/admin/reviews', icon: 'bi-star' },
  ],
}

function Navbar({ sidebarCollapsed, onToggleSidebar }) {
  const { isAuthenticated, loading, logout, user } = useAuth()
  const { unreadCount } = useNotifications()
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [passwordFormOpen, setPasswordFormOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const dashboardPath = user ? dashboardPaths[user.role] : null
  const [desktopNavigation, setDesktopNavigation] = useState(
    () => window.matchMedia('(min-width: 992px)').matches,
  )

  useEffect(() => {
    const breakpoint = window.matchMedia('(min-width: 992px)')
    const updateBreakpoint = (event) => setDesktopNavigation(event.matches)
    breakpoint.addEventListener('change', updateBreakpoint)
    return () => breakpoint.removeEventListener('change', updateBreakpoint)
  }, [])

  function closeMenu() {
    setMenuOpen(false)
    setAccountMenuOpen(false)
  }

  function closePasswordForm() {
    setPasswordFormOpen(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
    setPasswordError('')
  }

  function toggleNavigation() {
    if (window.matchMedia('(min-width: 992px)').matches) {
      onToggleSidebar()
    } else {
      setMenuOpen((open) => !open)
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError('Complete all password fields.')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New password and confirmation do not match.')
      return
    }

    setPasswordSubmitting(true)
    try {
      const result = await apiRequest('/api/auth/change-password', {
        method: 'PUT',
        body: { currentPassword, newPassword },
      })
      closePasswordForm()
      setPasswordSuccess(result?.message || 'Password changed successfully.')
    } catch (error) {
      setPasswordError(error.message || 'Unable to change password. Please try again.')
    } finally {
      setPasswordSubmitting(false)
    }
  }

  return (
    <>
      <header className="app-header navbar navbar-dark bg-primary">
        <div className="app-header-brand">
          <button
            aria-label={desktopNavigation
              ? sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
              : menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={desktopNavigation ? !sidebarCollapsed : menuOpen}
            className="btn btn-link text-white app-sidebar-toggle"
            onClick={toggleNavigation}
            type="button"
          >
            <i className="bi bi-list" aria-hidden="true" />
          </button>
          <Link className="navbar-brand d-flex align-items-center" to="/">
            <i className="bi bi-tools me-2" aria-hidden="true" />
            <span>SSMS</span>
            <span className="d-none d-sm-inline ms-2 fw-normal opacity-75">
              Smart Service Management
            </span>
          </Link>
        </div>
        <div className="app-header-account">
          {isAuthenticated && user && (
            <div className="d-flex align-items-center gap-2">
              <Link
                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                className="btn btn-link text-white app-header-notifications"
                onClick={() => setAccountMenuOpen(false)}
                title="Notifications"
                to="/notifications"
              >
                <i className="bi bi-bell" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="badge rounded-pill text-bg-danger notification-count">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
              <div className="account-menu">
              <button
                aria-expanded={accountMenuOpen}
                className="btn btn-outline-light account-menu-toggle"
                onClick={() => {
                  setAccountMenuOpen((open) => !open)
                  closePasswordForm()
                  setPasswordSuccess('')
                }}
                type="button"
              >
                <i className="bi bi-person-circle me-2" aria-hidden="true" />
                {user.name}
              </button>
              {accountMenuOpen && (
                <section className="account-popover shadow" aria-label="Account menu">
                  <div className="fw-semibold">{user.name}</div>
                  <div className="small text-body-secondary text-break">{user.email}</div>
                  {passwordSuccess && (
                    <div className="alert alert-success py-2 px-3 mt-3 mb-0 small" role="status">
                      {passwordSuccess}
                    </div>
                  )}
                  {passwordFormOpen ? (
                    <form className="mt-3" onSubmit={handleChangePassword}>
                      {passwordError && (
                        <div className="alert alert-danger py-2 px-3 small" role="alert">
                          {passwordError}
                        </div>
                      )}
                      <div className="mb-3">
                        <label className="form-label small mb-1" htmlFor="navbar-current-password">
                          Current Password
                        </label>
                        <input
                          autoComplete="current-password"
                          className="form-control form-control-sm"
                          id="navbar-current-password"
                          onChange={(event) => setCurrentPassword(event.target.value)}
                          required
                          type="password"
                          value={currentPassword}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label small mb-1" htmlFor="navbar-new-password">
                          New Password
                        </label>
                        <input
                          autoComplete="new-password"
                          className="form-control form-control-sm"
                          id="navbar-new-password"
                          onChange={(event) => setNewPassword(event.target.value)}
                          required
                          type="password"
                          value={newPassword}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label small mb-1" htmlFor="navbar-confirm-password">
                          Confirm New Password
                        </label>
                        <input
                          autoComplete="new-password"
                          className="form-control form-control-sm"
                          id="navbar-confirm-password"
                          onChange={(event) => setConfirmNewPassword(event.target.value)}
                          required
                          type="password"
                          value={confirmNewPassword}
                        />
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        <button className="btn btn-primary btn-sm" disabled={passwordSubmitting} type="submit">
                          {passwordSubmitting ? 'Changing...' : 'Change Password'}
                        </button>
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          disabled={passwordSubmitting}
                          onClick={closePasswordForm}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      className="btn btn-link p-0 mt-3 text-decoration-none"
                      onClick={() => {
                        setPasswordSuccess('')
                        setPasswordError('')
                        setPasswordFormOpen(true)
                      }}
                      type="button"
                    >
                      <i className="bi bi-lock me-2" aria-hidden="true" />
                      Reset Password
                    </button>
                  )}
                </section>
              )}
              </div>
            </div>
          )}
        </div>
      </header>
      <aside className={`app-sidebar${menuOpen ? ' sidebar-menu-open' : ''}`}>
        <div className="sidebar-navigation">
          {loading ? (
            <div className="navbar-nav flex-column align-items-start gap-1">
              <span className="nav-link">
                <span className="sidebar-label">Checking session...</span>
              </span>
            </div>
          ) : isAuthenticated ? (
            <div className="navbar-nav flex-column align-items-start gap-1">
              <NavLink
                aria-label="Dashboard"
                className="nav-link sidebar-link"
                title="Dashboard"
                to={dashboardPath}
                onClick={closeMenu}
              >
                <i className="bi bi-speedometer2 sidebar-icon" aria-hidden="true" />
                <span className="sidebar-label">Dashboard</span>
              </NavLink>
              {roleNavigation[user.role].map((item) => (
                <NavLink
                  aria-label={item.label}
                  className="nav-link sidebar-link"
                  key={item.path}
                  title={item.label}
                  to={item.path}
                  onClick={closeMenu}
                >
                  <i className={`bi ${item.icon} sidebar-icon`} aria-hidden="true" />
                  <span className="sidebar-label">{item.label}</span>
                </NavLink>
              ))}
              <NavLink
                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                className="nav-link sidebar-link"
                title="Notifications"
                to="/notifications"
                onClick={closeMenu}
              >
                <span className="sidebar-notification-icon">
                  <i className="bi bi-bell sidebar-icon" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span className="badge rounded-pill text-bg-danger notification-count">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </span>
                <span className="sidebar-label">Notifications</span>
              </NavLink>
              <button
                aria-label="Logout"
                className="btn btn-link nav-link sidebar-link text-start text-decoration-none"
                onClick={() => {
                  closeMenu()
                  setAccountMenuOpen(false)
                  logout()
                }}
                title="Logout"
                type="button"
              >
                <i className="bi bi-box-arrow-right sidebar-icon" aria-hidden="true" />
                <span className="sidebar-label">Logout</span>
              </button>
            </div>
          ) : (
            <div className="navbar-nav flex-column align-items-start gap-1">
              <NavLink className="nav-link sidebar-link" title="Login" to="/login" onClick={closeMenu}>
                <i className="bi bi-box-arrow-in-right sidebar-icon" aria-hidden="true" />
                <span className="sidebar-label">Login</span>
              </NavLink>
              <NavLink className="nav-link sidebar-link" title="Register" to="/register" onClick={closeMenu}>
                <i className="bi bi-person-plus sidebar-icon" aria-hidden="true" />
                <span className="sidebar-label">Register</span>
              </NavLink>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

export default Navbar
