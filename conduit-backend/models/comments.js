const mongoose = require('mongoose')
const { Schema } = mongoose
const User = require('../models/users')

const commentSchema = new mongoose.Schema({
  commenter: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  publicationDate: {
    type: Date,
    default: Date.now,
  },
})

const commentsModel = mongoose.model('comments', commentSchema)

module.exports = commentsModel
