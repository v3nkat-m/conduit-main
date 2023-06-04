const algoliasearch = require('algoliasearch')
require('dotenv').config()

const applicationId = process.env.APP_ID
const adminApiKey = process.env.ALGOLIA_ADMIN
const algoliaClient = algoliasearch(applicationId, adminApiKey)
const algoliaIndex = algoliaClient.initIndex('articles')
module.exports = {
  applicationId,
  adminApiKey,
  algoliaIndex,
}
