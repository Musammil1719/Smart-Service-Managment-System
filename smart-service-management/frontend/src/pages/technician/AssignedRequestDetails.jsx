import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import RequestConfirmationModal from "../../components/serviceRequests/RequestConfirmationModal";
import RequestStatusBadge from "../../components/serviceRequests/RequestStatusBadge";
import { apiRequest } from "../../utils/api";
import {
  formatDate,
  getDisplayName,
  getRequestErrorMessage,
  getServiceName,
} from "../../utils/serviceRequests";

const statusActions = {
  Assigned: {
    endpoint: "accept",
    title: "Accept this request?",
    message: "Accepting confirms that you will handle this service request.",
    confirmLabel: "Accept request",
    success: "Service request accepted successfully.",
  },
  Accepted: {
    endpoint: "start",
    title: "Start this service?",
    message: "Confirm when you are ready to begin the service.",
    confirmLabel: "Start service",
    success: "Service started successfully.",
  },
  "In Progress": {
    endpoint: "complete",
    title: "Complete this service?",
    message: "Confirm that the service work is complete.",
    confirmLabel: "Complete service",
    success: "Service completed successfully.",
  },
};

const cancelAction = {
  endpoint: "cancel",
  title: "Cancel this request?",
  message:
    "Are you sure you want to cancel this assigned service request? This cannot be undone.",
  confirmLabel: "Cancel request",
  success: "Service request cancelled successfully.",
  variant: "btn-danger",
};

function AssignedRequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [processing, setProcessing] = useState(false);

  const loadRequest = useCallback(async () => {
    const result = await apiRequest(
      `/api/service-requests/${encodeURIComponent(id)}`,
    );
    if (!result?.serviceRequest) {
      throw new Error("Unexpected service request response.");
    }

    return result.serviceRequest;
  }, [id]);

  useEffect(() => {
    let active = true;
    loadRequest()
      .then((record) => {
        if (active) {
          setRequest(record);
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(getRequestErrorMessage(loadError));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [loadRequest]);

  async function performAction() {
    const action = confirmAction;
    const currentAction = statusActions[request?.status];
    const actionIsCurrent =
      action?.endpoint === "cancel"
        ? request?.status === "Assigned"
        : currentAction?.endpoint === action?.endpoint;
    if (!action || !actionIsCurrent) {
      setConfirmAction(null);
      return;
    }

    setProcessing(true);
    setError("");
    try {
      const result = await apiRequest(
        `/api/service-requests/${encodeURIComponent(id)}/${action.endpoint}`,
        { method: "PUT" },
      );
      if (result?.serviceRequest) {
        setRequest(result.serviceRequest);
      }
      setMessage(result?.message || action.success);
      setConfirmAction(null);
      if (action.endpoint === "cancel") {
        navigate("/technician/service-requests", {
          state: { message: result?.message || action.success },
        });
        return;
      }

      try {
        setRequest(await loadRequest());
      } catch {
        setError(
          "The request was updated, but its details could not be refreshed. Reload the page to see the latest status.",
        );
      }
    } catch (actionError) {
      setError(
        actionError.status >= 500
          ? "Unable to update this request. Please try again."
          : actionError.message || "Unable to update this request.",
      );
    } finally {
      setProcessing(false);
    }
  }

  const action = request && statusActions[request.status];

  return (
    <main className="container py-4 py-lg-5 service-page">
      <div className="mb-4">
        <Link
          className="link-primary text-decoration-none"
          to="/technician/service-requests"
        >
          <i className="bi bi-arrow-left me-2" aria-hidden="true" />
          Back to assigned requests
        </Link>
      </div>
      {loading ? (
        <div className="d-flex align-items-center gap-3 py-5" role="status">
          <span
            className="spinner-border spinner-border-sm text-primary"
            aria-hidden="true"
          />
          <span>Loading service requests...</span>
        </div>
      ) : error && !request ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : request ? (
        <>
          {message && (
            <div className="alert alert-success" role="status">
              {message}
            </div>
          )}
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <section className="card border-0 shadow-sm service-table-card">
            <div className="card-body p-4 p-lg-5">
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-start gap-3 mb-4">
                <div>
                  <p className="small text-primary fw-semibold text-uppercase mb-2">
                    {request.service?.category || "Assigned request"}
                  </p>
                  <h1 className="h2 fw-bold mb-0">
                    {getServiceName(request.service)}
                  </h1>
                </div>
                <RequestStatusBadge status={request.status} />
              </div>
              {request.service?.description && (
                <div className="mb-3">
                  <div className="small text-body-secondary">
                    Service details
                  </div>
                  <p className="mb-0">{request.service.description}</p>
                </div>
              )}
              <div className="mb-4">
                <div className="small text-body-secondary">
                  Request description
                </div>
                <p className="mb-0">{request.description}</p>
              </div>

              <div className="mb-4 p-3 border rounded">
                <h2 className="h5 fw-bold mb-3">
                  <i className="bi bi-geo-alt me-2" aria-hidden="true" />
                  Service Address
                </h2>

                {request.address?.houseNo ||
                request.address?.street ||
                request.address?.city ||
                request.address?.state ||
                request.address?.pincode ? (
                  <>
                    {(request.address.houseNo || request.address.street) && (
                      <div>
                        {[request.address.houseNo, request.address.street]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    )}

                    {(request.address.city ||
                      request.address.state ||
                      request.address.pincode) && (
                      <div>
                        {[request.address.city, request.address.state]
                          .filter(Boolean)
                          .join(", ")}
                        {request.address.pincode &&
                          ` - ${request.address.pincode}`}
                      </div>
                    )}

                    {request.address.landmark && (
                      <div className="text-body-secondary mt-1">
                        <span className="fw-medium">Landmark:</span>{" "}
                        {request.address.landmark}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-body-secondary mb-0">
                    No address available for this request.
                  </p>
                )}
              </div>

              <div className="row g-4">
                <div className="col-12 col-md-6">
                  <div className="small text-body-secondary">Customer</div>
                  <div className="fw-medium">
                    {getDisplayName(request.customer)}
                  </div>
                  {request.customer?.email && (
                    <div className="small text-body-secondary">
                      {request.customer.email}
                    </div>
                  )}
                </div>
                <div className="col-12 col-md-6">
                  <div className="small text-body-secondary">
                    Preferred date
                  </div>
                  <div className="fw-medium">
                    {formatDate(request.preferredDate)}
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <div className="small text-body-secondary">Created</div>
                  <div className="fw-medium">
                    {formatDate(request.createdAt)}
                  </div>
                </div>
                {request.completedAt && (
                  <div className="col-12 col-md-6">
                    <div className="small text-body-secondary">Completed</div>
                    <div className="fw-medium">
                      {formatDate(request.completedAt)}
                    </div>
                  </div>
                )}
              </div>
              {request.status === "Completed" && (
                <div className="alert alert-success mt-4 mb-0">
                  <i className="bi bi-check-circle me-2" aria-hidden="true" />
                  This service request has been completed.
                </div>
              )}
              {(action || request.status === "Assigned") && (
                <div className="border-top mt-4 pt-4 d-flex flex-wrap gap-2">
                  {action && (
                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={processing}
                      onClick={() => setConfirmAction(action)}
                    >
                      {request.status === "Assigned" && (
                        <i
                          className="bi bi-check2-circle me-2"
                          aria-hidden="true"
                        />
                      )}
                      {request.status === "Accepted" && (
                        <i
                          className="bi bi-play-circle me-2"
                          aria-hidden="true"
                        />
                      )}
                      {request.status === "In Progress" && (
                        <i
                          className="bi bi-check-circle me-2"
                          aria-hidden="true"
                        />
                      )}
                      {action.confirmLabel}
                    </button>
                  )}
                  {request.status === "Assigned" && (
                    <button
                      className="btn btn-outline-danger"
                      type="button"
                      disabled={processing}
                      onClick={() => setConfirmAction(cancelAction)}
                    >
                      <i className="bi bi-x-circle me-2" aria-hidden="true" />
                      Cancel request
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <div className="alert alert-light border" role="status">
          No service requests found.
        </div>
      )}
      <RequestConfirmationModal
        action={confirmAction}
        busy={processing}
        onCancel={() => setConfirmAction(null)}
        onConfirm={performAction}
      />
    </main>
  );
}

export default AssignedRequestDetails;
