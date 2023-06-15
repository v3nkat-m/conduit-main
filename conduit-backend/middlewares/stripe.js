const express = require('express')
const router = express.Router()
const stripe = require('stripe')(
  'sk_test_51N5aXjSJiG7glEVuSnEp9X35JcAy2iRTzCXAdGVhDnLkOgrlA1RYXAdNUpluYXPlmLL7oarTCgMcfViFavgU46L800vjsTLvVv'
)
const Payment = require('../models/payments')
const User = require('../models/users')

router.post('/create-checkout-session', async (req, res) => {
  const { userId, userEmail } = req.body
  // console.log('userId', userId)
  // console.log('req.body', req.body)

  try {
    // console.log(userId)
    const user = await User.findById(userId)
    // console.log('user stripe', user)
    if (!user) {
      // console.log('user not found:', user)
      return res.status(404).json({ message: 'User not found' })
    }
    if (user.userRole === 2) {
      return res
        .status(400)
        .json({ message: 'User already has a subscription' })
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: 'Conduit Plus Subscription',
            },
            unit_amount: 99, // amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'https://conduit-backend-2.onrender.com/write',
      cancel_url: 'https://conduit-backend-2.onrender.com/membership',
      metadata: {
        userId: userId,
        sessionId: session.id,
      },
    })
    // console.log('session=================', session)
    res.status(200).json({ sessionId: session.id })
  } catch (error) {
    res.status(500).json({ message: 'Error creating checkout session', error })
  }
})

router.post('/payment-webhook', async (req, res) => {
  const event = req.body
  // console.log('event\\\\\\\\\\\\\\\\', event)
  // console.log('event.type\\\\\\', event.type)
  // console.log('Metadata---------', event.data.object)

  try {
    if (event.type === 'checkout.session.completed') {
      const paymentIntent = event.data.object
      // console.log('payment.intent', paymentIntent)
      const sessionId = paymentIntent.metadata.sessionId

      const userId = paymentIntent.metadata.userId
      const user = await User.findById(userId)
      // console.log('user stripe', user)
      user.userRole = 2
      await user.save()

      // Create a new payment record
      const newPayment = new Payment({
        user: user._id,
        paymentMethod: 'stripe',
        paymentStatus: 'completed',
        paymentAmount: paymentIntent.amount,
        subscriptionId: paymentIntent.id,
      })
      await newPayment.save()

      res.sendStatus(200)
    } else {
      res.sendStatus(400)
    }
  } catch (error) {
    console.error('Error handling payment webhook:', error)
    res
      .status(500)
      .json({ message: 'Error handling payment webhook', error: error.message })
  }
})

module.exports = router
