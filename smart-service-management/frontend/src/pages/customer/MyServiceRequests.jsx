import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ServiceRequestCard from "../../components/serviceRequests/ServiceRequestCard";
import { apiRequest } from "../../utils/api";
import { getReviewForServiceRequest } from "../../utils/reviews";
import { getRequestErrorMessage } from "../../utils/serviceRequests";

function MyServiceRequests() {
  const location = useLocation();

  const [successMessage, setSuccessMessage] = useState(
    location.state?.message || "",
  );

  useEffect(() => {
    if (!successMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [successMessage]);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewsByRequest, setReviewsByRequest] = useState(new Map());
  const [reviewStatusReady, setReviewStatusReady] = useState(false);
  const [reviewStatusError, setReviewStatusError] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadRequests() {
      try {
        const result = await apiRequest("/api/service-requests/my");
        if (!Array.isArray(result?.serviceRequests)) {
          throw new Error("Unexpected service requests response.");
        }

        if (active) {
          setRequests(result.serviceRequests);
        }

        if (
          !result.serviceRequests.some(
            (request) => request.status === "Completed",
          )
        ) {
          if (active) {
            setReviewStatusReady(true);
          }
          return;
        }

        try {
          const reviewResult = await apiRequest("/api/reviews/my");
          if (!Array.isArray(reviewResult?.reviews)) {
            throw new Error("Unexpected reviews response.");
          }

          if (active) {
            const reviewMap = new Map();
            result.serviceRequests.forEach((request) => {
              const review = getReviewForServiceRequest(
                reviewResult.reviews,
                request.id,
              );
              if (review) {
                reviewMap.set(request.id, review);
              }
            });
            setReviewsByRequest(reviewMap);
            setReviewStatusReady(true);
          }
        } catch {
          if (active) {
            setReviewStatusError(true);
          }
        }
      } catch (loadError) {
        if (active) {
          setError(getRequestErrorMessage(loadError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadRequests();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="container py-4 py-lg-5 service-page">
      <header className="d-flex flex-column flex-sm-row align-items-sm-end justify-content-between gap-3 mb-4">
        <div>
          <p className="small text-primary fw-semibold text-uppercase mb-2">
            Customer services
          </p>
          <h1 className="display-6 fw-bold mb-2">My service requests</h1>
          <p className="text-body-secondary mb-0">
            Track the progress of your service bookings.
          </p>
        </div>
        <Link
          className="btn btn-primary flex-shrink-0"
          to="/customer/service-requests/new"
        >
          <i className="bi bi-plus-lg me-2" aria-hidden="true" />
          Create request
        </Link>
      </header>

      {successMessage && (
        <div className="alert alert-success" role="alert">
          {successMessage}
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
        <div className="alert alert-light border d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
          <span>No service requests found.</span>
          <Link to="/customer/service-requests/new">
            Create your first request
          </Link>
        </div>
      ) : (
        <>
          {reviewStatusError && (
            <div className="alert alert-warning" role="status">
              Review status could not be checked. Refresh the page before
              submitting a review.
            </div>
          )}
          <div className="row g-4">
            {requests.map((request) => {
              const existingReview = reviewsByRequest.get(request.id);
              const reviewPath =
                request.status === "Completed" && reviewStatusReady
                  ? existingReview
                    ? `/customer/reviews/${encodeURIComponent(existingReview.id)}`
                    : `/customer/service-requests/${encodeURIComponent(request.id)}/review`
                  : undefined;

              return (
                <div className="col-12 col-md-6 col-xl-4" key={request.id}>
                  <ServiceRequestCard
                    request={request}
                    detailsPath={`/customer/service-requests/${encodeURIComponent(request.id)}`}
                    reviewPath={reviewPath}
                    reviewLabel={
                      existingReview ? "View review" : "Leave review"
                    }
                    onRequestCancelled={(updatedRequest) => {
                      setRequests((currentRequests) =>
                        currentRequests.map((item) =>
                          item.id === updatedRequest.id ? updatedRequest : item,
                        ),
                      );
                    }}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}

export default MyServiceRequests;
