const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const passport = require('passport')
const User = require('../models/users')
const Comment = require('../models/comments')
const Article = require('../models/articles')
const isAuthenticated = require('./auth')

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
    body('parentCommentId')
      .trim()
      .optional({ checkFalsy: true })
      .isLength({ min: 1 })
      .withMessage('Parent Comment ID should not be empty if present.'),
  ],
  async (req, res) => {
    // console.log('POST /comments request received')

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      // console.log('Validation errors:', errors.array())
      return res.status(400).json({ errors: errors.array() })
    }

    try {
      // console.log('Creating new comment...')

      const comment = new Comment({
        commenter: req.user._id,
        content: req.body.content,
        parentComment: req.body.parentCommentId || null,
      })

      let savedComment = await comment.save()

      // console.log('Comment saved:', savedComment)

      const article = await Article.findById(req.body.articleId)
      if (!article) throw new Error('Article not found')

      // console.log('Found article:', article)

      article.comments.push(savedComment._id)
      await article.save()

      // console.log('Article saved with new comment:', article)

      // Check if parentCommentId is present in the request
      if (req.body.parentCommentId) {
        // Find the parent comment and update it
        const parentComment = await Comment.findById(req.body.parentCommentId)
        if (!parentComment) throw new Error('Parent comment not found')

        parentComment.replies.push(savedComment._id)
        await parentComment.save()

        // console.log('Parent comment updated with new reply:', parentComment)
      }

      // Populate the savedComment with commenter details
      savedComment = await Comment.populate(savedComment, { path: 'commenter' })

      res.json(savedComment)
    } catch (err) {
      console.error('Error:', err.message)
      res.status(500).json({ message: err.message })
    }
  }
)

router.put(
  '/comments/:commentId',
  isAuthenticated,
  [
    body('content')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Comment should not be empty.'),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    try {
      const comment = await Comment.findById(req.params.commentId)
      if (!comment) {
        return res.status(404).json({ message: 'Comment not found' })
      }

      if (comment.commenter.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized' })
      }

      comment.content = req.body.content
      const updatedComment = await comment.save()

      res.json(updatedComment)
    } catch (err) {
      console.error('Error:', err.message)
      res.status(500).json({ message: err.message })
    }
  }
)

router.delete('/comments/:commentId', isAuthenticated, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId)
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' })
    }

    if (comment.commenter.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    // If the comment has a parent comment, remove this comment's id from the parent's replies array
    if (comment.parentComment) {
      const parentComment = await Comment.findById(comment.parentComment)
      if (parentComment) {
        parentComment.replies = parentComment.replies.filter(
          replyId => replyId.toString() !== comment._id.toString()
        )
        await parentComment.save()
      }
    } else {
      // If the comment doesn't have a parent comment, it is a top-level comment.
      // In this case, remove the comment's id from the related article's comments array
      const articlesWithComment = await Article.find({ comments: comment._id })
      for (let article of articlesWithComment) {
        article.comments = article.comments.filter(
          commentId => commentId.toString() !== comment._id.toString()
        )
        await article.save()
      }
    }

    // If the comment has any replies, remove them as well
    for (let replyId of comment.replies) {
      await Comment.findByIdAndRemove(replyId)
    }

    // Remove the comment
    // await comment.remove()

    res.json({ message: 'Comment deleted' })
  } catch (err) {
    console.error('Error:', err.message)
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
