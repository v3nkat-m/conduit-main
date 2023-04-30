const express = require('express')
const router = express.Router()
const usersController = require('../controller/users')
const User = require('../models/users')

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    // Checking if there is a user session
    return next() // If the user is authenticated, continue with the request
  } else {
    return res.status(401).json({ message: 'Unauthorized' }) // If the user is not authenticated, send an error response
  }
}


// Get a user by ID
router.get('/:userId', isAuthenticated, async (req, res) => { 
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(user);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Server error' });
  }
});


// Update a user by ID
router.put('/:userId', async (req, res) => {
  const { userId } = req.params;
  const { name, email, password } = req.body;

  try {
    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.password = password || user.password;

    user = await user.save();
    return res.json(user);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get list of followers for a user
router.get('/:userId/followers', isAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const followers = await User.find({ following: userId });
    return res.json(followers);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

//get list of following for a profile
router.get('/:userId/following', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const followingIds = user.following.map((userId) => userId.toString())
    const followingUsers = await User.find({ _id: { $in: followingIds } })

    return res.json(followingUsers)
  } catch (error) {
    console.error(error.message)
    return res.status(500).json({ message: 'Server error' })
  }
})

//api for following
router.post('/:userId/follow', isAuthenticated, async (req, res) => {
  try {
    const userIdToFollow = req.params.userId
    const currentUser = req.session.user
    const userToFollow = await User.findById(userIdToFollow)

    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (currentUser.following.includes(userIdToFollow)) {
      return res
        .status(400)
        .json({ message: 'You are already following this user' })
    }

    currentUser.following.push(userIdToFollow)
    await currentUser.save()

    return res.json({ message: 'Successfully followed user' })
  } catch (error) {
    console.error(error.message)
    return res.status(500).json({ message: 'Server error' })
  }
})

// Unfollow a user
router.delete('/:userId/follow', isAuthenticated, async (req, res) => {
  const { userId } = req.params;
  const { user } = req.session;
  
  try {
    // Find the user to unfollow
    const userToUnfollow = await User.findById(userId);
    if (!userToUnfollow) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove the user from the list of followed users
    user.following.pull(userToUnfollow._id);
    await user.save();

    // Remove the current user from the list of followers of the user to unfollow
    userToUnfollow.followers.pull(user._id);
    await userToUnfollow.save();

    // Return the updated user object
    return res.json(user);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
