import { getStatusVariant } from '../../utils/serviceRequests'

function RequestStatusBadge({ status }) {
  return (
    <span className={`badge text-bg-${getStatusVariant(status)}`}>
      {status || 'Unknown'}
    </span>
  )
}

export default RequestStatusBadge
