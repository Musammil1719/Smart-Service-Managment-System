const express = require('express')
const mongoose = require('mongoose')
const Review = require('../models/Review')
const Service = require('../models/Service')
const ServiceRequest = require('../models/ServiceRequest')
const authenticateToken = require('../middleware/authenticateToken')
const requireRole = require('../middleware/requireRole')
const createNotification = require('../utils/createNotification')

const router = express.Router()

function isValidId(value) {
  return mongoose.isValidObjectId(value)
}

function referenceId(value) {
  return value && typeof value === 'object' && value._id ? String(value._id) : String(value)
}

function toReviewResponse(review, { includeCustomer = false, includeTechnicianEmail = false } = {}) {
  const technician = review.serviceRequest?.technician

  return {
    id: review.id,
    ...(includeCustomer && review.customer
      ? { customer: { id: referenceId(review.customer), name: review.customer.name, email: review.customer.email } }
      : {}),
    service: review.service && typeof review.service === 'object'
      ? {
          id: referenceId(review.service),
          name: review.service.name,
          category: review.service.category,
          ...(review.service.price !== undefined ? { price: review.service.price } : {}),
        }
      : { id: referenceId(review.service) },
    serviceRequest: review.serviceRequest && typeof review.serviceRequest === 'object'
      ? {
          id: referenceId(review.serviceRequest),
          status: review.serviceRequest.status,
          ...(technician
            ? {
                technician: {
                  id: referenceId(technician),
                  name: technician.name,
                  ...(includeTechnicianEmail ? { email: technician.email } : {}),
                },
              }
            : {}),
        }
      : { id: referenceId(review.serviceRequest) },
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  }
}

const myReviewPopulation = [
  { path: 'service', select: 'name category' },
  {
    path: 'serviceRequest',
    select: 'status technician',
    populate: { path: 'technician', select: 'name' },
  },
]

const fullReviewPopulation = [
  { path: 'customer', select: 'name email' },
  { path: 'service', select: 'name category price' },
  {
    path: 'serviceRequest',
    select: 'status technician',
    populate: { path: 'technician', select: 'name email' },
  },
]

router.use(authenticateToken)

router.post('/', requireRole('customer'), async (req, res) => {
  const { serviceRequest: serviceRequestId, rating, comment } = req.body || {}

  if (
    !req.body ||
    typeof req.body !== 'object' ||
    Array.isArray(req.body) ||
    Object.keys(req.body).some((field) => !['serviceRequest', 'rating', 'comment'].includes(field))
  ) {
    return res.status(400).json({ message: 'Request contains invalid fields.' })
  }

  if (typeof serviceRequestId !== 'string' || !serviceRequestId.trim()) {
    return res.status(400).json({ message: 'Service request is required.' })
  }

  if (!isValidId(serviceRequestId)) {
    return res.status(400).json({ message: 'Invalid service request ID.' })
  }

  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be an integer between 1 and 5.' })
  }

  if (typeof comment !== 'string' || !comment.trim()) {
    return res.status(400).json({ message: 'A non-empty comment is required.' })
  }

  try {
    const serviceRequest = await ServiceRequest.findById(serviceRequestId)
      .select('customer service technician status')

    if (!serviceRequest) {
      return res.status(404).json({ message: 'Service request not found.' })
    }

    if (String(serviceRequest.customer) !== req.user.userId) {
      return res.status(403).json({ message: 'You are not authorized to review this service request.' })
    }

    if (serviceRequest.status !== 'Completed') {
      return res.status(400).json({ message: 'Only completed service requests can be reviewed.' })
    }

    if (!serviceRequest.service || !isValidId(String(serviceRequest.service))) {
      return res.status(400).json({ message: 'The service request does not have a valid service.' })
    }

    const serviceExists = await Service.exists({ _id: serviceRequest.service })
    if (!serviceExists) {
      return res.status(400).json({ message: 'The service request does not have a valid service.' })
    }

    const existingReview = await Review.exists({ serviceRequest: serviceRequest._id })
    if (existingReview) {
      return res.status(409).json({ message: 'This service request has already been reviewed.' })
    }

    const review = await Review.create({
      customer: req.user.userId,
      serviceRequest: serviceRequest._id,
      service: serviceRequest.service,
      rating,
      comment: comment.trim(),
    })
    await review.populate(myReviewPopulation)
    if (serviceRequest.technician) {
      try {
        await createNotification({
          userId: serviceRequest.technician,
          type: 'NEW_REVIEW',
          title: 'New Service Review',
          message: 'A customer has submitted a review for a completed service.',
          serviceRequestId: serviceRequest._id,
        })
      } catch (error) {
        console.error('Review notification creation failed:', error.message)
      }
    }

    return res.status(201).json({
      message: 'Review created successfully.',
      review: toReviewResponse(review),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This service request has already been reviewed.' })
    }

    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid review data.' })
    }

    console.error('Review creation failed:', error.message)
    return res.status(500).json({ message: 'Review creation failed. Please try again.' })
  }
})

router.get('/my', requireRole('customer'), async (req, res) => {
  try {
    const reviews = await Review.find({ customer: req.user.userId })
      .populate(myReviewPopulation)
      .sort({ createdAt: -1 })

    return res.status(200).json({
      reviews: reviews.map((review) => toReviewResponse(review)),
    })
  } catch (error) {
    console.error('Customer review listing failed:', error.message)
    return res.status(500).json({ message: 'Unable to retrieve reviews.' })
  }
})

router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate(fullReviewPopulation)
      .sort({ createdAt: -1 })

    return res.status(200).json({
      reviews: reviews.map((review) => toReviewResponse(review, { includeCustomer: true, includeTechnicianEmail: true })),
    })
  } catch (error) {
    console.error('Admin review listing failed:', error.message)
    return res.status(500).json({ message: 'Unable to retrieve reviews.' })
  }
})

router.get('/:id', requireRole('customer', 'admin'), async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid review ID.' })
  }

  try {
    const review = await Review.findById(req.params.id).populate(fullReviewPopulation)

    if (!review) {
      return res.status(404).json({ message: 'Review not found.' })
    }

    if (req.user.role === 'customer' && referenceId(review.customer) !== req.user.userId) {
      return res.status(403).json({ message: 'You are not authorized to access this review.' })
    }

    return res.status(200).json({
      review: toReviewResponse(review, { includeCustomer: true, includeTechnicianEmail: true }),
    })
  } catch (error) {
    console.error('Review retrieval failed:', error.message)
    return res.status(500).json({ message: 'Unable to retrieve review.' })
  }
})

router.delete('/:id', requireRole('admin'), async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid review ID.' })
  }

  try {
    const review = await Review.findByIdAndDelete(req.params.id)
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' })
    }

    return res.status(200).json({ message: 'Review deleted successfully.' })
  } catch (error) {
    console.error('Review deletion failed:', error.message)
    return res.status(500).json({ message: 'Review deletion failed. Please try again.' })
  }
})

module.exports = router
