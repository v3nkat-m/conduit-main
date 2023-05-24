const redirectIfNotLoggedIn = (req, res, next) => {
  // Check if the user is logged in
  if (!req.session.user) {
    return res.redirect('/auth/signup')
  }

  next()
}

module.exports = redirectIfNotLoggedIn
