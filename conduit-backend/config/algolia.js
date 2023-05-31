const algoliasearch = require('algoliasearch')

const applicationId = '8APD5KW0T3'
const adminApiKey = '69ce15f8dece56ec6d671913fe5e15b2'
const algoliaClient = algoliasearch(applicationId, adminApiKey)
const algoliaIndex = algoliaClient.initIndex('articles')
module.exports = {
  applicationId,
  adminApiKey,
  algoliaIndex,
}
