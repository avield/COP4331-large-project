import mongoose, { Schema, type InferSchemaType, type HydratedDocument, type Model } from 'mongoose';

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public'
    },
    dueDate: {
      type: Date,
      default: null
    },
    recruitingStatus: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open'
    },
    tags: {
      type: [String],
      default: []
    },
    lookingForRoles: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'archived'],
      default: 'active'
    },
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    settings: {
      allowSelfJoinRequests: {
        type: Boolean,
        default: true
      },
      requireApprovalToJoin: {
        type: Boolean,
        default: true
      }
    }
  },
  { timestamps: true }
);

projectSchema.index({ name: 'text', description: 'text', tags: 'text' });

export type ProjectVisibility = 'public' | 'private';
export type RecruitingStatus = 'open' | 'closed';
export type ProjectStatus = 'active' | 'completed' | 'archived';

export type Project = InferSchemaType<typeof projectSchema>;
export type ProjectDocument = HydratedDocument<Project>;
export type ProjectModel = Model<Project>;

const Project = mongoose.model<Project>('Project', projectSchema);

export default Project;