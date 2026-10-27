import RoleDashboard from '../../components/RoleDashboard'
import { useAuth } from '../../context/useAuth'

function CustomerDashboard() {
  const { user } = useAuth()

  return (
    <RoleDashboard
      description="You can manage service requests and track your services here."
      icon="bi-house-gear"
      title="Welcome to your Customer Dashboard"
      user={user}
    />
  )
}

export default CustomerDashboard
