import { useState } from "react";
import { Link } from "react-router-dom";
import RequestStatusBadge from "./RequestStatusBadge";
import {
  formatDate,
  getDisplayName,
  getServiceName,
} from "../../utils/serviceRequests";
import { apiRequest } from "../../utils/api";

function ServiceRequestCard({
  request,
  detailsPath,
  reviewPath,
  reviewLabel,
  showCustomer = false,
  showTechnician = true,
  showServiceDescription = false,
  onRequestCancelled,
}) {
  const service = request.service;
  console.log('Card request address:', request.address)
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const canCancel = ["Pending", "Assigned"].includes(request.status);

  async function handleCancel() {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this service request? This action cannot be undone.",
    );

    if (!confirmed) return;

    setCancelling(true);
    setCancelError("");

    try {
      const result = await apiRequest(
        `/api/service-requests/${encodeURIComponent(request.id)}/cancel`,
        { method: "PUT" },
      );

      if (result?.serviceRequest) {
        onRequestCancelled?.(result.serviceRequest);
      } else {
        throw new Error(
          "Cancellation response was unexpected. Please refresh the page.",
        );
      }
    } catch (error) {
      setCancelError(error.message || "Unable to cancel the service request.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <article className="card h-100 border-0 shadow-sm service-card">
      <div className="card-body d-flex flex-column p-4">
        <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
          <div>
            <p className="small text-primary fw-semibold text-uppercase mb-1">
              {service && typeof service === "object"
                ? service.category
                : "Service request"}
            </p>
            <h2 className="h5 fw-bold mb-0">{getServiceName(service)}</h2>
          </div>
          <RequestStatusBadge status={request.status} />
        </div>

        {showCustomer && (
          <p className="small mb-2">
            <i
              className="bi bi-person me-2 text-body-secondary"
              aria-hidden="true"
            />
            {getDisplayName(request.customer)}
          </p>
        )}

        {request.address && (
          <div className="small mb-3">
            <div className="fw-semibold mb-1">
              <i
                className="bi bi-geo-alt me-2 text-primary"
                aria-hidden="true"
              />
              Service Address
            </div>
            <div className="text-body-secondary">
              <div>
                {request.address.houseNo}, {request.address.street}
              </div>
              <div>
                {request.address.city}, {request.address.state} -{" "}
                {request.address.pincode}
              </div>
              {request.address.landmark && (
                <div>Landmark: {request.address.landmark}</div>
              )}
            </div>
          </div>
        )}

        {showTechnician && request.technician && (
          <p className="small mb-2">
            <i
              className="bi bi-wrench-adjustable me-2 text-body-secondary"
              aria-hidden="true"
            />
            {getDisplayName(request.technician)}
          </p>
        )}

        {showServiceDescription && service?.description && (
          <div className="small text-body-secondary mb-2">
            <div className="fw-semibold">Service details</div>
            <p className="mb-0">{service.description}</p>
          </div>
        )}

        {showServiceDescription && (
          <div className="small text-body-secondary mb-3">
            <div className="fw-semibold">Request description</div>
            <p className="mb-0">{request.description}</p>
          </div>
        )}

        {!showServiceDescription && (
          <p className="text-body-secondary flex-grow-1 mb-3">
            {request.description}
          </p>
        )}

        <div className="small text-body-secondary border-top pt-3">
          <div>
            <i className="bi bi-calendar-event me-2" aria-hidden="true" />
            Preferred: {formatDate(request.preferredDate)}
          </div>
          <div className="mt-1">
            <i className="bi bi-clock-history me-2" aria-hidden="true" />
            Created: {formatDate(request.createdAt)}
          </div>
        </div>

        {cancelError && (
          <div className="alert alert-danger py-2 mt-3 mb-0" role="alert">
            {cancelError}
          </div>
        )}

        <div className="d-flex flex-wrap gap-2 align-self-start mt-3">
          <Link className="btn btn-outline-primary btn-sm" to={detailsPath}>
            View details
            <i className="bi bi-arrow-right ms-2" aria-hidden="true" />
          </Link>

          {reviewPath && reviewLabel && (
            <Link className="btn btn-primary btn-sm" to={reviewPath}>
              <i className="bi bi-star me-2" aria-hidden="true" />
              {reviewLabel}
            </Link>
          )}

          {canCancel && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    aria-hidden="true"
                  />
                  Cancelling...
                </>
              ) : (
                <>
                  <i className="bi bi-x-circle me-2" aria-hidden="true" />
                  Cancel Request
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default ServiceRequestCard;
