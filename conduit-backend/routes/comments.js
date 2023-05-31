const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const passport = require('passport')
const User = require('../models/users')
const Comment = require('../models/comments')
const Article = require('../models/articles')
const isAuthenticated = require('./auth')

// POST a new comment
// POST a new comment
router.post(
  '/comments',
  isAuthenticated,
  [
    body('content')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Comment should not be empty.'),
    body('articleId')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Article ID should not be empty.'),
  ],
  async (req, res) => {
    // Validate request
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    try {
      // Create a new comment

      const comment = new Comment({
        commenter: req.user._id,
        content: req.body.content,
      })

      // Save the comment
      const savedComment = await comment.save()

      // Add the comment to the article
      const article = await Article.findById(req.body.articleId)
      if (!article) throw new Error('Article not found')
      article.comments.push(savedComment._id)
      await article.save()

      res.json(savedComment)
    } catch (err) {
      res.status(500).json({ message: err.message })
    }
  }
)

// GET all comments
// router.get('/articles/:id', async (req, res) => {
//   try {
//     const article = await Article.findById(req.params.id).populate('comments')
//     res.json(article)
//   } catch (err) {
//     res.status(500).json({ message: err.message })
//   }
// })

module.exports = router
