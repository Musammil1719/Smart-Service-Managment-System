const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const authenticateToken = require('../middleware/authenticateToken')
const requireRole = require('../middleware/requireRole')

const router = express.Router()
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body || {}

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof email !== 'string' ||
    !email.trim() ||
    typeof password !== 'string' ||
    !password.trim()
  ) {
    return res.status(400).json({ message: 'Name, email, and password are required.' })
  }

  const normalizedEmail = email.trim().toLowerCase()
  if (!emailPattern.test(normalizedEmail)) {
    return res.status(400).json({ message: 'A valid email address is required.' })
  }

  if (role !== 'customer' && role !== 'technician') {
    return res.status(400).json({ message: 'Role must be customer or technician.' })
  }

  try {
    const existingUser = await User.findOne({ email: normalizedEmail })
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role,
    })

    return res.status(201).json({
      message: 'User registered successfully.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }

    console.error('User registration failed:', error.message)
    return res.status(500).json({ message: 'Registration failed. Please try again.' })
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}

  if (
    typeof email !== 'string' ||
    !email.trim() ||
    typeof password !== 'string' ||
    password.length === 0
  ) {
    return res.status(400).json({ message: 'Email and password are required.' })
  }

  if (!process.env.JWT_SECRET) {
    console.error('Login failed: JWT_SECRET is not configured.')
    return res.status(500).json({ message: 'Login is temporarily unavailable.' })
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password')
    const passwordMatches = user && await bcrypt.compare(password, user.password)

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' },
    )

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Login failed:', error.message)
    return res.status(500).json({ message: 'Login failed. Please try again.' })
  }
})

router.put('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}

  if (
    typeof currentPassword !== 'string' ||
    currentPassword.length === 0 ||
    typeof newPassword !== 'string' ||
    newPassword.length === 0
  ) {
    return res.status(400).json({ message: 'Current password and new password are required.' })
  }

  try {
    const user = await User.findById(req.user.userId).select('+password')
    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    const currentPasswordMatches = await bcrypt.compare(currentPassword, user.password)
    if (!currentPasswordMatches) {
      return res.status(400).json({ message: 'Current password is incorrect.' })
    }

    user.password = newPassword
    await user.save()

    return res.status(200).json({ message: 'Password changed successfully.' })
  } catch (error) {
    console.error('Password change failed:', error.message)
    return res.status(500).json({ message: 'Password change failed. Please try again.' })
  }
})

router.get('/me', authenticateToken, (req, res) => {
  const { userId, email, role } = req.user
  return res.status(200).json({ userId, email, role })
})

router.get('/customer-test', authenticateToken, requireRole('customer'), (req, res) => {
  return res.status(200).json({ message: 'Authorization successful.', role: req.user.role })
})

router.get('/technician-test', authenticateToken, requireRole('technician'), (req, res) => {
  return res.status(200).json({ message: 'Authorization successful.', role: req.user.role })
})

router.get('/admin-test', authenticateToken, requireRole('admin'), (req, res) => {
  return res.status(200).json({ message: 'Authorization successful.', role: req.user.role })
})

module.exports = router
