
const mongoose = require('mongoose')

const serviceRequestSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
  },
  technician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    houseNo: {
      type: String,
      required: true,
      trim: true,
    },
    street: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
    },
    landmark: {
      type: String,
      default: '',
      trim: true,
    },
  },
  preferredDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: [
      'Pending',
      'Assigned',
      'Accepted',
      'In Progress',
      'Completed',
      'Cancelled',
    ],
    default: 'Pending',
  },
  completedAt: {
    type: Date,
    default: null,
  },
  completionPending: {
    type: Boolean,
    default: false,
  },
  completionServiceName: {
    type: String,
    default: null,
  },
  completionBaseServiceAmount: {
    type: Number,
    default: null,
  },
  completionPartsCharges: {
    type: Number,
    default: null,
  },
  completionMaterialCharges: {
    type: Number,
    default: null,
  },
}, {
  timestamps: true,
})

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema)
