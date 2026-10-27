import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/useAuth'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Notifications from './pages/notifications/Notifications'
import AdminDashboard from './pages/admin/AdminDashboard'
import ReviewManagement from './pages/admin/ReviewManagement'
import CustomerDashboard from './pages/customer/CustomerDashboard'
import CreateServiceRequest from './pages/customer/CreateServiceRequest'
import CreateReview from './pages/customer/CreateReview'
import Login from './pages/Login'
import Register from './pages/Register'
import ServiceManagement from './pages/admin/ServiceManagement'
import AdminServiceRequestDetails from './pages/admin/ServiceRequestDetails'
import ServiceRequestManagement from './pages/admin/ServiceRequestManagement'
import MyReviews from './pages/customer/MyReviews'
import ReviewDetails from './pages/customer/ReviewDetails'
import Services from './pages/services/Services'
import CustomerServiceRequestDetails from './pages/customer/ServiceRequestDetails'
import MyServiceRequests from './pages/customer/MyServiceRequests'
import AssignedRequestDetails from './pages/technician/AssignedRequestDetails'
import AssignedRequests from './pages/technician/AssignedRequests'
import TechnicianDashboard from './pages/technician/TechnicianDashboard'
import Unauthorized from './pages/Unauthorized'
import './App.css'

const dashboardPaths = {
  customer: '/customer',
  technician: '/technician',
  admin: '/admin',
}

function HomeRedirect() {
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) {
    return (
      <main className="container py-5 text-center" role="status">
        <span className="spinner-border text-primary" aria-hidden="true" />
        <span className="visually-hidden">Restoring your session...</span>
      </main>
    )
  }

  return <Navigate to={isAuthenticated ? dashboardPaths[user.role] : '/login'} replace />
}

function AppRoutes() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className={`app-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <Navbar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((collapsed) => !collapsed)}
      />
      <main className="app-main-content">
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
            <Route path="/customer" element={<CustomerDashboard />} />
            <Route path="/customer/service-requests" element={<MyServiceRequests />} />
            <Route path="/customer/service-requests/new" element={<CreateServiceRequest />} />
            <Route path="/customer/service-requests/:id" element={<CustomerServiceRequestDetails />} />
            <Route path="/customer/service-requests/:id/review" element={<CreateReview />} />
            <Route path="/customer/reviews" element={<MyReviews />} />
            <Route path="/customer/reviews/:id" element={<ReviewDetails />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['technician']} />}>
            <Route path="/technician" element={<TechnicianDashboard />} />
            <Route path="/technician/service-requests" element={<AssignedRequests />} />
            <Route path="/technician/service-requests/:id" element={<AssignedRequestDetails />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/services" element={<ServiceManagement />} />
            <Route path="/admin/service-requests" element={<ServiceRequestManagement />} />
            <Route path="/admin/service-requests/:id" element={<AdminServiceRequestDetails />} />
            <Route path="/admin/reviews" element={<ReviewManagement />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['customer', 'technician', 'admin']} />}>
            <Route path="/services" element={<Services />} />
            <Route path="/notifications" element={<Notifications />} />
          </Route>
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return <AppRoutes />
}

export default App
