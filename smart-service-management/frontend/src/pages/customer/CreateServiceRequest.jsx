import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../../utils/api";

function toLocalDateTimeValue(date) {
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );
  return localDate.toISOString().slice(0, 16);
}

function CreateServiceRequest() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [serviceError, setServiceError] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState({
    houseNo: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
  });
  const [preferredDate, setPreferredDate] = useState("");
  const [minimumDateTime] = useState(() => toLocalDateTimeValue(new Date()));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest("/api/services")
      .then((result) => {
        if (!Array.isArray(result?.services)) {
          throw new Error("Unexpected services response.");
        }

        if (active) {
          setServices(result.services.filter((service) => service.isActive));
        }
      })
      .catch((loadError) => {
        if (active) {
          setServiceError(
            loadError.status === 403
              ? "You do not have permission to view available services."
              : "Unable to load services.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoadingServices(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!serviceId || !description.trim() || !preferredDate) {
      setError(
        "Choose a service, enter a description, and select a preferred date.",
      );
      return;
    }

    const selectedDate = new Date(preferredDate);
    if (Number.isNaN(selectedDate.getTime()) || selectedDate < new Date()) {
      setError("Choose a valid date and time that is not in the past.");
      return;
    }

    setSubmitting(true);
    try {
      console.log("Submitting request:", {
        service: serviceId,
        description: description.trim(),
        address,
        preferredDate,
      });
      const result = await apiRequest("/api/service-requests", {
        method: "POST",
        body: {
          service: serviceId,
          description: description.trim(),
          address: {
            houseNo: address.houseNo.trim(),
            street: address.street.trim(),
            city: address.city.trim(),
            state: address.state.trim(),
            pincode: address.pincode.trim(),
            landmark: address.landmark.trim(),
          },
          preferredDate: selectedDate.toISOString(),
        },
      });

      navigate("/customer/service-requests", {
        replace: true,
        state: {
          message: result?.message || "Service request created successfully.",
        },
      });
    } catch (submitError) {
      setError(
        submitError.status === 403
          ? "You do not have permission to create a service request."
          : submitError.status >= 500
            ? "Unable to create your request. Please try again."
            : submitError.message || "Unable to create your request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container py-4 py-lg-5 service-page">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8 col-xl-7">
          <header className="mb-4">
            <p className="small text-primary fw-semibold text-uppercase mb-2">
              Customer services
            </p>
            <h1 className="display-6 fw-bold mb-2">Create a service request</h1>
            <p className="text-body-secondary mb-0">
              Tell us what you need and when you would like the service.
            </p>
          </header>

          <section className="card border-0 shadow-sm service-table-card">
            <div className="card-body p-4 p-lg-5">
              {serviceError && (
                <div className="alert alert-danger" role="alert">
                  {serviceError}
                </div>
              )}
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              {loadingServices ? (
                <div
                  className="d-flex align-items-center gap-3 py-4"
                  role="status"
                >
                  <span
                    className="spinner-border spinner-border-sm text-primary"
                    aria-hidden="true"
                  />
                  <span>Loading services...</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="request-service">
                      Service
                    </label>
                    <select
                      className="form-select"
                      id="request-service"
                      value={serviceId}
                      onChange={(event) => setServiceId(event.target.value)}
                      required
                      disabled={services.length === 0}
                    >
                      <option value="">Choose an active service</option>
                      {services.map((service) => (
                        <option
                          key={service.id || service._id}
                          value={service.id || service._id}
                        >
                          {service.name} — {service.category}
                        </option>
                      ))}
                    </select>
                    {services.length === 0 && !serviceError && (
                      <div className="form-text">
                        No active services are currently available.
                      </div>
                    )}
                  </div>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="request-description">
                      Description
                    </label>
                    <textarea
                      className="form-control"
                      id="request-description"
                      rows="4"
                      maxLength={2000}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Describe the service you need..."
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <h5 className="fw-semibold mb-3">Service Address</h5>

                    <div className="mb-3">
                      <label className="form-label" htmlFor="request-house-no">
                        House / Door No
                      </label>
                      <input
                        className="form-control"
                        id="request-house-no"
                        type="text"
                        value={address.houseNo}
                        onChange={(event) =>
                          setAddress({
                            ...address,
                            houseNo: event.target.value,
                          })
                        }
                        placeholder="Enter house or door number"
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label" htmlFor="request-street">
                        Street / Area
                      </label>
                      <input
                        className="form-control"
                        id="request-street"
                        type="text"
                        value={address.street}
                        onChange={(event) =>
                          setAddress({ ...address, street: event.target.value })
                        }
                        placeholder="Enter street or area"
                        required
                      />
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label" htmlFor="request-city">
                          City
                        </label>
                        <input
                          className="form-control"
                          id="request-city"
                          type="text"
                          value={address.city}
                          onChange={(event) =>
                            setAddress({ ...address, city: event.target.value })
                          }
                          placeholder="Enter city"
                          required
                        />
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label" htmlFor="request-state">
                          State
                        </label>
                        <input
                          className="form-control"
                          id="request-state"
                          type="text"
                          value={address.state}
                          onChange={(event) =>
                            setAddress({
                              ...address,
                              state: event.target.value,
                            })
                          }
                          placeholder="Enter state"
                          required
                        />
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label" htmlFor="request-pincode">
                          Pincode
                        </label>
                        <input
                          className="form-control"
                          id="request-pincode"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          pattern="[0-9]{6}"
                          value={address.pincode}
                          onChange={(event) =>
                            setAddress({
                              ...address,
                              pincode: event.target.value
                                .replace(/\D/g, "")
                                .slice(0, 6),
                            })
                          }
                          placeholder="6-digit pincode"
                          required
                        />
                      </div>

                      <div className="col-md-6 mb-3">
                        <label
                          className="form-label"
                          htmlFor="request-landmark"
                        >
                          Landmark (Optional)
                        </label>
                        <input
                          className="form-control"
                          id="request-landmark"
                          type="text"
                          value={address.landmark}
                          onChange={(event) =>
                            setAddress({
                              ...address,
                              landmark: event.target.value,
                            })
                          }
                          placeholder="Nearby landmark"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label
                      className="form-label"
                      htmlFor="request-preferred-date"
                    >
                      Preferred date and time
                    </label>
                    <input
                      className="form-control"
                      id="request-preferred-date"
                      type="datetime-local"
                      min={minimumDateTime}
                      value={preferredDate}
                      onChange={(event) => setPreferredDate(event.target.value)}
                      required
                    />
                  </div>
                  <div className="d-flex flex-wrap justify-content-end gap-2">
                    <Link
                      className="btn btn-outline-secondary"
                      to="/customer/service-requests"
                    >
                      My requests
                    </Link>
                    <button
                      className="btn btn-primary"
                      type="submit"
                      disabled={
                        submitting || loadingServices || services.length === 0
                      }
                    >
                      {submitting ? "Submitting..." : "Submit request"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default CreateServiceRequest;
