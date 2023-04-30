const mongoose = require('mongoose')
const User = require('../models/users')

const paymentSchema = new mongoose.Schema({
  user:{
    type:mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required:true,
  },
  paymentDate :{
    type:Date,
    required:true,
    default:Date.now
  },
  paymentMethod:{
    type:String,
    required:true,
  },
  paymentStatus:{
    type:String,
    enum:['pending','completed','failed'],
    default:'pending',
  },
  paymentAmount:{
    type:Number,
    default:0.99,
  },
  subscriptionId:{
    type:String,
    required:true,
  }
})

const paymentsModel = mongoose.model('payments',paymentSchema)

module.exports = paymentsModel