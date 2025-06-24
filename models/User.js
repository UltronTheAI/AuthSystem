const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    surname: {
        type: String,
        required: true,
        trim: true
    },
    profileImage: {
        type: String,
        default: null
    },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isTextVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  textVerificationCode: String,
  textVerificationCodeExpires: Date,
  textVerificationAttempts: {
    type: Number,
    default: 0
  },
  textVerificationLockedUntil: Date,
});

module.exports = mongoose.model('User', userSchema);