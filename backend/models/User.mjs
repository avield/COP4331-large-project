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
        passwordResetToken: {
            type: String,
            default: null
        },

        passwordResetExpires: {
            type: Date,
            default: null
        },
        emailVerificationToken: {
            type: String,
            default: null
        },
        emailVerificationExpires: {
            type: Date,
            default: null
        },
        isEmailVerified: {
            type: Boolean,
            default: false
        },
        refreshTokenHash: {
            type: String,
            default: null
        },
        refreshTokenExpires: {
            type: Date,
            default: null
        },
        tokenVersion: {
            type: Number,
            default: 0
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
            enum: ['created', 'active', 'suspended', 'deleted'],
            default: 'created'
        }
    },
    {timestamps: true} // createdAt, updatedAt
);

const User = mongoose.model('User', userSchema);

export default User;