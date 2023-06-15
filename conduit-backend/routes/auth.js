const express = require('express')
const router = express.Router()
const passport = require('passport')
const bcrypt = require('bcrypt')
const sessionStore = require('../middlewares/redis')

const LocalStrategy = require('passport-local').Strategy
const User = require('../models/users')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const FacebookStrategy = require('passport-facebook').Strategy
const GOOGLE_CLIENT_ID =
  '241567909739-ov8hfpaestdkiogj4m6qjfsd9he4m0n8.apps.googleusercontent.com'
const GOOGLE_CLIENT_SECRET = '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'

//using local strategy(nothing fancy just password and email, validate users using email)
passport.use(
  new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email })
        if (!user) {
          return done(null, false, { message: 'User not found' })
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
          return done(null, false, { message: 'Invalid password' })
        }
        return done(null, user)
      } catch (error) {
        return done(error)
      }
    }
  )
)

router.post('/login', function (req, res, next) {
  passport.authenticate('local', function (err, user, info) {
    if (err) {
      return next(err)
    }
    if (!user) {
      return res.status(401).json({ message: info.message })
    }
    req.logIn(user, function (err) {
      if (err) {
        return next(err)
      }
      // console.log(req.session)
      return res.json({ message: 'Logged in successfully' })
    })
  })(req, res, next)
})

passport.serializeUser(function (user, done) {
  done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id)
    done(null, user)
  } catch (err) {
    done(err)
  }
})

router.post('/signup', async (req, res, next) => {
  const { email, password } = req.body

  try {
    // check if user already exists with email
    const userExists = await User.findOne({ email })

    if (userExists) {
      return res.status(400).json({ message: 'Email already in use' })
    }

    // create new user
    const newUser = new User({ email, password })

    await newUser.save()
    res.status(201).json({ message: 'User created successfully' })
  } catch (err) {
    // console.log(err)
    res.status(500).json({
      message:
        'Check email and password(password should be greater than 8 characters and have at least one symbol,number,capitalcase and lowercase letter)',
    })
  }
})

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
      passReqToCallback: true,
    },
    async function (req, accessToken, refreshToken, profile, cb) {
      const email = profile.emails[0].value
      const existingUser = await User.findOne({ email: email })
      // console.log('user session', req.session)
      if (existingUser) {
        existingUser.googleId = profile.id
        await existingUser.save()
        return cb(null, existingUser)
      } else {
        const newUser = new User({
          email: email,
          googleId: profile.id,
        })
        // console.log('new user:', newUser)
        await newUser.save()
        return cb(null, newUser)
      }
    }
  )
)

router.get(
  '/google',
  passport.authenticate('google', { scope: ['email', 'profile'] })
)

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    failureFlash: true,
  }),
  async function (req, res) {
    // console.log('google callback, req.user:', req.user)
    // console.log('google callback, req.session:', req.session)
    if (req.user) {
      req.flash('error', 'You are already logged in')
      req.session.save(() => {
        return res.redirect('https://conduit-backend-2.onrender.com/')
      })
    } else {
      req.session.save(() => {
        return res.redirect('https://conduit-backend-2.onrender.com/')
      })
    }
  }
)

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.status(401).json({ message: 'Unauthorized' })
}

router.post('/logout', isAuthenticated, (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err)
    }
    res.status(200).json({ message: 'Logged out successfully' })
  })
})

router.post('/changepassword', async (req, res) => {
  const { email, oldPassword, newPassword } = req.body

  try {
    // Find the user by email
    const user = await User.findOne({ email })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check if the user has a password
    if (user.password) {
      // For non-OAuth users, check if the old password is correct
      const isMatch = await bcrypt.compare(oldPassword, user.password)

      if (!isMatch) {
        return res.status(400).json({ error: 'Incorrect password' })
      }
    }

    // Update the user with the new password
    user.password = newPassword
    await user.save()

    res.json({ success: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Server error' })
  }
})

async function checkUserStatus(req, res, next) {
  // console.log('Session data in Redis:', req.sessionID)

  // console.log('req.session:', req.session)
  // console.log('req.isAuthenticated():', req.isAuthenticated())

  if (req.isAuthenticated()) {
    try {
      const user = await User.findById(req.session.passport.user)
      // console.log('user:', user)
      if (user) {
        res.locals.isLoggedIn = true
        res.locals.userRole = user.userRole
      } else {
        res.locals.isLoggedIn = false
      }
    } catch (err) {
      console.error('Error fetching user:', err)
      res.locals.isLoggedIn = false
    }
  } else {
    res.locals.isLoggedIn = false
  }
  // console.log('res.locals', res.locals)
  next()
}

router.get('/userstatus', checkUserStatus, (req, res) => {
  let response = {
    isLoggedIn: res.locals.isLoggedIn,
    userRole: res.locals.userRole,
  }

  if (res.locals.isLoggedIn) {
    response.UserId = req.session.passport.user
  }

  res.json(response)
  // console.log(res.locals)
})

module.exports = router
