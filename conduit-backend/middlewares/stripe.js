const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Payment = require("../models/payments");
const User = require("../models/users");

router.post("/create-payment-intent", async (req, res) => {
  const { userId, userEmail } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 99, // 99 cents
      currency: "inr",
      metadata: { userId },
      receipt_email: userEmail,
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      message: "Payment intent created successfully.",
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating payment intent", error });
  }
});

router.post("/payment-webhook", async (req, res) => {
  const event = req.body;
  try {
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;

      // Update the user's role
      const user = await User.findById(paymentIntent.metadata.userId);
      user.role = 3;
      await user.save();

      // Create a new payment record
      const newPayment = new Payment({
        user: user._id,
        paymentMethod: "stripe",
        paymentStatus: "completed",
        paymentAmount: paymentIntent.amount / 100, // convert to dollars
        subscriptionId: paymentIntent.id,
      });
      await newPayment.save();
    }
    res.sendStatus(200);
  } catch (error) {
    res.status(500).json({ message: "Error handling payment webhook", error });
  }
});

module.exports = router;
