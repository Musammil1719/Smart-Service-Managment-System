import RoleDashboard from '../../components/RoleDashboard'
import { useAuth } from '../../context/useAuth'

function TechnicianDashboard() {
  const { user } = useAuth()

  return (
    <RoleDashboard
      description="You can manage assigned service requests here."
      icon="bi-wrench-adjustable-circle"
      title="Welcome to your Technician Dashboard"
      user={user}
    />
  )
}

export default TechnicianDashboard
