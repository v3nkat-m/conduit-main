const mongoose = require('mongoose')

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  articles: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'articles',
    },
  ],
})

const tagsModel = mongoose.model('tags', tagSchema)

module.exports = tagsModel
