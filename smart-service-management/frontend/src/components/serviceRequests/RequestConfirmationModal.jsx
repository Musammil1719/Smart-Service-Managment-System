function RequestConfirmationModal({ action, busy, onCancel, onConfirm }) {
  if (!action) {
    return null
  }

  return (
    <div className="service-modal-backdrop" role="presentation">
      <section className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="request-confirm-title">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <h2 className="modal-title fs-5" id="request-confirm-title">{action.title}</h2>
              <button
                className="btn-close"
                type="button"
                aria-label="Close"
                disabled={busy}
                onClick={onCancel}
              />
            </div>
            <div className="modal-body">{action.message}</div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" type="button" disabled={busy} onClick={onCancel}>
                Keep request
              </button>
              <button
                className={`btn ${action.variant || 'btn-primary'}`}
                type="button"
                disabled={busy}
                onClick={onConfirm}
              >
                {busy ? 'Please wait...' : action.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default RequestConfirmationModal
