const mongoose = require('mongoose')
const User = require('../models/users')

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  message: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  read: {
    type: Boolean,
    default: false,
  },
  link: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['system', 'admin'],
  },
})

const notificationsModel = mongoose.model('notifications', notificationSchema)

module.exports = notificationsModel
