const path = require('node:path')
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true })

const mongoose = require('mongoose')
const User = require('./models/User')

const technicianEmail = 'qa.technician@ssms.com'

async function main() {
  let succeeded = false

  try {
    if (!process.env.QA_TECH_PASSWORD || !process.env.MONGO_URI) {
      throw new Error('Required environment configuration is missing.')
    }

    await mongoose.connect(process.env.MONGO_URI)

    const existingUser = await User.findOne({ email: technicianEmail }).select('role')
    if (existingUser && existingUser.role !== 'technician') {
      throw new Error('The requested email already belongs to a non-technician account.')
    }

    if (!existingUser) {
      await User.create({
        name: 'QA Technician',
        email: technicianEmail,
        password: process.env.QA_TECH_PASSWORD,
        role: 'technician',
      })
    }

    succeeded = true
  } catch {
    process.exitCode = 1
  } finally {
    try {
      await mongoose.disconnect()
    } catch {
      succeeded = false
      process.exitCode = 1
    }
    console.log(`${succeeded ? 'SUCCESS' : 'FAILURE'}: ${technicianEmail}`)
  }
}

main()
