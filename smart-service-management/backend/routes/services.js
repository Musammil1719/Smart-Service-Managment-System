const express = require('express')
const mongoose = require('mongoose')
const Service = require('../models/Service')
const authenticateToken = require('../middleware/authenticateToken')
const requireRole = require('../middleware/requireRole')

const router = express.Router()
const serviceFields = ['name', 'description', 'category', 'price', 'duration', 'isActive']
const requiredFields = ['name', 'description', 'category', 'price', 'duration']
const serviceProjection = 'name description category price duration isActive createdAt updatedAt'

function toServiceResponse(service) {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    category: service.category,
    price: service.price,
    duration: service.duration,
    isActive: service.isActive,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  }
}

function validateServiceInput(body, { partial = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object.'
  }

  const keys = Object.keys(body)
  const unexpectedFields = keys.filter((key) => !serviceFields.includes(key))
  if (unexpectedFields.length > 0) {
    return 'Request contains unsupported fields.'
  }

  if (!partial) {
    const missingFields = requiredFields.filter((field) => !Object.hasOwn(body, field))
    if (missingFields.length > 0) {
      return `Missing required fields: ${missingFields.join(', ')}.`
    }
  } else if (keys.length === 0) {
    return 'At least one service field must be provided.'
  }

  for (const field of ['name', 'description', 'category', 'duration']) {
    if (Object.hasOwn(body, field) && (typeof body[field] !== 'string' || !body[field].trim())) {
      return `${field} must be a non-empty string.`
    }
  }

  if (Object.hasOwn(body, 'price') &&
    (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0)) {
    return 'Price must be a number greater than or equal to 0.'
  }

  if (Object.hasOwn(body, 'isActive') && typeof body.isActive !== 'boolean') {
    return 'isActive must be a boolean.'
  }

  return null
}

router.use(authenticateToken)

router.post('/', requireRole('admin'), async (req, res) => {
  const validationError = validateServiceInput(req.body)
  if (validationError) {
    return res.status(400).json({ message: validationError })
  }

  try {
    const service = await Service.create(req.body)
    return res.status(201).json({
      message: 'Service created successfully.',
      service: toServiceResponse(service),
    })
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid service data.' })
    }

    console.error('Service creation failed:', error.message)
    return res.status(500).json({ message: 'Service creation failed. Please try again.' })
  }
})

router.get('/', async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { isActive: true }
    const services = await Service.find(filter).select(serviceProjection).sort({ createdAt: -1 })
    return res.status(200).json({ services: services.map(toServiceResponse) })
  } catch (error) {
    console.error('Service listing failed:', error.message)
    return res.status(500).json({ message: 'Unable to retrieve services.' })
  }
})

router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid service ID.' })
  }

  try {
    const filter = { _id: req.params.id }
    if (req.user.role !== 'admin') {
      filter.isActive = true
    }

    const service = await Service.findOne(filter).select(serviceProjection)
    if (!service) {
      return res.status(404).json({ message: 'Service not found.' })
    }

    return res.status(200).json({ service: toServiceResponse(service) })
  } catch (error) {
    console.error('Service retrieval failed:', error.message)
    return res.status(500).json({ message: 'Unable to retrieve service.' })
  }
})

router.put('/:id', requireRole('admin'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid service ID.' })
  }

  const validationError = validateServiceInput(req.body, { partial: true })
  if (validationError) {
    return res.status(400).json({ message: validationError })
  }

  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true, select: serviceProjection },
    )

    if (!service) {
      return res.status(404).json({ message: 'Service not found.' })
    }

    return res.status(200).json({
      message: 'Service updated successfully.',
      service: toServiceResponse(service),
    })
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid service data.' })
    }

    console.error('Service update failed:', error.message)
    return res.status(500).json({ message: 'Service update failed. Please try again.' })
  }
})

router.delete('/:id', requireRole('admin'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid service ID.' })
  }

  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true, select: serviceProjection },
    )

    if (!service) {
      return res.status(404).json({ message: 'Service not found.' })
    }

    return res.status(200).json({
      message: 'Service deactivated successfully.',
      service: toServiceResponse(service),
    })
  } catch (error) {
    console.error('Service deactivation failed:', error.message)
    return res.status(500).json({ message: 'Service deactivation failed. Please try again.' })
  }
})

module.exports = router
