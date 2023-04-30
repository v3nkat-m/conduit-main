const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const UserRoles = Object.freeze({
  RegularUser: 0,
  AdminUser: 1,
  PaidUser: 2,
})
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: false,
      maxlength: 32,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: { unique: true },
      match: /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/,
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
      maxlength: 20,
      validate(value) {
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[\W_])/.test(value)) {
          throw new Error(
            'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
          )
        }
      },
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    image: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    userRole: {
      type: Number,
      required: true,
      enum: [UserRoles.RegularUser, UserRoles.AdminUser, UserRoles.PaidUser],
      default: UserRoles.RegularUser,
    },
    googleId: {
      type: String,
      default: null,
    },
    history: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

userSchema.pre('save', async function (next) {
  try {
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(this.password, salt)
    this.password = hashedPassword
    next()
  } catch (err) {
    next(err)
  }
})

userSchema.methods.validPassword = async function (password) {
  try {
    return await bcrypt.compare(password, this.password)
  } catch (err) {
    throw new Error(err)
  }
}

const userModel = mongoose.model('users', userSchema)
module.exports = userModel
