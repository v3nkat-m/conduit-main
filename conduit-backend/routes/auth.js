const express = require('express')
const router = express.Router()
const passport = require('passport')
const bcrypt = require('bcrypt')
const session = require('express-session')
const LocalStrategy = require('passport-local').Strategy
const User = require('../models/users')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const FacebookStrategy = require('passport-facebook').Strategy
const GOOGLE_CLIENT_ID =
  '241567909739 - ov8hfpaestdkiogj4m6qjfsd9he4m0n8.apps.googleusercontent.com'

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
      console.log(req.session)
      return res.json({ message: 'Logged in successfully' })
    })
  })(req, res, next)
})

passport.serializeUser(function (user, done) {
  done(null, user.id)
})

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user)
  })
})

router.get('/login', function (req, res) {
  res.send('Please use a POST request to login.')
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
    console.log(err)
    res.status(500).json({ message: 'Server error' })
  }
})

//just using some
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/callback',
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user)
      })
    }
  )
)

router.get('/google', passport.authenticate('google', { scope: ['profile'] }))

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    failureFlash: true,
  }),
  function (req, res) {
    // If you are already logged in why are you logging again man?
    if (req.user) {
      req.flash('error', 'You are already logged in')
      return res.redirect('/dashboard')
    }

    // Use passport.authenticate middleware again to retrieve the user object
    passport.authenticate('google', { session: false }, async (err, user) => {
      if (err) {
        console.log(err)
        return res.redirect('/login')
      }

      if (user) {
        try {
          // Check if the user already exists in the database
          const existingUser = await User.findOne({
            email: user.emails[0].value,
          })

          if (existingUser) {
            console.log(`existing user :${user}`)
            // Updating googleId field, if they had already logged in using normal login method
            existingUser.googleId = user.id
            await existingUser.save()
            req.logIn(existingUser, function (err) {
              if (err) {
                console.log(err)
                return res.redirect('/login')
              }
              return res.redirect('/dashboard')
            })
          } else {
            // Creating new user because they are new. Welcome to conduit mf
            console.log(user)
            const newUser = new User({
              email: user.emails[0].value,
              googleId: user.id,
            })
            await newUser.save()
            req.logIn(newUser, function (err) {
              if (err) {
                console.log(err)
                return res.redirect('/login')
              }
              return res.redirect('/dashboard')
            })
          }
        } catch (error) {
          console.log(error)
          return res.redirect('/login')
        }
      } else {
        return res.redirect('/login')
      }
    })(req, res)
  }
)

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.status(401).json({ message: 'Unauthorized' })
}

router.post('/logout', isAuthenticated, (req, res) => {
  req.logout()
  res.status(200).json({ message: 'Logged out successfully' })
})

module.exports = router
