const express = require('express')
const app = express()
const session = require('express-session')
const passport = require('passport')
const sessionStore = require('./middlewares/redis.js')


const authRouter = require('./routes/auth')
const userRouter = require('./routes/users')
require('./config/db')
app.use(express.json())

app.use(
  session({
    secret: 'Jpty@1966Netid#9812',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { 
      secure: true ,
      sameSite:'none',
      httpOnly:true,
      maxAge:600000
    },
    proxy:true
  })
)

app.use(passport.initialize())
app.use(passport.session())
app.use('/auth', authRouter)
app.use('/users', userRouter)
app.listen(3000, () => {
  console.log('Server is running on port 3000')
})
