const mongoose = require('mongoose')

const billSchema = new mongoose.Schema({
  serviceRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceRequest',
    required: true,
    unique: true,
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  serviceName: {
    type: String,
    required: true,
    trim: true,
  },
  baseServiceAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  partsCharges: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  materialCharges: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  technician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  issueDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  paymentStatus: {
    type: String,
    enum: ['Unpaid', 'Paid'],
    default: 'Unpaid',
    required: true,
  },
  paidAt: {
    type: Date,
    default: null,
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
})

billSchema.index({ customer: 1, issueDate: -1 })
billSchema.index({ technician: 1, issueDate: -1 })

module.exports = mongoose.model('Bill', billSchema)
