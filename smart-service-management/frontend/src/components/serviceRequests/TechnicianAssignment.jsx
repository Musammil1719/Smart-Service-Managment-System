import { useState } from 'react'
import RequestConfirmationModal from './RequestConfirmationModal'
import { apiRequest } from '../../utils/api'

function TechnicianAssignment({
  requestId,
  technicians,
  loading,
  error,
  onAssigned,
  reassign = false,
  excludeTechnicianId,
}) {
  const [technicianId, setTechnicianId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignmentError, setAssignmentError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const serviceRequestId = typeof requestId === 'string' ? requestId.trim() : ''

  async function handleAssign() {
    if (!serviceRequestId) {
      setAssignmentError('Service request ID is missing. Refresh the request list and try again.')
      return
    }

    if (!technicianId) {
      return
    }

    setAssigning(true)
    setAssignmentError('')
    try {
      const endpoint = reassign ? 'reassign-technician' : 'assign'
      const result = await apiRequest(`/api/service-requests/${encodeURIComponent(serviceRequestId)}/${endpoint}`, {
        method: 'PUT',
        body: { technicianId },
      })
      if (!result?.serviceRequest) {
        throw new Error('Unexpected technician assignment response.')
      }
      await onAssigned(result.serviceRequest, reassign)
      setConfirming(false)
    } catch (assignError) {
      setAssignmentError(assignError.message || 'Unable to assign this technician. Please try again.')
    } finally {
      setAssigning(false)
    }
  }

  function selectedTechnician() {
    return technicians.find((technician) => technician.technicianId === technicianId)
  }

  const availableTechnicians = reassign
    ? technicians.filter((technician) => technician.technicianId !== excludeTechnicianId)
    : technicians

  if (loading) {
    return (
      <div className="small text-body-secondary" role="status">
        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
        Loading technicians...
      </div>
    )
  }

  if (error) {
    return <div className="small text-danger" role="alert">{error}</div>
  }

  if (availableTechnicians.length === 0) {
    return (
      <div className="small text-body-secondary">
        {reassign
          ? 'No alternative technicians are available for reassignment.'
          : 'No technicians available.'}
      </div>
    )
  }

  return (
    <>
      <div className="d-flex flex-column gap-2">
        <label className="visually-hidden" htmlFor={`technician-${requestId}`}>
          {reassign ? 'Reassign technician' : 'Assign technician'}
        </label>
        <select
          className="form-select form-select-sm"
          disabled={assigning}
          id={`technician-${requestId}`}
          onChange={(event) => setTechnicianId(event.target.value)}
          value={technicianId}
        >
          <option value="">Select technician</option>
          {availableTechnicians.map((technician) => (
            <option key={technician.technicianId} value={technician.technicianId}>
              {technician.name} ({technician.email})
            </option>
          ))}
        </select>
        <button
          className="btn btn-sm btn-primary"
          disabled={!serviceRequestId || !technicianId || assigning}
          onClick={reassign ? () => setConfirming(true) : handleAssign}
          type="button"
        >
          {assigning
            ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Assigning...</>
            : reassign ? 'Reassign Technician' : 'Assign Technician'}
        </button>
        {assignmentError && <div className="small text-danger" role="alert">{assignmentError}</div>}
      </div>
      <RequestConfirmationModal
        action={reassign && confirming ? {
          title: 'Reassign this request?',
          message: `Assign this cancelled request to ${selectedTechnician()?.name || 'the selected technician'}? The request status will return to Assigned.`,
          confirmLabel: 'Confirm reassignment',
          variant: 'btn-primary',
        } : null}
        busy={assigning}
        onCancel={() => setConfirming(false)}
        onConfirm={handleAssign}
      />
    </>
  )
}

export default TechnicianAssignment
