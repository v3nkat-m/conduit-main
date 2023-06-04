const mongoose = require('mongoose')
require('dotenv').config()

const url = `mongodb+srv://venka7m:Netid9812@cluster0.olsqbpb.mongodb.net/conduit?retryWrites=true&w=majority`

const connectionParams = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}

mongoose
  .connect(url, connectionParams)
  .then(() => {
    console.log('Connected to the database ')
  })
  .catch(err => {
    console.error(`Error connecting to the database. n${err}`)
  })
