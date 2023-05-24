const express = require('express')
const router = express.Router()
const Article = require('../models/articles')
const User = require('../models/users')
const multer = require('multer')
const cloudinary = require('cloudinary').v2
const fs = require('fs')
const sanitizeHtml = require('sanitize-html')
require('../config/cloudinary')

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') //
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  },
})

const upload = multer({ storage: storage })

router.post('/createarticle', async (req, res) => {
  try {
    const { title, subtitle, content } = req.body
    author = req.user.name
    userID = req.user._id
    // console.log(
    //   'req----------------------------------------------------------------------',
    //   req
    // )
    sanitizedContent = sanitizeHtml(content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'p', 'b']),
      allowedAttributes: {
        a: ['href'],
        img: ['src'],
      },
    })

    const article = new Article({
      title,
      subtitle,
      author,
      content: sanitizedContent,
      userID,
      user: userID,
    })

    await article.save()

    const articleOwner = await User.findById(userID)

    if (!articleOwner) {
      throw new Error('No user found with this ID')
    }

    articleOwner.articles.push(article._id)
    await articleOwner.save()

    res.json(article)
  } catch (error) {
    console.log('body----------------', req.user.name)
    console.error('Error creating article:', error)
    res.status(500).send('Error creating article')
  }
})

router.post('/uploadImage', upload.single('image'), async (req, res) => {
  try {
    // Upload file to cloudinary
    const result = await cloudinary.uploader.upload(req.file.path)

    // Update the article with the image URL
    const article = await Article.findById(req.body.articleId)
    if (!article) {
      return res.status(404).send('No such article found')
    }

    article.featuredImage = result.secure_url
    await article.save()

    // Remove the image file from local storage after upload
    fs.unlinkSync(req.file.path)

    res.json({
      message: 'Image uploaded successfully!',
      imageUrl: result.secure_url,
    })
  } catch (error) {
    console.log('Upload image error: ', error)
    res.status(500).send('Failed to upload image')
  }
})

router.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('articles').exec()
    res.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    res.status(500).json({ message: error.message })
  }
})

router.get('/article/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id)
    if (!article) {
      return res.status(404).json({ message: 'Article not found' })
    }
    res.json(article)
  } catch (error) {
    console.error('Error fetching article:', error)
    res.status(500).json({ message: error.message })
  }
})

router.get('/allarticles', async (req, res) => {
  try {
    const allArticles = await Article.find().populate('user').exec()
    res.json(allArticles)
    console.log(allArticles)
  } catch (error) {
    console.error('Error fetching articles:', error)
    res.status(500).send('Error fetching articles')
  }
})

module.exports = router
