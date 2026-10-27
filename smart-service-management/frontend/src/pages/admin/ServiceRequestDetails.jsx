import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import RequestStatusBadge from "../../components/serviceRequests/RequestStatusBadge";
import TechnicianAssignment from "../../components/serviceRequests/TechnicianAssignment";
import { apiRequest } from "../../utils/api";
import {
  formatDate,
  getDisplayName,
  getRequestErrorMessage,
  getServiceName,
} from "../../utils/serviceRequests";

function ServiceRequestDetails() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [technicians, setTechnicians] = useState([]);
  const [techniciansLoading, setTechniciansLoading] = useState(true);
  const [techniciansError, setTechniciansError] = useState("");
  const [assignmentMessage, setAssignmentMessage] = useState("");

  const loadRequest = useCallback(async () => {
    const result = await apiRequest(
      `/api/service-requests/${encodeURIComponent(id)}`,
    );

    console.log("Technician details API response:", result?.serviceRequest);

    if (!result?.serviceRequest) {
      throw new Error("Unexpected service request response.");
    }

    return result.serviceRequest;
  }, [id]);

  const canAssignTechnician =
    request?.status === "Pending" || request?.status === "Cancelled";

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

  useEffect(() => {
    if (!canAssignTechnician) {
      return undefined;
    }

    let active = true;
    apiRequest("/api/admin/analytics/technicians")
      .then((result) => {
        if (!Array.isArray(result)) {
          throw new Error("Unexpected technicians response.");
        }
        if (active) {
          setTechnicians(result);
        }
      })
      .catch(() => {
        if (active) {
          setTechniciansError("Unable to load technicians. Please try again.");
        }
      })
      .finally(() => {
        if (active) {
          setTechniciansLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [canAssignTechnician]);

  async function handleAssigned(updatedRequest, reassigned) {
    setRequest(updatedRequest || (await loadRequest()));
    setAssignmentMessage(
      reassigned
        ? "Technician reassigned successfully."
        : "Technician assigned successfully.",
    );
  }

  return (
    <main className="container py-4 py-lg-5 service-page">
      <div className="mb-4">
        <Link
          className="link-primary text-decoration-none"
          to="/admin/service-requests"
        >
          <i className="bi bi-arrow-left me-2" aria-hidden="true" />
          Back to all service requests
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
      ) : error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : request ? (
        <section className="card border-0 shadow-sm service-table-card">
          <div className="card-body p-4 p-lg-5">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-start gap-3 mb-4">
              <div>
                <p className="small text-primary fw-semibold text-uppercase mb-2">
                  {request.service?.category || "Service request"}
                </p>
                <h1 className="h2 fw-bold mb-0">
                  {getServiceName(request.service)}
                </h1>
              </div>
              <RequestStatusBadge status={request.status} />
            </div>
            <p className="text-body-secondary mb-4">{request.description}</p>

            <div className="mb-4 p-3 border rounded">
              <h2 className="h5 fw-bold mb-3">
                <i className="bi bi-geo-alt me-2" aria-hidden="true" />
                Service Address
              </h2>

              {request.address ? (
                <>
                  <div className="fw-medium">{request.address.houseNo}</div>
                  <div>{request.address.street}</div>
                  <div>
                    {request.address.city}, {request.address.state} -{" "}
                    {request.address.pincode}
                  </div>
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

            {assignmentMessage && (
              <div className="alert alert-success" role="status">
                {assignmentMessage}
              </div>
            )}
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
                <div className="small text-body-secondary">Technician</div>
                <div className="fw-medium">
                  {getDisplayName(request.technician)}
                </div>
                {request.technician?.email && (
                  <div className="small text-body-secondary">
                    {request.technician.email}
                  </div>
                )}
              </div>
              <div className="col-12 col-md-6">
                <div className="small text-body-secondary">Preferred date</div>
                <div className="fw-medium">
                  {formatDate(request.preferredDate)}
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="small text-body-secondary">Created</div>
                <div className="fw-medium">{formatDate(request.createdAt)}</div>
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
            {canAssignTechnician && (
              <div className="mt-4">
                <h2 className="h5 fw-bold">
                  {request.status === "Cancelled"
                    ? "Reassign technician"
                    : "Assign technician"}
                </h2>
                <TechnicianAssignment
                  error={techniciansError}
                  loading={techniciansLoading}
                  onAssigned={handleAssigned}
                  requestId={id}
                  technicians={technicians}
                  reassign={request.status === "Cancelled"}
                  excludeTechnicianId={
                    typeof request.technician === "object"
                      ? request.technician?.id || request.technician?._id
                      : request.technician
                  }
                />
              </div>
            )}
          </div>
        </section>
      ) : (
        <div className="alert alert-light border" role="status">
          No service requests found.
        </div>
      )}
    </main>
  );
}

export default ServiceRequestDetails;
