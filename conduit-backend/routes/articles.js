const express = require('express')
const router = express.Router()
const Article = require('../models/articles')
const User = require('../models/users')
const tagsModel = require('../models/tags')
const multer = require('multer')
const cloudinary = require('cloudinary').v2
const algoliasearch = require('algoliasearch')
const fs = require('fs')
const sanitizeHtml = require('sanitize-html')
require('../config/cloudinary')
require('../middlewares/algoliasync')
config = require('../config/algolia')
const algoliaClient = algoliasearch(config.applicationId, config.adminApiKey)
const algoliaIndex = algoliaClient.initIndex('articles')

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
    const { title, subtitle, content, tags } = req.body
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

    for (let tagName of tags) {
      tagName = tagName.toLowerCase().trim()
      let tag = await tagsModel.findOne({ name: tagName })
      if (!tag) {
        // If the tag doesn't exist yet, create it
        tag = new tagsModel({ name: tagName })
      }
      tag.articles.push(article._id)
      await tag.save()
      // Add the tag to the article's tags array
      article.tags.push(tag._id)
    }

    // Save the article again to save the tags
    await article.save()

    const articleOwner = await User.findById(userID)

    if (!articleOwner) {
      throw new Error('No user found with this ID')
    }

    articleOwner.articles.push(article._id)
    await articleOwner.save()

    res.json(article)
  } catch (error) {
    // console.log('body----------------', req.user.name)
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
    const allArticles = await Article.find()
      .populate('user')
      .populate('tags')
      .exec()

    res.json(allArticles)
  } catch (error) {
    console.error('Error fetching articles:', error)
    res.status(500).send('Error fetching articles')
  }
})
router.get('/comments/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id).populate({
      path: 'comments',
      populate: {
        path: 'commenter',
        model: 'users',
      },
    })
    res.json(article.comments)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: err.message })
  }
})

router.put('/editarticle/:id', async (req, res) => {
  try {
    let { title, subtitle, content, tags } = req.body
    const sanitizedContent = sanitizeHtml(content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'p', 'b']),
      allowedAttributes: {
        a: ['href'],
        img: ['src'],
      },
    })

    let article = await Article.findById(req.params.id)
    if (!article) {
      return res.status(404).send('No such article found')
    }

    article.title = title
    article.subtitle = subtitle
    article.content = sanitizedContent

    article.tags = []

    if (!Array.isArray(tags)) {
      tags = []
    }
    for (let tagName of tags) {
      tagName = tagName.toLowerCase().trim()
      let tag = await tagsModel.findOne({ name: tagName })

      if (!tag) {
        tag = new tagsModel({ name: tagName })
      }
      if (!tag.articles.includes(article._id)) {
        tag.articles.push(article._id)
        await tag.save()
      }
      if (!article.tags.includes(tag._id)) {
        article.tags.push(tag._id)
      }
    }

    await article.save()

    res.json(article)
  } catch (error) {
    console.error('Error updating article:', error)
    res.status(500).send('Error updating article')
  }
})

router.delete('/deletearticle/:id', async (req, res) => {
  try {
    console.log('Deleting article with id:', req.params.id)
    let article = await Article.findById(req.params.id)
    console.log('Found article:', article)

    if (!article) {
      return res.status(404).send('No such article found')
    }

    for (let tagId of article.tags) {
      let tag = await tagsModel.findById(tagId)
      if (tag) {
        tag.articles.pull(article._id) // Removes the article from the tag's article array
        await tag.save()
      }
    }

    const user = await User.findById(article.userID)
    if (user) {
      user.articles.pull(article._id) // Removes the article from the user's article array
      await user.save()
    }

    console.log('Deleting article...')
    await Article.findByIdAndDelete(req.params.id)

    res.json({ message: 'Article deleted successfully' })
  } catch (error) {
    console.error('Error deleting article:', error)
    res.status(500).send('Error deleting article')
  }
})

router.put('/bookmark/:articleId', async (req, res) => {
  try {
    const userId = req.user._id
    const articleId = req.params.articleId

    // Find the user and the article
    const user = await User.findById(userId)
    const article = await Article.findById(articleId)

    if (!user) {
      return res.status(404).send('User not found')
    }

    if (!article) {
      return res.status(404).send('Article not found')
    }

    // Add the article to the user's bookmarks if it's not already there
    if (!user.bookmarks.includes(articleId)) {
      user.bookmarks.push(articleId)
      await user.save()
    }

    res.json({ message: 'Article bookmarked successfully' })
  } catch (error) {
    console.error('Error bookmarking article:', error)
    res.status(500).send('Error bookmarking article')
  }
})

router.put('/unbookmark/:articleId', async (req, res) => {
  try {
    const userId = req.user._id
    const articleId = req.params.articleId

    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).send('User not found')
    }

    // Remove the article from the user's bookmarks
    const index = user.bookmarks.indexOf(articleId)
    if (index !== -1) {
      user.bookmarks.splice(index, 1)
      await user.save()
    }

    res.json({ message: 'Article unbookmarked successfully' })
  } catch (error) {
    console.error('Error unbookmarking article:', error)
    res.status(500).send('Error unbookmarking article')
  }
})

router.put('/like/:articleId', async (req, res) => {
  try {
    const articleId = req.params.articleId
    const userId = req.user._id // Replace with your method of getting user ID

    // Find the article
    const article = await Article.findById(articleId)

    if (!article) {
      return res.status(404).send('Article not found')
    }

    // Check if the user has already liked the article
    if (article.likedBy.includes(userId)) {
      return res.status(400).send('You have already liked this article')
    }

    // Increment the likes count and add the user to the likedBy array
    article.likes += 1
    article.likedBy.push(userId)
    await article.save()

    res.json({ message: 'Article liked successfully' })
  } catch (error) {
    console.error('Error liking article:', error)
    res.status(500).send('Error liking article')
  }
})

// Endpoint for unliking an article
router.put('/unlike/:articleId', async (req, res) => {
  try {
    const articleId = req.params.articleId
    const userId = req.user._id // Replace with your method of getting user ID

    // Find the article
    const article = await Article.findById(articleId)

    if (!article) {
      return res.status(404).send('Article not found')
    }

    // Check if the user has not yet liked the article
    if (!article.likedBy.includes(userId)) {
      return res.status(400).send('You have not liked this article yet')
    }

    // Decrement the likes count and remove the user from the likedBy array
    article.likes -= 1
    article.likedBy.pull(userId)
    await article.save()

    res.json({ message: 'Article unliked successfully' })
  } catch (error) {
    console.error('Error unliking article:', error)
    res.status(500).send('Error unliking article')
  }
})

router.get('/search', async (req, res) => {
  const searchTerm = req.query.q
  console.log(searchTerm)
  try {
    const { hits } = await algoliaIndex.search(searchTerm)
    res.json(hits)
  } catch (error) {
    console.error('Algolia search error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
