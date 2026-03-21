import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    emailVerificationToken:{
      type: String,
      default: null
    },
    emailVerificationExpires:{
      type: Date,
      default: null
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    profile: {
      displayName: {
        type: String,
        required: true,
        trim: true
      },
      profilePictureUrl: {
        type: String,
        default: ''
      },
      aboutMe: {
        type: String,
        default: ''
      },
      preferredRoles: {
        type: [String],
        default: []
      },
      school: {
        type: String,
        default: ''
      }
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      default: 'active'
    }
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

export default User;