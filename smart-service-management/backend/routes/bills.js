const express = require('express')
const mongoose = require('mongoose')
const Bill = require('../models/Bill')
const ServiceRequest = require('../models/ServiceRequest')
const authenticateToken = require('../middleware/authenticateToken')
const requireRole = require('../middleware/requireRole')
const createNotification = require('../utils/createNotification')

const router = express.Router()
const billPopulation = [
  { path: 'customer', select: 'name email' },
  { path: 'technician', select: 'name email' },
  { path: 'serviceRequest', select: 'status completedAt description' },
  { path: 'paidBy', select: 'name email' },
]

function toBillResponse(bill) {
  return {
    id: bill.id,
    invoiceNumber: bill.invoiceNumber,
    serviceName: bill.serviceName,
    baseServiceAmount: bill.baseServiceAmount,
    partsCharges: bill.partsCharges,
    materialCharges: bill.materialCharges,
    totalAmount: bill.totalAmount,
    serviceRequest: bill.serviceRequest,
    customer: bill.customer,
    technician: bill.technician,
    issueDate: bill.issueDate,
    paymentStatus: bill.paymentStatus,
    paidAt: bill.paidAt,
    paidBy: bill.paidBy,
    createdAt: bill.createdAt,
    updatedAt: bill.updatedAt,
  }
}

router.use(authenticateToken)

router.get('/', async (req, res) => {
  try {
    let filter = {}
    if (req.user.role === 'customer') {
      filter.customer = req.user.userId
    } else if (req.user.role === 'technician') {
      filter.technician = req.user.userId
    }

    const bills = await Bill.find(filter)
      .populate(billPopulation)
      .sort({ issueDate: -1 })

    return res.status(200).json({ bills: bills.map(toBillResponse) })
  } catch (error) {
    console.error('Bill listing failed:', error.message)
    return res.status(500).json({ message: 'Unable to retrieve bills.' })
  }
})

router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid bill ID.' })
  }

  try {
    const bill = await Bill.findById(req.params.id).populate(billPopulation)
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found.' })
    }

    const ownsBill = String(bill.customer?._id || bill.customer) === req.user.userId
    const assignedTechnician = String(bill.technician?._id || bill.technician) === req.user.userId
    if (
      (req.user.role === 'customer' && !ownsBill) ||
      (req.user.role === 'technician' && !assignedTechnician)
    ) {
      return res.status(403).json({ message: 'You are not authorized to access this bill.' })
    }

    if (!bill.serviceRequest || bill.serviceRequest.status !== 'Completed') {
      return res.status(404).json({ message: 'Bill not found.' })
    }

    return res.status(200).json({ bill: toBillResponse(bill) })
  } catch (error) {
    console.error('Bill retrieval failed:', error.message)
    return res.status(500).json({ message: 'Unable to retrieve bill.' })
  }
})

router.put('/:id/paid', requireRole('admin'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid bill ID.' })
  }

  try {
    const now = new Date()
    const updatedBill = await Bill.findOneAndUpdate(
      { _id: req.params.id, paymentStatus: 'Unpaid' },
      { $set: { paymentStatus: 'Paid', paidAt: now, paidBy: req.user.userId } },
      { returnDocument: 'after', runValidators: true },
    )

    const bill = updatedBill || await Bill.findById(req.params.id)
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found.' })
    }

    if (updatedBill) {
      try {
        await createNotification({
          userId: bill.customer,
          type: 'BILL_PAID',
          title: 'Bill marked as paid',
          message: `Invoice ${bill.invoiceNumber} has been marked as paid.`,
          serviceRequestId: bill.serviceRequest,
          eventKey: `bill-paid:${bill.id}`,
        })
      } catch (error) {
        console.error('Bill payment notification creation failed:', error.message)
      }
    }

    await bill.populate(billPopulation)
    return res.status(200).json({
      message: updatedBill ? 'Bill marked as paid.' : 'Bill was already paid.',
      bill: toBillResponse(bill),
    })
  } catch (error) {
    console.error('Bill payment update failed:', error.message)
    return res.status(500).json({ message: 'Unable to update bill payment status.' })
  }
})

router.use(requireRole('customer', 'technician', 'admin'))

module.exports = router
