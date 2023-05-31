const mongoose = require('mongoose')

const followerSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
  },
  following: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
  },
})

const followersModel = mongoose.model('followers', followerSchema)
module.exports = followersModel
