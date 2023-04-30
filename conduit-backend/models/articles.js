const mongoose = require('mongoose')
const Comment = require('../models/comments')

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    required: true,
  },
  bodyUrl: {
    type: String,
    required: true,
  },
  tags: {
    type: [String],
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
    index: true,
  },
  featuredImage: {
    type: String,
    required: false,
  },
  likes: {
    type: Number,
    default: 0,
  },
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
    },
  ],
})

const articlesModel = mongoose.model('articles', articleSchema)

module.exports = articlesModel
