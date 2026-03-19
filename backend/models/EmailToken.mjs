import mongoose from 'mongoose';

const emailTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['email_verification', 'password_reset'],
      required: true
    },
    tokenHash: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    usedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

const EmailToken = mongoose.model('EmailToken', emailTokenSchema);

export default EmailToken;