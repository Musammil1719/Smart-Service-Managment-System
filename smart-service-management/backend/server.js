require('dotenv').config()
const dns = require("node:dns");
dns.setServers(["192.168.1.1"]);


const cors = require('cors')
const express = require('express')
const mongoose = require('mongoose')
const authRoutes = require('./routes/auth')
const serviceRoutes = require('./routes/services')
const serviceRequestRoutes = require('./routes/serviceRequests')
const reviewRoutes = require('./routes/reviews')
const notificationRoutes = require('./routes/notifications')
const adminAnalyticsRoutes = require('./routes/adminAnalytics')
const billRoutes = require('./routes/bills')

const app = express()
const port = process.env.PORT || 5000
const configuredOrigins = process.env.FRONTEND_ORIGIN
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const corsOptions = configuredOrigins?.length
  ? { origin: configuredOrigins }
  : process.env.NODE_ENV === 'production'
    ? { origin: false }
    : undefined

app.use(cors(corsOptions))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/service-requests', serviceRequestRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/admin/analytics', adminAnalyticsRoutes)
app.use('/api/bills', billRoutes)

app.get('/api/health', (req, res) => {
  res.json({ message: 'Smart Service Management API is running' })
})

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('MongoDB connected successfully')

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`)
    })
  } catch (error) {
    console.error('MongoDB connection failed:', error.message)
    process.exit(1)
  }
}

startServer()