const express = require('express')
require('dotenv').config()
const app = express()
const session = require('express-session')
const passport = require('passport')
const sessionStore = require('./middlewares/redis.js')
const cors = require('cors')
const flash = require('connect-flash')
const paymentRouter = require('./middlewares/stripe.js')
const redirect = require('./middlewares/redirect.js')
const authRouter = require('./routes/auth')
const userRouter = require('./routes/users')
const articleRouter = require('./routes/articles.js')
require('./config/db')

app.use(
  cors({
    origin: 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

app.use(express.json())

app.use(
  session({
    secret: 'Jpty@1966Netid#9812',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Set to 'true' only in production
      sameSite: 'lax',
      httpOnly: true,
      maxAge: 600000,
    },
    proxy: true,
  })
)

app.use(passport.initialize())
app.use(passport.session())
app.use(flash())
app.use('/auth', authRouter)
app.use('/users', userRouter)
app.use('/membership', paymentRouter)
app.use('/articles', articleRouter)

app.listen(3000, () => {
  console.log('Server is running on port 3000')
})
