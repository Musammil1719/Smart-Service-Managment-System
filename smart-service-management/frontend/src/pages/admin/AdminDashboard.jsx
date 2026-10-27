import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../utils/api'
import { formatDate, getStatusVariant } from '../../utils/serviceRequests'

const analyticsEndpoints = [
  { key: 'summary', path: '/summary', isValid: (value) => value && typeof value === 'object' && !Array.isArray(value) },
  { key: 'requestStatus', path: '/request-status', isValid: Array.isArray },
  { key: 'services', path: '/services', isValid: Array.isArray },
  { key: 'requestsByService', path: '/requests-by-service', isValid: Array.isArray },
  { key: 'technicians', path: '/technicians', isValid: Array.isArray },
  { key: 'recentRequests', path: '/recent-requests', isValid: Array.isArray },
  { key: 'recentReviews', path: '/recent-reviews', isValid: Array.isArray },
  { key: 'monthlyRequests', path: '/monthly-requests', isValid: Array.isArray },
  { key: 'monthlyCompleted', path: '/monthly-completed', isValid: Array.isArray },
  { key: 'topServices', path: '/top-services', isValid: Array.isArray },
  { key: 'topTechnicians', path: '/top-technicians', isValid: Array.isArray },
]

const sectionTitles = {
  summary: 'summary',
  requestStatus: 'request status',
  services: 'service analytics',
  requestsByService: 'requests by service',
  technicians: 'technician analytics',
  recentRequests: 'recent service requests',
  recentReviews: 'recent reviews',
  monthlyRequests: 'monthly requests',
  monthlyCompleted: 'monthly completions',
  topServices: 'top services',
  topTechnicians: 'top technicians',
}

function getLoadError(error, key) {
  if (error?.status === 401) {
    return 'Your session has expired. Please sign in again.'
  }
  if (error?.status === 403) {
    return 'You do not have permission to view admin analytics.'
  }
  return `Unable to load ${sectionTitles[key]}. Please try again.`
}

function displayNumber(value, digits = 0) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : '—'
}

function getRating(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? `${displayNumber(value, 1)} / 5`
    : 'No ratings'
}

function getPersonName(person) {
  return person && typeof person === 'object' ? person.name || 'Unknown' : 'Not assigned'
}

function getServiceName(service) {
  return service && typeof service === 'object' ? service.name || 'Unavailable' : 'Unavailable'
}

function DashboardSection({ title, icon, action, children, className = '' }) {
  return (
    <section className={`card border-0 shadow-sm admin-analytics-card ${className}`}>
      <div className="card-header bg-white border-0 px-3 px-lg-4 pt-4 pb-2">
        <div className="d-flex align-items-center justify-content-between gap-3">
          <h2 className="h5 fw-bold mb-0">
            <i className={`bi ${icon} text-primary me-2`} aria-hidden="true" />
            {title}
          </h2>
          {action}
        </div>
      </div>
      <div className="card-body px-3 px-lg-4 pt-2 pb-4">{children}</div>
    </section>
  )
}

function SectionContent({ loading, error, isEmpty, emptyMessage = 'No data available.', children }) {
  if (error) {
    return <div className="alert alert-danger mb-0" role="alert">{error}</div>
  }
  if (loading && isEmpty) {
    return (
      <div className="d-flex align-items-center gap-3 py-4" role="status">
        <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
        <span className="text-body-secondary">Loading analytics...</span>
      </div>
    )
  }
  if (isEmpty) {
    return <p className="text-body-secondary mb-0 py-2">{emptyMessage}</p>
  }
  return children
}

function MetricCard({ title, value, icon, tone = 'primary', suffix = '' }) {
  return (
    <article className="card h-100 border-0 shadow-sm admin-metric-card">
      <div className="card-body d-flex align-items-center gap-3 p-3 p-lg-4">
        <span className={`admin-metric-icon text-${tone} bg-${tone}-subtle`} aria-hidden="true">
          <i className={`bi ${icon}`} />
        </span>
        <div className="min-w-0">
          <p className="small text-body-secondary mb-1">{title}</p>
          <p className="h3 fw-bold mb-0">{value}{suffix}</p>
        </div>
      </div>
    </article>
  )
}

function AdminDashboard() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState({
    requestStatus: [],
    services: [],
    requestsByService: [],
    technicians: [],
    recentRequests: [],
    recentReviews: [],
    monthlyRequests: [],
    monthlyCompleted: [],
    topServices: [],
    topTechnicians: [],
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(false)
  const requestRef = useRef(null)

  const loadAnalytics = useCallback(() => {
    if (requestRef.current) {
      return requestRef.current
    }

    setLoading(true)
    setErrors({})
    const request = Promise.allSettled(analyticsEndpoints.map(async ({ key, path, isValid }) => {
      const result = await apiRequest(`/api/admin/analytics${path}`)
      if (!isValid(result)) {
        throw new Error(`Unexpected ${sectionTitles[key]} response.`)
      }
      return { key, result }
    }))
      .then((results) => {
        if (!mountedRef.current) {
          return
        }

        const nextAnalytics = {}
        const nextErrors = {}
        results.forEach((result, index) => {
          const { key } = analyticsEndpoints[index]
          if (result.status === 'fulfilled') {
            nextAnalytics[key] = result.value.result
          } else {
            nextErrors[key] = getLoadError(result.reason, key)
          }
        })
        setAnalytics((current) => ({ ...current, ...nextAnalytics }))
        setErrors(nextErrors)
      })
      .finally(() => {
        requestRef.current = null
        if (mountedRef.current) {
          setLoading(false)
        }
      })

    requestRef.current = request
    return request
  }, [])

  useEffect(() => {
    mountedRef.current = true
    loadAnalytics()
    return () => {
      mountedRef.current = false
    }
  }, [loadAnalytics])

  const summary = analytics.summary
  const summaryCards = summary ? [
    { title: 'Total Users', value: summary.users?.total, icon: 'bi-people', tone: 'primary' },
    { title: 'Customers', value: summary.users?.customers, icon: 'bi-person', tone: 'info' },
    { title: 'Technicians', value: summary.users?.technicians, icon: 'bi-person-gear', tone: 'success' },
    { title: 'Services', value: summary.services?.total, icon: 'bi-grid', tone: 'warning' },
    { title: 'Service Requests', value: summary.serviceRequests?.total, icon: 'bi-clipboard-data', tone: 'primary' },
    { title: 'Completed Requests', value: summary.serviceRequests?.completed, icon: 'bi-check2-circle', tone: 'success' },
    { title: 'Pending Requests', value: summary.serviceRequests?.pending, icon: 'bi-hourglass-split', tone: 'warning' },
    { title: 'Average Rating', value: displayNumber(summary.reviews?.averageRating, 1), icon: 'bi-star', tone: 'warning', suffix: '/5' },
    { title: 'Unread Notifications', value: summary.notifications?.unread, icon: 'bi-bell', tone: 'danger' },
  ] : []

  const statusTotal = analytics.requestStatus.reduce(
    (total, status) => total + (typeof status.count === 'number' ? status.count : 0),
    0,
  )
  const monthlyRequests = analytics.monthlyRequests
  const monthlyCompleted = analytics.monthlyCompleted
  const monthlyData = [...new Set([
    ...monthlyRequests.map((item) => item.month),
    ...monthlyCompleted.map((item) => item.month),
  ])].sort((first, second) => (
    new Date(`${first} 1, 2000`).getMonth() - new Date(`${second} 1, 2000`).getMonth()
  ))
  const maxMonthlyValue = Math.max(
    0,
    ...monthlyRequests.map((item) => item.count || 0),
    ...monthlyCompleted.map((item) => item.count || 0),
  )

  return (
    <main className="container-fluid px-3 px-md-4 px-xl-5 py-4 py-lg-5 admin-dashboard">
      <header className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
        <div>
          <p className="small text-primary fw-semibold text-uppercase mb-2">Administration</p>
          <h1 className="display-6 fw-bold mb-2">Admin Dashboard</h1>
          <p className="text-body-secondary mb-0">
            Welcome back{user?.name ? `, ${user.name}` : ''}. Monitor service operations and performance.
          </p>
        </div>
        <button
          className="btn btn-outline-primary flex-shrink-0"
          disabled={loading}
          onClick={loadAnalytics}
          type="button"
        >
          {loading
            ? <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
            : <i className="bi bi-arrow-clockwise me-2" aria-hidden="true" />}
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      <DashboardSection title="At a glance" icon="bi-speedometer2" className="mb-4">
        {errors.summary && <div className="alert alert-danger" role="alert">{errors.summary}</div>}
        {!summary && !errors.summary ? (
          <SectionContent loading={loading} isEmpty />
        ) : summary && summaryCards.length > 0 ? (
          <div className="row g-3">
            {summaryCards.map((card) => (
              <div className="col-12 col-sm-6 col-xl-4 col-xxl-3" key={card.title}>
                <MetricCard
                  icon={card.icon}
                  suffix={card.suffix || ''}
                  title={card.title}
                  tone={card.tone}
                  value={typeof card.value === 'string' ? card.value : displayNumber(card.value)}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-body-secondary mb-0">No summary data available.</p>
        )}
      </DashboardSection>

      <div className="row g-4 mb-4">
        <div className="col-12 col-xl-6">
          <DashboardSection title="Request status" icon="bi-bar-chart-steps" className="h-100">
            <SectionContent
              error={errors.requestStatus}
              isEmpty={!analytics.requestStatus?.length}
              loading={loading}
            >
              <div className="d-flex flex-column gap-3">
                {analytics.requestStatus.map(({ status, count }) => {
                  const percent = statusTotal ? Math.round((count / statusTotal) * 100) : 0
                  return (
                    <div key={status}>
                      <div className="d-flex justify-content-between align-items-center gap-3 mb-1">
                        <span className="small fw-semibold">{status}</span>
                        <span className="small text-body-secondary">{displayNumber(count)}</span>
                      </div>
                      <div
                        aria-label={`${status}: ${count} requests`}
                        className="progress"
                        role="progressbar"
                        aria-valuemax="100"
                        aria-valuemin="0"
                        aria-valuenow={percent}
                      >
                        <div
                          className={`progress-bar bg-${getStatusVariant(status)}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </SectionContent>
          </DashboardSection>
        </div>

        <div className="col-12 col-xl-6">
          <DashboardSection title="Service analytics" icon="bi-grid" className="h-100">
            <div className="row g-3 mb-4">
              {[
                ['Total services', summary?.services?.total, 'primary'],
                ['Active', summary?.services?.active, 'success'],
                ['Inactive', summary?.services?.inactive, 'secondary'],
              ].map(([label, value, tone]) => (
                <div className="col-4" key={label}>
                  <div className={`admin-service-stat border-start border-3 border-${tone} rounded bg-light p-3 h-100`}>
                    <p className="small text-body-secondary mb-1">{label}</p>
                    <p className="h4 fw-bold mb-0">{displayNumber(value)}</p>
                  </div>
                </div>
              ))}
            </div>
            <h3 className="h6 fw-bold mb-3">Service categories</h3>
            <SectionContent
              error={errors.services}
              isEmpty={!analytics.services?.length}
              loading={loading}
            >
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr><th scope="col">Category</th><th scope="col">Services</th><th scope="col">Active</th><th scope="col">Inactive</th></tr>
                  </thead>
                  <tbody>
                    {analytics.services.map((service) => (
                      <tr key={service.category || 'uncategorized'}>
                        <td>{service.category || 'Uncategorized'}</td>
                        <td>{displayNumber(service.serviceCount)}</td>
                        <td>{displayNumber(service.activeCount)}</td>
                        <td>{displayNumber(service.inactiveCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionContent>
          </DashboardSection>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12 col-xl-6">
          <DashboardSection title="Requests by service" icon="bi-clipboard-data" className="h-100">
            <SectionContent
              error={errors.requestsByService}
              isEmpty={!analytics.requestsByService?.length}
              loading={loading}
            >
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr><th scope="col">Service</th><th scope="col">Requests</th><th scope="col">Completed</th><th scope="col">Cancelled</th></tr>
                  </thead>
                  <tbody>
                    {analytics.requestsByService.map((service) => (
                      <tr key={service.serviceId}>
                        <td className="fw-semibold">{service.serviceName || 'Unavailable'}</td>
                        <td>{displayNumber(service.requestCount)}</td>
                        <td>{displayNumber(service.completedCount)}</td>
                        <td>{displayNumber(service.cancelledCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionContent>
          </DashboardSection>
        </div>
        <div className="col-12 col-xl-6">
          <DashboardSection title="Technician workload" icon="bi-person-gear" className="h-100">
            <SectionContent
              error={errors.technicians}
              isEmpty={!analytics.technicians?.length}
              loading={loading}
            >
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr><th scope="col">Technician</th><th scope="col">Assigned</th><th scope="col">Completed</th><th scope="col">In progress</th><th scope="col">Cancelled</th></tr>
                  </thead>
                  <tbody>
                    {analytics.technicians.map((technician) => (
                      <tr key={technician.technicianId}>
                        <td>
                          <div className="fw-semibold">{technician.name || 'Unknown'}</div>
                          {technician.email && <div className="small text-body-secondary text-break">{technician.email}</div>}
                        </td>
                        <td>{displayNumber(technician.assignedRequests)}</td>
                        <td>{displayNumber(technician.completedRequests)}</td>
                        <td>{displayNumber(technician.inProgressRequests)}</td>
                        <td>{displayNumber(technician.cancelledRequests)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionContent>
          </DashboardSection>
        </div>
      </div>

      <DashboardSection title="Recent service requests" icon="bi-clock-history" className="mb-4">
        <SectionContent
          error={errors.recentRequests}
          isEmpty={!analytics.recentRequests?.length}
          loading={loading}
        >
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr><th scope="col">Customer</th><th scope="col">Service</th><th scope="col">Technician</th><th scope="col">Status</th><th scope="col">Preferred date</th><th scope="col">Created</th><th scope="col">Details</th></tr>
              </thead>
              <tbody>
                {analytics.recentRequests.map((request) => (
                  <tr key={request.requestId}>
                    <td>{getPersonName(request.customer)}</td>
                    <td>{getServiceName(request.service)}</td>
                    <td>{getPersonName(request.technician)}</td>
                    <td><span className={`badge text-bg-${getStatusVariant(request.status)}`}>{request.status || 'Unknown'}</span></td>
                    <td className="text-nowrap">{formatDate(request.preferredDate, { includeTime: false })}</td>
                    <td className="text-nowrap">{formatDate(request.createdAt)}</td>
                    <td>
                      <Link
                        className="btn btn-sm btn-outline-primary"
                        to={`/admin/service-requests/${encodeURIComponent(request.requestId)}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionContent>
      </DashboardSection>

      <div className="row g-4 mb-4">
        <div className="col-12 col-xl-6">
          <DashboardSection title="Recent reviews" icon="bi-star" className="h-100">
            <SectionContent
              error={errors.recentReviews}
              isEmpty={!analytics.recentReviews?.length}
              loading={loading}
            >
              <div className="d-flex flex-column gap-3">
                {analytics.recentReviews.map((review) => (
                  <article className="admin-review border rounded p-3" key={review.reviewId}>
                    <div className="d-flex flex-column flex-sm-row justify-content-between gap-2 mb-2">
                      <div>
                        <h3 className="h6 fw-bold mb-1">{getServiceName(review.service)}</h3>
                        <p className="small text-body-secondary mb-0">
                          {getPersonName(review.customer)} · {formatDate(review.createdAt)}
                        </p>
                      </div>
                      <span className="badge text-bg-warning align-self-start">
                        <i className="bi bi-star-fill me-1" aria-hidden="true" />
                        {displayNumber(review.rating, 1)} / 5
                      </span>
                    </div>
                    <p className="mb-0 text-break">{review.comment || 'No written comment.'}</p>
                  </article>
                ))}
              </div>
            </SectionContent>
          </DashboardSection>
        </div>

        <div className="col-12 col-xl-6">
          <DashboardSection title="Monthly requests and completions" icon="bi-calendar3" className="h-100">
            {errors.monthlyRequests && <div className="alert alert-danger" role="alert">{errors.monthlyRequests}</div>}
            {errors.monthlyCompleted && <div className="alert alert-danger" role="alert">{errors.monthlyCompleted}</div>}
            {!analytics.monthlyRequests && !errors.monthlyRequests ? (
              <SectionContent loading={loading} isEmpty />
            ) : !analytics.monthlyCompleted && !errors.monthlyCompleted ? (
              <SectionContent loading={loading} isEmpty />
            ) : !monthlyData.length ? (
              <p className="text-body-secondary mb-0">No data available.</p>
            ) : (
              <>
                <div className="d-flex flex-wrap gap-3 small mb-3" aria-label="Chart legend">
                  <span><i className="bi bi-square-fill text-primary me-1" aria-hidden="true" />Requests</span>
                  <span><i className="bi bi-square-fill text-success me-1" aria-hidden="true" />Completed</span>
                </div>
                <div className="admin-monthly-chart" role="img" aria-label="Monthly request and completion counts">
                  {monthlyData.map((month) => {
                    const requests = monthlyRequests.find((item) => item.month === month)?.count || 0
                    const completed = monthlyCompleted.find((item) => item.month === month)?.count || 0
                    const requestHeight = maxMonthlyValue ? (requests / maxMonthlyValue) * 100 : 0
                    const completedHeight = maxMonthlyValue ? (completed / maxMonthlyValue) * 100 : 0
                    return (
                      <div className="admin-month-column" key={month} title={`${month}: ${requests} requests, ${completed} completed`}>
                        <span className="small text-body-secondary">{displayNumber(requests)}</span>
                        <div className="admin-month-bars">
                          <div className="admin-month-bar bg-primary" style={{ height: `${requestHeight}%` }} />
                          <div className="admin-month-bar bg-success" style={{ height: `${completedHeight}%` }} />
                        </div>
                        <span className="small text-body-secondary">{month.slice(0, 3)}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </DashboardSection>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <DashboardSection title="Top services" icon="bi-trophy" className="h-100">
            <SectionContent
              error={errors.topServices}
              isEmpty={!analytics.topServices?.length}
              loading={loading}
            >
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr><th scope="col">Service</th><th scope="col">Requests</th><th scope="col">Completed</th><th scope="col">Rating</th></tr>
                  </thead>
                  <tbody>
                    {analytics.topServices.map((service) => (
                      <tr key={service.serviceId}>
                        <td>
                          <div className="fw-semibold">{service.serviceName || 'Unavailable'}</div>
                          <div className="small text-body-secondary">{service.category || ''}</div>
                        </td>
                        <td>{displayNumber(service.requestCount)}</td>
                        <td>{displayNumber(service.completedCount)}</td>
                        <td>{getRating(service.averageRating)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionContent>
          </DashboardSection>
        </div>
        <div className="col-12 col-lg-6">
          <DashboardSection title="Top technicians" icon="bi-award" className="h-100">
            <SectionContent
              error={errors.topTechnicians}
              isEmpty={!analytics.topTechnicians?.length}
              loading={loading}
            >
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr><th scope="col">Technician</th><th scope="col">Completed requests</th><th scope="col">Rating</th></tr>
                  </thead>
                  <tbody>
                    {analytics.topTechnicians.map((technician) => (
                      <tr key={technician.technicianId}>
                        <td className="fw-semibold">{technician.name || 'Unknown'}</td>
                        <td>{displayNumber(technician.completedRequests)}</td>
                        <td>{getRating(technician.averageRating)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionContent>
          </DashboardSection>
        </div>
      </div>
    </main>
  )
}

export default AdminDashboard
