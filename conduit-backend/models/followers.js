const mongoose = require('mongoose')
const User = require('../models/users')

const followerSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  following: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
})

const followersModel = mongoose.model('followers', followerSchema)
module.exports = followersModel