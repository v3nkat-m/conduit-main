const algoliasearch = require('algoliasearch')
const ArticleModel = require('../models/articles')
require('dotenv').config()

const TagModel = require('../models/tags')
const UserModel = require('../models/users')
const config = require('../config/algolia')

const algoliaClient = algoliasearch(config.applicationId, config.adminApiKey)
const algoliaIndex = algoliaClient.initIndex('articles')

async function syncDataWithAlgolia() {
  try {
    const articles = await ArticleModel.find({})
      .populate('tags')
      .populate('user') // Populate the tags and user fields to resolve the references
      .exec()

    const objectsToIndex = articles.map(article => {
      const tagNames = article.tags.map(tag => tag.name) // Extract tag names from the populated tags field
      const userName = article.user.name
      const userPicture = article.user.picture
      const userID = article.user._id
      const date = article.user.date

      return {
        objectID: article._id.toString(),
        title: article.title,
        subtitle: article.subtitle,
        tags: tagNames,
        name: userName,
        picture: userPicture,
        userID: userID,
        date: date, // Use tag names instead of references
      }
    })

    await algoliaIndex.saveObjects(objectsToIndex)
    console.log('MongoDB data synchronized with Algolia')
  } catch (error) {
    console.error('Error synchronizing MongoDB data with Algolia:', error)
  }
}

module.exports = syncDataWithAlgolia
