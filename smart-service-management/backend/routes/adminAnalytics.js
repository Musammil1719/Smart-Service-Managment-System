const express = require('express')
const User = require('../models/User')
const Service = require('../models/Service')
const ServiceRequest = require('../models/ServiceRequest')
const Review = require('../models/Review')
const Notification = require('../models/Notification')
const authenticateToken = require('../middleware/authenticateToken')
const requireRole = require('../middleware/requireRole')

const router = express.Router()
const requestStatuses = ['Pending', 'Assigned', 'Accepted', 'In Progress', 'Completed', 'Cancelled']
const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

router.use(authenticateToken, requireRole('admin'))

function withErrorHandling(operation, handler) {
  return async (req, res) => {
    try {
      return await handler(req, res)
    } catch (error) {
      console.error(`${operation} failed:`, error.message)
      return res.status(500).json({ message: 'Unable to retrieve analytics.' })
    }
  }
}

function monthRange(year) {
  return {
    $gte: new Date(Date.UTC(year, 0, 1)),
    $lt: new Date(Date.UTC(year + 1, 0, 1)),
  }
}

function monthResults(rows) {
  const counts = new Map(rows.map(({ _id, count }) => [_id, count]))
  return months.map((month, index) => ({
    month,
    count: counts.get(index + 1) || 0,
  }))
}

function personResponse(person) {
  if (!person) {
    return null
  }

  return {
    id: String(person._id),
    name: person.name,
    email: person.email,
  }
}

router.get('/summary', withErrorHandling('Admin summary analytics', async (req, res) => {
  const [userGroups, serviceGroups, requestGroups, reviewGroups, notificationGroups] = await Promise.all([
    User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),
    Service.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          inactive: { $sum: { $cond: ['$isActive', 0, 1] } },
        },
      },
    ]),
    ServiceRequest.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Review.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          averageRating: { $avg: '$rating' },
        },
      },
    ]),
    Notification.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
        },
      },
    ]),
  ])

  const usersByRole = new Map(userGroups.map(({ _id, count }) => [_id, count]))
  const requestsByStatus = new Map(requestGroups.map(({ _id, count }) => [_id, count]))
  const serviceCounts = serviceGroups[0] || { total: 0, active: 0, inactive: 0 }
  const reviewCounts = reviewGroups[0] || { total: 0, averageRating: 0 }
  const notificationCounts = notificationGroups[0] || { total: 0, unread: 0 }
  const averageRating = Math.round((reviewCounts.averageRating || 0) * 10) / 10

  return res.status(200).json({
    users: {
      total: userGroups.reduce((total, group) => total + group.count, 0),
      customers: usersByRole.get('customer') || 0,
      technicians: usersByRole.get('technician') || 0,
      admins: usersByRole.get('admin') || 0,
    },
    services: {
      total: serviceCounts.total,
      active: serviceCounts.active,
      inactive: serviceCounts.inactive,
    },
    serviceRequests: Object.fromEntries(
      [['total', requestGroups.reduce((total, group) => total + group.count, 0)]]
        .concat(requestStatuses.map((status) => [
          status === 'In Progress'
            ? 'inProgress'
            : status.toLowerCase(),
          requestsByStatus.get(status) || 0,
        ])),
    ),
    reviews: {
      total: reviewCounts.total,
      averageRating,
    },
    notifications: {
      total: notificationCounts.total,
      unread: notificationCounts.unread,
    },
  })
}))

router.get('/request-status', withErrorHandling('Request status analytics', async (req, res) => {
  const rows = await ServiceRequest.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ])
  const counts = new Map(rows.map(({ _id, count }) => [_id, count]))

  return res.status(200).json(requestStatuses.map((status) => ({
    status,
    count: counts.get(status) || 0,
  })))
}))

router.get('/services', withErrorHandling('Service category analytics', async (req, res) => {
  const services = await Service.aggregate([
    {
      $group: {
        _id: '$category',
        serviceCount: { $sum: 1 },
        activeCount: { $sum: { $cond: ['$isActive', 1, 0] } },
        inactiveCount: { $sum: { $cond: ['$isActive', 0, 1] } },
      },
    },
    { $project: { _id: 0, category: '$_id', serviceCount: 1, activeCount: 1, inactiveCount: 1 } },
    { $sort: { serviceCount: -1, category: 1 } },
  ])

  return res.status(200).json(services)
}))

router.get('/requests-by-service', withErrorHandling('Requests-by-service analytics', async (req, res) => {
  const services = await Service.aggregate([
    {
      $lookup: {
        from: ServiceRequest.collection.name,
        let: { serviceId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$service', '$$serviceId'] } } },
          {
            $group: {
              _id: null,
              requestCount: { $sum: 1 },
              completedCount: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
              cancelledCount: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
            },
          },
        ],
        as: 'requestStats',
      },
    },
    {
      $project: {
        _id: 0,
        serviceId: '$_id',
        serviceName: '$name',
        requestCount: { $ifNull: [{ $arrayElemAt: ['$requestStats.requestCount', 0] }, 0] },
        completedCount: { $ifNull: [{ $arrayElemAt: ['$requestStats.completedCount', 0] }, 0] },
        cancelledCount: { $ifNull: [{ $arrayElemAt: ['$requestStats.cancelledCount', 0] }, 0] },
      },
    },
    { $sort: { requestCount: -1, serviceName: 1 } },
  ])

  return res.status(200).json(services)
}))

router.get('/technicians', withErrorHandling('Technician workload analytics', async (req, res) => {
  const technicians = await User.aggregate([
    { $match: { role: 'technician' } },
    {
      $lookup: {
        from: ServiceRequest.collection.name,
        let: { technicianId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$technician', '$$technicianId'] } } },
          {
            $group: {
              _id: null,
              assignedRequests: { $sum: 1 },
              completedRequests: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
              inProgressRequests: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
              cancelledRequests: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
            },
          },
        ],
        as: 'workload',
      },
    },
    { $unwind: { path: '$workload', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        technicianId: '$_id',
        name: 1,
        email: 1,
        assignedRequests: { $ifNull: ['$workload.assignedRequests', 0] },
        completedRequests: { $ifNull: ['$workload.completedRequests', 0] },
        inProgressRequests: { $ifNull: ['$workload.inProgressRequests', 0] },
        cancelledRequests: { $ifNull: ['$workload.cancelledRequests', 0] },
      },
    },
    { $sort: { assignedRequests: -1, name: 1 } },
  ])

  return res.status(200).json(technicians)
}))

router.get('/recent-requests', withErrorHandling('Recent requests analytics', async (req, res) => {
  const requests = await ServiceRequest.find()
    .select('customer service technician status preferredDate createdAt completedAt')
    .populate('customer', 'name email')
    .populate('service', 'name category')
    .populate('technician', 'name email')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean()

  return res.status(200).json(requests.map((request) => ({
    requestId: String(request._id),
    status: request.status,
    preferredDate: request.preferredDate,
    createdAt: request.createdAt,
    completedAt: request.completedAt,
    customer: personResponse(request.customer),
    service: request.service
      ? {
          id: String(request.service._id),
          name: request.service.name,
          category: request.service.category,
        }
      : null,
    technician: personResponse(request.technician),
  })))
}))

router.get('/recent-reviews', withErrorHandling('Recent reviews analytics', async (req, res) => {
  const reviews = await Review.find()
    .select('customer service serviceRequest rating comment createdAt')
    .populate('customer', 'name email')
    .populate('service', 'name category')
    .populate({
      path: 'serviceRequest',
      select: 'technician',
      populate: { path: 'technician', select: 'name email' },
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean()

  return res.status(200).json(reviews.map((review) => ({
    reviewId: String(review._id),
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    customer: personResponse(review.customer),
    service: review.service
      ? {
          id: String(review.service._id),
          name: review.service.name,
          category: review.service.category,
        }
      : null,
    technician: personResponse(review.serviceRequest && review.serviceRequest.technician),
  })))
}))

router.get('/monthly-requests', withErrorHandling('Monthly requests analytics', async (req, res) => {
  const year = new Date().getUTCFullYear()
  const rows = await ServiceRequest.aggregate([
    { $match: { createdAt: monthRange(year) } },
    { $group: { _id: { $month: '$createdAt' }, count: { $sum: 1 } } },
  ])

  return res.status(200).json(monthResults(rows))
}))

router.get('/monthly-completed', withErrorHandling('Monthly completed analytics', async (req, res) => {
  const year = new Date().getUTCFullYear()
  const rows = await ServiceRequest.aggregate([
    {
      $match: {
        status: 'Completed',
        completedAt: { $ne: null, ...monthRange(year) },
      },
    },
    { $group: { _id: { $month: '$completedAt' }, count: { $sum: 1 } } },
  ])

  return res.status(200).json(monthResults(rows))
}))

router.get('/top-services', withErrorHandling('Top services analytics', async (req, res) => {
  const services = await Service.aggregate([
    {
      $lookup: {
        from: ServiceRequest.collection.name,
        let: { serviceId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$service', '$$serviceId'] } } },
          {
            $group: {
              _id: null,
              requestCount: { $sum: 1 },
              completedCount: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
            },
          },
        ],
        as: 'requestStats',
      },
    },
    { $unwind: '$requestStats' },
    {
      $lookup: {
        from: Review.collection.name,
        localField: '_id',
        foreignField: 'service',
        pipeline: [{ $group: { _id: null, averageRating: { $avg: '$rating' } } }],
        as: 'ratingStats',
      },
    },
    {
      $project: {
        _id: 0,
        serviceId: '$_id',
        serviceName: '$name',
        category: 1,
        requestCount: '$requestStats.requestCount',
        completedCount: '$requestStats.completedCount',
        averageRating: { $round: [{ $ifNull: [{ $arrayElemAt: ['$ratingStats.averageRating', 0] }, 0] }, 1] },
      },
    },
    { $sort: { requestCount: -1, serviceName: 1 } },
    { $limit: 5 },
  ])

  return res.status(200).json(services)
}))

router.get('/top-technicians', withErrorHandling('Top technicians analytics', async (req, res) => {
  const technicians = await ServiceRequest.aggregate([
    { $match: { status: 'Completed', technician: { $ne: null } } },
    {
      $lookup: {
        from: Review.collection.name,
        localField: '_id',
        foreignField: 'serviceRequest',
        pipeline: [{ $group: { _id: null, averageRating: { $avg: '$rating' } } }],
        as: 'ratingStats',
      },
    },
    {
      $group: {
        _id: '$technician',
        completedRequests: { $sum: 1 },
        averageRating: { $avg: { $arrayElemAt: ['$ratingStats.averageRating', 0] } },
      },
    },
    {
      $lookup: {
        from: User.collection.name,
        localField: '_id',
        foreignField: '_id',
        pipeline: [{ $project: { name: 1 } }],
        as: 'technician',
      },
    },
    { $unwind: '$technician' },
    {
      $project: {
        _id: 0,
        technicianId: '$_id',
        name: '$technician.name',
        completedRequests: 1,
        averageRating: { $round: [{ $ifNull: ['$averageRating', 0] }, 1] },
      },
    },
    { $sort: { completedRequests: -1, name: 1 } },
    { $limit: 5 },
  ])

  return res.status(200).json(technicians)
}))

module.exports = router
