import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import RequestStatusBadge from "../../components/serviceRequests/RequestStatusBadge";
import TechnicianAssignment from "../../components/serviceRequests/TechnicianAssignment";
import { apiRequest } from "../../utils/api";
import {
  formatDate,
  getDisplayName,
  getRequestErrorMessage,
  getServiceName,
} from "../../utils/serviceRequests";

function ServiceRequestManagement() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [technicians, setTechnicians] = useState([]);
  const [techniciansLoading, setTechniciansLoading] = useState(true);
  const [techniciansError, setTechniciansError] = useState("");
  const [assignmentMessage, setAssignmentMessage] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest("/api/service-requests")
      .then((result) => {
        if (!Array.isArray(result?.serviceRequests)) {
          throw new Error("Unexpected service requests response.");
        }

        if (active) {
          setRequests(result.serviceRequests);
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
  }, []);

  useEffect(() => {
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
  }, []);

  function handleAssigned(updatedRequest, reassigned) {
    setRequests((current) =>
      current.map((request) =>
        request.id === updatedRequest.id ? updatedRequest : request,
      ),
    );
    setAssignmentMessage(
      reassigned
        ? "Technician reassigned successfully."
        : "Technician assigned successfully.",
    );
  }

  return (
    <main className="container py-4 py-lg-5 service-page">
      <header className="mb-4">
        <p className="small text-primary fw-semibold text-uppercase mb-2">
          Administration
        </p>
        <h1 className="display-6 fw-bold mb-2">Service Requests</h1>
        <p className="text-body-secondary mb-0">
          Monitor request status and assigned technicians.
        </p>
      </header>

      {assignmentMessage && (
        <div className="alert alert-success" role="status">
          {assignmentMessage}
        </div>
      )}

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
      ) : requests.length === 0 ? (
        <div className="alert alert-light border" role="status">
          No service requests found.
        </div>
      ) : (
        <div className="card border-0 shadow-sm service-table-card">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">Service</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Technician</th>
                  <th scope="col">Preferred date</th>
                  <th scope="col">Status</th>
                  <th scope="col">Created</th>
                  <th scope="col" className="text-end">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr
                    className={
                      request.status === "Cancelled"
                        ? "table-secondary"
                        : undefined
                    }
                    key={request.id || request._id}
                  >
                    <td>
                      <div className="fw-semibold">
                        {getServiceName(request.service)}
                      </div>
                      <div className="small text-body-secondary">
                        {request.service?.category || ""}
                      </div>
                    </td>
                    <td>{getDisplayName(request.customer)}</td>
                    <td>{getDisplayName(request.technician)}</td>
                    <td className="text-nowrap">
                      {formatDate(request.preferredDate)}
                    </td>
                    <td>
                      <RequestStatusBadge status={request.status} />

                      {request.status === "Cancelled" && (
                        <div className="small text-danger mt-1">
                          Request cancelled by customer
                        </div>
                      )}
                    </td>
                    <td className="text-nowrap">
                      {formatDate(request.createdAt)}
                    </td>
                    <td className="text-end">
                      {request.status === "Pending" && (
                        <TechnicianAssignment
                          error={techniciansError}
                          loading={techniciansLoading}
                          onAssigned={handleAssigned}
                          requestId={request.id || request._id}
                          technicians={technicians}
                          reassign={request.status === "Cancelled"}
                          excludeTechnicianId={
                            typeof request.technician === "object"
                              ? request.technician?.id ||
                                request.technician?._id
                              : request.technician
                          }
                        />
                      )}
                      <Link
                        className="btn btn-sm btn-outline-primary"
                        to={`/admin/service-requests/${encodeURIComponent(request.id)}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}

export default ServiceRequestManagement;
