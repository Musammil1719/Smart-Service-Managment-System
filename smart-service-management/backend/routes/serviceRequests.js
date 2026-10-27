const express = require("express");
const mongoose = require("mongoose");
const Service = require("../models/Service");
const ServiceRequest = require("../models/ServiceRequest");
const User = require("../models/User");
const authenticateToken = require("../middleware/authenticateToken");
const requireRole = require("../middleware/requireRole");
const createNotification = require("../utils/createNotification");

const router = express.Router();
const detailPopulation = [
  { path: "customer", select: "name email" },
  { path: "service", select: "name category description price duration" },
  { path: "technician", select: "name email" },
];
const adminPopulation = [
  { path: "customer", select: "name email" },
  { path: "service", select: "name category price" },
  { path: "technician", select: "name email" },
];
const assignedPopulation = [
  { path: "customer", select: "name email" },
  { path: "service", select: "name category price" },
];


function toServiceRequestResponse(request) {
  return {
    id: request.id,
    customer: request.customer,
    service: request.service,
    technician: request.technician,
    description: request.description,
    address: request.address
      ? {
          houseNo: request.address.houseNo,
          street: request.address.street,
          city: request.address.city,
          state: request.address.state,
          pincode: request.address.pincode,
          landmark: request.address.landmark || '',
        }
      : null,
    preferredDate: request.preferredDate,
    status: request.status,
    completedAt: request.completedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}


function isValidId(value) {
  return mongoose.isValidObjectId(value);
}

function hasMatchingId(value, userId) {
  const valueId =
    value && typeof value === "object" && value._id ? value._id : value;
  return valueId != null && String(valueId) === userId;
}

async function notifyUsers(userIds, notification) {
  await Promise.all(
    [...new Set(userIds.filter(Boolean).map(String))].map(async (userId) => {
      try {
        await createNotification({ ...notification, userId });
      } catch (error) {
        console.error(
          `Notification creation failed (${notification.type}):`,
          error.message,
        );
      }
    }),
  );
}

async function notifyAdmins(notification) {
  try {
    const admins = await User.find({ role: "admin" }).select("_id").lean();
    await notifyUsers(
      admins.map((admin) => admin._id),
      notification,
    );
  } catch (error) {
    console.error(
      `Admin notification lookup failed (${notification.type}):`,
      error.message,
    );
  }
}

function validateRequestBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }

  if (
    Object.keys(body).some(
      (field) =>
        !["service", "description", "preferredDate", "address"].includes(field),
    )
  ) {
    return "Request contains unsupported fields.";
  }

  if (typeof body.service !== "string" || !body.service.trim()) {
    return "Service is required.";
  }

  if (!isValidId(body.service)) {
    return "Invalid service ID.";
  }

  if (typeof body.description !== "string" || !body.description.trim()) {
    return "Description is required.";
  }

  if (typeof body.preferredDate !== "string" || !body.preferredDate.trim()) {
    return "Preferred date is required.";
  }

  const preferredDate = new Date(body.preferredDate);

  if (
    Number.isNaN(preferredDate.getTime()) ||
    (/^\d{4}-\d{2}-\d{2}$/.test(body.preferredDate) &&
      preferredDate.toISOString().slice(0, 10) !== body.preferredDate)
  ) {
    return "Preferred date must be a valid date.";
  }

  if (
    !body.address ||
    typeof body.address !== "object" ||
    Array.isArray(body.address)
  ) {
    return "Service address is required.";
  }

  if (
    Object.keys(body.address).some(
      (field) =>
        !["houseNo", "street", "city", "state", "pincode", "landmark"].includes(
          field,
        ),
    )
  ) {
    return "Address contains unsupported fields.";
  }

  const requiredAddressFields = [
    ["houseNo", "House / Door number"],
    ["street", "Street / Area"],
    ["city", "City"],
    ["state", "State"],
    ["pincode", "Pincode"],
  ];

  for (const [field, label] of requiredAddressFields) {
    if (
      typeof body.address[field] !== "string" ||
      !body.address[field].trim()
    ) {
      return `${label} is required.`;
    }
  }

  if (!/^\d{6}$/.test(body.address.pincode.trim())) {
    return "Pincode must contain exactly 6 digits.";
  }

  if (
    body.address.landmark !== undefined &&
    typeof body.address.landmark !== "string"
  ) {
    return "Landmark must be text.";
  }

  return null;
}

async function findRequestById(id, res) {
  if (!isValidId(id)) {
    res.status(400).json({ message: "Invalid service request ID." });
    return null;
  }

  const request = await ServiceRequest.findById(id);
  if (!request) {
    res.status(404).json({ message: "Service request not found." });
    return null;
  }

  return request;
}

router.use(authenticateToken);

router.post("/", requireRole("customer"), async (req, res) => {
  const validationError = validateRequestBody(req.body);
  if (validationError) {
    console.log("Request validation error:", validationError);
    console.log("Received request body:", req.body);
    return res.status(400).json({ message: validationError });
  }

  try {
    const service = await Service.findOne({
      _id: req.body.service,
      isActive: true,
    }).select("_id");
    if (!service) {
      return res.status(404).json({ message: "Active service not found." });
    }
    console.log('Incoming address:', req.body.address)
    const request = await ServiceRequest.create({
      customer: req.user.userId,
      service: service._id,
      technician: null,
      description: req.body.description,
      address: {
        houseNo: req.body.address.houseNo,
        street: req.body.address.street,
        city: req.body.address.city,
        state: req.body.address.state,
        pincode: req.body.address.pincode,
        landmark: req.body.address.landmark || "",
      },
      preferredDate: new Date(req.body.preferredDate),
      status: "Pending",
      completedAt: null,
    });
    console.log('Saved address:', request.address)
    console.log('Saved request ID:', request._id.toString())

    await notifyAdmins({
      type: "REQUEST_CREATED",
      title: "New Service Request",
      message: "A new service request has been created.",
      serviceRequestId: request._id,
    });

    return res.status(201).json({
      message: "Service request created successfully.",
      serviceRequest: toServiceRequestResponse(request),
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: "Invalid service request data." });
    }

    console.error("Service request creation failed:", error.message);
    return res
      .status(500)
      .json({ message: "Service request creation failed. Please try again." });
  }
});

router.get("/my", requireRole("customer"), async (req, res) => {
  try {
    const requests = await ServiceRequest.find({ customer: req.user.userId })
      .populate("service", "name category price duration")
      .populate("technician", "name email")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json({ serviceRequests: requests.map(toServiceRequestResponse) });
  } catch (error) {
    console.error("Customer service request listing failed:", error.message);
    return res
      .status(500)
      .json({ message: "Unable to retrieve service requests." });
  }
});

router.get("/assigned", requireRole("technician"), async (req, res) => {
  try {
    const requests = await ServiceRequest.find({ technician: req.user.userId })
      .populate("customer", "name email")
      .populate("service", "name category description price")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json({ serviceRequests: requests.map(toServiceRequestResponse) });
  } catch (error) {
    console.error("Assigned service request listing failed:", error.message);
    return res
      .status(500)
      .json({ message: "Unable to retrieve assigned service requests." });
  }
});

router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const requests = await ServiceRequest.find()
      .populate(adminPopulation)
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json({ serviceRequests: requests.map(toServiceRequestResponse) });
  } catch (error) {
    console.error("Admin service request listing failed:", error.message);
    return res
      .status(500)
      .json({ message: "Unable to retrieve service requests." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const request = await findRequestById(req.params.id, res);
    if (!request) {
      return;
    }

    const ownsRequest = String(request.customer) === req.user.userId;
    const assignedTechnician = String(request.technician) === req.user.userId;
    if (
      (req.user.role === "customer" && !ownsRequest) ||
      (req.user.role === "technician" && !assignedTechnician)
    ) {
      return res.status(403).json({
        message: "You are not authorized to access this service request.",
      });
    }

    await request.populate(detailPopulation);
    return res
      .status(200)
      .json({ serviceRequest: toServiceRequestResponse(request) });
  } catch (error) {
    console.error("Service request retrieval failed:", error.message);
    return res
      .status(500)
      .json({ message: "Unable to retrieve service request." });
  }
});

router.put("/:id/assign", requireRole("admin"), async (req, res) => {
  const { technicianId } = req.body || {};
  if (
    typeof technicianId !== "string" ||
    !technicianId.trim() ||
    !isValidId(technicianId)
  ) {
    return res
      .status(400)
      .json({ message: "A valid technician ID is required." });
  }

  try {
    const request = await findRequestById(req.params.id, res);
    if (!request) {
      return;
    }

    if (["Completed", "Cancelled"].includes(request.status)) {
      return res
        .status(400)
        .json({ message: "This service request cannot be assigned." });
    }

    if (!["Pending", "Assigned"].includes(request.status)) {
      return res.status(400).json({
        message: "Only pending or assigned requests can be assigned.",
      });
    }

    const technician = await User.findById(technicianId).select("role");
    if (!technician) {
      return res.status(404).json({ message: "Technician not found." });
    }

    if (technician.role !== "technician") {
      return res
        .status(400)
        .json({ message: "The selected user is not a technician." });
    }

    request.technician = technician._id;
    request.status = "Assigned";
    await request.save();
    await notifyUsers([technician._id, request.customer], {
      type: "TECHNICIAN_ASSIGNED",
      title: "Service Request Assigned",
      message: "A technician has been assigned to the service request.",
      serviceRequestId: request._id,
    });
    await request.populate(detailPopulation);

    return res.status(200).json({
      message: "Technician assigned successfully.",
      serviceRequest: toServiceRequestResponse(request),
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: "Invalid service request data." });
    }

    console.error("Technician assignment failed:", error.message);
    return res
      .status(500)
      .json({ message: "Technician assignment failed. Please try again." });
  }
});

router.put(
  "/:id/reassign-technician",
  requireRole("admin"),
  async (req, res) => {
    const { technicianId } = req.body || {};
    if (
      !req.body ||
      typeof req.body !== "object" ||
      Array.isArray(req.body) ||
      Object.keys(req.body).some((field) => field !== "technicianId") ||
      typeof technicianId !== "string" ||
      !technicianId.trim() ||
      !isValidId(technicianId)
    ) {
      return res
        .status(400)
        .json({ message: "A valid technician ID is required." });
    }

    try {
      const request = await findRequestById(req.params.id, res);
      if (!request) {
        return;
      }

      if (request.status !== "Cancelled") {
        return res.status(400).json({
          message: "Only cancelled service requests can be reassigned.",
        });
      }

      if (request.technician && String(request.technician) === technicianId) {
        return res.status(400).json({
          message: "Select a different technician to reassign this request.",
        });
      }

      const technician = await User.findOne({
        _id: technicianId,
        role: "technician",
      }).select("_id");
      if (!technician) {
        return res.status(400).json({
          message: "The selected user is not an eligible technician.",
        });
      }

      const reassignedRequest = await ServiceRequest.findOneAndUpdate(
        {
          _id: request._id,
          status: "Cancelled",
          technician: request.technician,
        },
        { $set: { technician: technician._id, status: "Assigned" } },
        { returnDocument: "after", runValidators: true },
      );

      if (!reassignedRequest) {
        return res.status(400).json({
          message:
            "This request is no longer cancelled and cannot be reassigned.",
        });
      }

      await notifyUsers([reassignedRequest.customer, technician._id], {
        type: "TECHNICIAN_ASSIGNED",
        title: "New Technician Assigned",
        message: "A new technician has been assigned to your service request.",
        serviceRequestId: reassignedRequest._id,
      });
      await reassignedRequest.populate(detailPopulation);

      return res.status(200).json({
        message: "Technician reassigned successfully.",
        serviceRequest: toServiceRequestResponse(reassignedRequest),
      });
    } catch (error) {
      if (error.name === "ValidationError" || error.name === "CastError") {
        return res
          .status(400)
          .json({ message: "Invalid technician or service request data." });
      }

      console.error("Technician reassignment failed:", error.message);
      return res
        .status(500)
        .json({ message: "Technician reassignment failed. Please try again." });
    }
  },
);

async function transitionTechnicianRequest(
  req,
  res,
  expectedStatus,
  nextStatus,
  completed = false,
) {
  try {
    const request = await findRequestById(req.params.id, res);
    if (!request) {
      return;
    }

    if (String(request.technician) !== req.user.userId) {
      return res.status(403).json({
        message: "You are not authorized to update this service request.",
      });
    }

    if (request.status !== expectedStatus) {
      return res.status(400).json({
        message: `Service request must be ${expectedStatus} to continue.`,
      });
    }

    const update = { status: nextStatus };
    if (completed) {
      update.completedAt = new Date();
    }

    const transitionedRequest = await ServiceRequest.findOneAndUpdate(
      {
        _id: request._id,
        technician: req.user.userId,
        status: expectedStatus,
      },
      { $set: update },
      { returnDocument: "after", runValidators: true },
    );

    if (!transitionedRequest) {
      return res.status(400).json({
        message: `Service request must be ${expectedStatus} to continue.`,
      });
    }

    const transitionNotifications = {
      Accepted: {
        type: "REQUEST_ACCEPTED",
        title: "Service Request Accepted",
        message: "Your technician has accepted the service request.",
      },
      "In Progress": {
        type: "SERVICE_STARTED",
        title: "Service Started",
        message: "Your service has started.",
      },
      Completed: {
        type: "SERVICE_COMPLETED",
        title: "Service Completed",
        message: "Your service has been completed.",
      },
    };
    await notifyUsers([request.customer], {
      ...transitionNotifications[nextStatus],
      serviceRequestId: transitionedRequest._id,
    });
    await transitionedRequest.populate(detailPopulation);

    return res.status(200).json({
      message: `Service request ${nextStatus.toLowerCase()} successfully.`,
      serviceRequest: toServiceRequestResponse(transitionedRequest),
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: "Invalid service request data." });
    }

    console.error("Service request status update failed:", error.message);
    return res
      .status(500)
      .json({ message: "Service request update failed. Please try again." });
  }
}

router.put("/:id/accept", requireRole("technician"), (req, res) => {
  return transitionTechnicianRequest(req, res, "Assigned", "Accepted");
});

router.put("/:id/start", requireRole("technician"), (req, res) => {
  return transitionTechnicianRequest(req, res, "Accepted", "In Progress");
});

router.put("/:id/complete", requireRole("technician"), (req, res) => {
  return transitionTechnicianRequest(
    req,
    res,
    "In Progress",
    "Completed",
    true,
  );
});

router.put(
  "/:id/cancel",
  requireRole("customer", "technician"),
  async (req, res) => {
    try {
      const request = await findRequestById(req.params.id, res);
      if (!request) {
        return;
      }

      const isTechnician = req.user.role === "technician";
      const isAuthorized = isTechnician
        ? hasMatchingId(request.technician, req.user.userId)
        : hasMatchingId(request.customer, req.user.userId);
      if (!isAuthorized) {
        return res.status(403).json({
          message: isTechnician
            ? "You can cancel only service requests assigned to your technician account."
            : "You are not authorized to cancel this service request.",
        });
      }

      const allowedStatuses = isTechnician
        ? ["Assigned"]
        : ["Pending", "Assigned"];
      if (!allowedStatuses.includes(request.status)) {
        if (isTechnician) {
          return res.status(400).json({
            message:
              "Technicians can only cancel requests while they are Assigned.",
          });
        }

        return res.status(400).json({
          message: "This service request can no longer be cancelled.",
        });
      }

      const cancelledRequest = await ServiceRequest.findOneAndUpdate(
        {
          _id: request._id,
          [isTechnician ? "technician" : "customer"]: req.user.userId,
          status: { $in: allowedStatuses },
        },
        { $set: { status: "Cancelled" } },
        { returnDocument: "after", runValidators: true },
      );

      if (!cancelledRequest) {
        return res.status(400).json({
          message: isTechnician
            ? "The service request is no longer Assigned and cannot be cancelled."
            : "This service request can no longer be cancelled.",
        });
      }

      const cancellationMessage = isTechnician
        ? "The technician has cancelled the service request."
        : "The customer has cancelled the service request.";
      const notification = {
        type: "REQUEST_CANCELLED",
        title: "Service Request Cancelled",
        message: cancellationMessage,
        serviceRequestId: cancelledRequest._id,
      };

      if (isTechnician) {
        await notifyUsers([cancelledRequest.customer], notification);
      } else {
        await notifyUsers(
          cancelledRequest.technician ? [cancelledRequest.technician] : [],
          notification,
        );
      }
      await notifyAdmins(notification);

      return res.status(200).json({
        message: "Service request cancelled successfully.",
        serviceRequest: toServiceRequestResponse(cancelledRequest),
      });
    } catch (error) {
      if (error.name === "ValidationError" || error.name === "CastError") {
        return res
          .status(400)
          .json({ message: "Invalid service request data." });
      }

      console.error("Service request cancellation failed:", error.message);
      return res.status(500).json({
        message: "Service request cancellation failed. Please try again.",
      });
    }
  },
);

module.exports = router;
