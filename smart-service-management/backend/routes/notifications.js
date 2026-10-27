const express = require('express')
const mongoose = require('mongoose')
const Notification = require('../models/Notification')
const authenticateToken = require('../middleware/authenticateToken')

const router = express.Router()
const notificationProjection = 'type title message serviceRequest isRead createdAt updatedAt'

function toNotificationResponse(notification) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    serviceRequest: notification.serviceRequest && typeof notification.serviceRequest === 'object'
      ? {
          id: String(notification.serviceRequest._id),
          ...(notification.serviceRequest.status
            ? { status: notification.serviceRequest.status }
            : {}),
        }
      : notification.serviceRequest
        ? { id: String(notification.serviceRequest) }
        : null,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  }
}

router.use(authenticateToken)

router.get('/unread', async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user.userId,
      isRead: false,
    })
      .select(notificationProjection)
      .populate('serviceRequest', 'status')
      .sort({ createdAt: -1 })

    return res.status(200).json({
      notifications: notifications.map(toNotificationResponse),
    })
  } catch (error) {
    console.error('Unread notification listing failed:', error.message)
    return res.status(500).json({ message: 'Unable to retrieve notifications.' })
  }
})

router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.userId })
      .select(notificationProjection)
      .populate('serviceRequest', 'status')
      .sort({ createdAt: -1 })

    return res.status(200).json({
      notifications: notifications.map(toNotificationResponse),
    })
  } catch (error) {
    console.error('Notification listing failed:', error.message)
    return res.status(500).json({ message: 'Unable to retrieve notifications.' })
  }
})

router.put('/read-all', async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user.userId, isRead: false },
      { $set: { isRead: true } },
    )

    return res.status(200).json({
      message: 'Notifications marked as read.',
      updatedCount: result.modifiedCount,
    })
  } catch (error) {
    console.error('Mark-all-read failed:', error.message)
    return res.status(500).json({ message: 'Unable to update notifications.' })
  }
})

router.put('/:id/read', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid notification ID.' })
  }

  try {
    const notification = await Notification.findById(req.params.id)
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' })
    }

    if (String(notification.user) !== req.user.userId) {
      return res.status(403).json({ message: 'You are not authorized to access this notification.' })
    }

    notification.isRead = true
    await notification.save()

    return res.status(200).json({
      message: 'Notification marked as read.',
      notification: toNotificationResponse(notification),
    })
  } catch (error) {
    console.error('Mark-notification-read failed:', error.message)
    return res.status(500).json({ message: 'Unable to update notification.' })
  }
})

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid notification ID.' })
  }

  try {
    const notification = await Notification.findById(req.params.id)
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' })
    }

    if (String(notification.user) !== req.user.userId) {
      return res.status(403).json({ message: 'You are not authorized to delete this notification.' })
    }

    await notification.deleteOne()
    return res.status(200).json({ message: 'Notification deleted successfully.' })
  } catch (error) {
    console.error('Notification deletion failed:', error.message)
    return res.status(500).json({ message: 'Unable to delete notification.' })
  }
})

module.exports = router
