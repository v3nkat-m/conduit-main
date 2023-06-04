const express = require('express')
const router = express.Router()
const User = require('../models/users')
const multer = require('multer')
const cloudinary = require('cloudinary').v2
const fs = require('fs')
const { error } = require('console')
require('../config/cloudinary')
// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') //
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  },
})

const upload = multer({ storage: storage })

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.passport.user) {
    req.userId = req.session.passport.user
    return next()
  } else {
    return res.status(401).json({ message: 'Unauthorized' })
  }
}

router.get('/profile', isAuthenticated, async (req, res) => {
  const userId = req.userId // Access the authenticated user's ID from the request object
  try {
    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    return res.json(user)
  } catch (error) {
    console.error(error.message)
    return res.status(500).json({ message: 'Server error' })
  }
})

// Update the current user's profile
router.put(
  '/profile',
  isAuthenticated,
  upload.single('picture'),
  async (req, res) => {
    const userId = req.userId
    const { bio } = req.body
    const { name } = req.body
    let pictureUrl

    try {
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ message: 'User not found' })
      }

      if (req.file) {
        const uploadResult = await cloudinary.uploader.upload(req.file.path)
        pictureUrl = uploadResult.secure_url
      }

      // Update user profile fields
      user.picture = pictureUrl || user.picture
      user.bio = bio || user.bio
      user.name = name || user.name

      // Save the updated user profile
      const updatedUser = await user.save()

      // Remove the uploaded image file from the local storage
      if (req.file) {
        fs.unlinkSync(req.file.path)
      }

      return res.json(updatedUser)
    } catch (error) {
      console.error(error.message)
      return res.status(500).json({ message: 'Server error' })
    }
  }
)

// Get user profile using article ID
router.get(
  '/profile/by-article/:articleId',
  isAuthenticated,
  async (req, res) => {
    const { articleId } = req.params // Get the article's id from the parameters

    try {
      // Find the article
      const article = await article.findById(articleId)

      // If no article is found, return a 404 error
      if (!article) {
        return res.status(404).json({ message: 'Article not found' })
      }

      // Get the user ID from the article
      const userId = article.user

      // Find the user by their ID
      const user = await User.findById(userId)

      // If no user is found, return a 404 error
      if (!user) {
        return res.status(404).json({ message: 'User not found' })
      }

      // If the user is found, return the user data
      return res.json(user)
    } catch (error) {
      console.error(error.message)
      return res.status(500).json({ message: 'Server error' })
    }
  }
)

router.get('/profile/:userId', async (req, res) => {
  const { userId } = req.params // Get the user's id from the parameters

  try {
    // Find the user by their ID
    const user = await User.findById(userId)

    // If no user is found, return a 404 error
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // If the user is found, return the user data
    return res.json(user)
  } catch (error) {
    console.error(error.message)
    return res.status(500).json({ message: 'Server error' })
  }
})

router.post('/follow', async (req, res) => {
  const { followerId, followedId } = req.body

  if (!followerId || !followedId) {
    return res
      .status(400)
      .json({ message: 'Both followerId and followedId are required.' })
  }

  if (followerId === followedId) {
    return res.status(400).json({ message: "Users can't follow themselves." })
  }

  try {
    const follower = await User.findById(followerId)
    const followed = await User.findById(followedId)

    if (!follower || !followed) {
      return res.status(404).json({ message: 'User not found.' })
    }

    // Add followedId to the follower's following list
    if (!follower.followings.includes(followedId)) {
      follower.followings.push(followedId)
      await follower.save()
    }

    // Add followerId to the followed's followers list
    if (!followed.followers.includes(followerId)) {
      followed.followers.push(followerId)
      await followed.save()
    }

    return res.status(200).json({ message: 'Follow operation successful.' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Server error.' })
  }
})

router.post('/unfollow', async (req, res) => {
  const { followerId, followedId } = req.body
  // console.log(followerId, followedId)

  if (!followerId || !followedId) {
    return res
      .status(400)
      .json({ message: 'Both followerId and followedId are required.' })
  }

  if (followerId === followedId) {
    return res.status(400).json({ message: "Users can't unfollow themselves." })
  }

  try {
    const follower = await User.findById(followerId)
    const followed = await User.findById(followedId)
    // console.log('follower:', follower)
    // console.log('followed:', followed)

    if (!follower || !followed) {
      return res.status(404).json({ message: 'User not found.' })
    }

    // Remove followedId from the follower's following list
    if (follower.followings.map(id => id.toString()).includes(followedId)) {
      follower.followings = follower.followings.filter(
        id => id.toString() !== followedId
      )
      await follower.save()
    }
    // console.log('follower after removing followed:', follower)
    // Remove followerId from the followed's followers list
    if (followed.followers.map(id => id.toString()).includes(followerId)) {
      followed.followers = followed.followers.filter(
        id => id.toString() !== followerId
      )
      await followed.save()
    }
    // console.log('followed after removing follower:', followed)

    return res.status(200).json({ message: 'Unfollow operation successful.' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Server error.' })
  }
})

router.get('/:userId/bookmarks', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('bookmarks')

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json(user.bookmarks)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id/followers', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (user) {
      const followersCount = user.followers.length
      const followingsCount = user.followings.length

      res.json({ followersCount, followingsCount })
    } else {
      res.status(404).json({ message: 'User not found' })
    }
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// // Get list of followers for a user
// router.get('/:userId/followers', isAuthenticated, async (req, res) => {
//   try {
//     const { userId } = req.params
//     const user = await User.findById(userId)

//     if (!user) {
//       return res.status(404).json({ message: 'User not found' })
//     }

//     const followers = await User.find({ following: userId })
//     return res.json(followers)
//   } catch (error) {
//     console.error(error.message)
//     return res.status(500).json({ message: 'Server error' })
//   }
// })

// //get list of following for a profile
// router.get('/:userId/following', isAuthenticated, async (req, res) => {
//   try {
//     const user = await User.findById(req.params.userId)
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' })
//     }

//     const followingIds = user.following.map(userId => userId.toString())
//     const followingUsers = await User.find({ _id: { $in: followingIds } })

//     return res.json(followingUsers)
//   } catch (error) {
//     console.error(error.message)
//     return res.status(500).json({ message: 'Server error' })
//   }
// })

// //api for following
// router.post('/:userId/follow', isAuthenticated, async (req, res) => {
//   try {
//     const userIdToFollow = req.params.userId
//     const currentUser = req.session.user
//     const userToFollow = await User.findById(userIdToFollow)

//     if (!userToFollow) {
//       return res.status(404).json({ message: 'User not found' })
//     }

//     if (currentUser.following.includes(userIdToFollow)) {
//       return res
//         .status(400)
//         .json({ message: 'You are already following this user' })
//     }

//     currentUser.following.push(userIdToFollow)
//     await currentUser.save()

//     return res.json({ message: 'Successfully followed user' })
//   } catch (error) {
//     console.error(error.message)
//     return res.status(500).json({ message: 'Server error' })
//   }
// })

// // Unfollow a user
// router.delete('/:userId/follow', isAuthenticated, async (req, res) => {
//   const { userId } = req.params
//   const { user } = req.session

//   try {
//     // Find the user to unfollow
//     const userToUnfollow = await User.findById(userId)
//     if (!userToUnfollow) {
//       return res.status(404).json({ message: 'User not found' })
//     }}catch{
//       res.send(error)
//     })

//     // Remove the user from the list of followed users
//     user.following.pull(userToUnfollow._id)
//     await user.save()

//     // Remove the current user from the list of followers of the user to unfollow
//     userToUnfollow.followers.pull(user._id)
//     await userToUnfollow.save()

//     // Return the updated user object
//     return res.json(user)
//   } catch (error) {
//     console.error(error.message)
//     return res.status(500).json({ message: 'Server error' })
//   }
// })

// Update the current user's profile
module.exports = router
