const express = require('express')
const router = express.Router()
const tagsModel = require('../models/tags')

router.get('/tags', async (req, res) => {
  try {
    const tags = await tagsModel.find().select('_id name')
    res.json(tags)
  } catch (error) {
    console.error('Error fetching tags:', error)
    res.status(500).send('Error fetching tags')
  }
})

module.exports = router
