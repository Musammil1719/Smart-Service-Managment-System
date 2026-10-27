const Notification = require('../models/Notification')

async function createNotification({ userId, type, title, message, serviceRequestId, eventKey }) {
  const notification = {
    user: userId,
    type,
    title,
    message,
    serviceRequest: serviceRequestId || null,
  }

  if (eventKey) {
    return Notification.findOneAndUpdate(
      { eventKey },
      { $setOnInsert: { ...notification, eventKey } },
      { upsert: true, new: true, runValidators: true },
    )
  }

  return Notification.create(notification)
}

module.exports = createNotification
