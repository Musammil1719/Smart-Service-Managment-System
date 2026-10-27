const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      'REQUEST_CREATED',
      'TECHNICIAN_ASSIGNED',
      'REQUEST_ACCEPTED',
      'SERVICE_STARTED',
      'SERVICE_COMPLETED',
      'REQUEST_CANCELLED',
      'NEW_REVIEW',
      'BILL_GENERATED',
      'BILL_PAID',
    ],
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  serviceRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceRequest',
    default: null,
  },
  eventKey: {
    type: String,
    trim: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
})

notificationSchema.index({ user: 1, createdAt: -1 })
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 })
notificationSchema.index({ eventKey: 1 }, { unique: true, sparse: true })

module.exports = mongoose.model('Notification', notificationSchema)
