import mongoose, { Schema, type InferSchemaType, type HydratedDocument, type Model } from 'mongoose';

const projectMemberSchema = new Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      default: 'Member'
    },
    permissions: {
      canEditProject: { type: Boolean, default: false },
      canManageMembers: { type: Boolean, default: false },
      canCreateTasks: { type: Boolean, default: true },
      canAssignTasks: { type: Boolean, default: false },
      canCompleteAnyTask: { type: Boolean, default: false },
      canModerateChat: { type: Boolean, default: false }
    },
    membershipStatus: {
      type: String,
      enum: ['active', 'pending', 'removed'],
      default: 'active'
    },
    joinedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

projectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });

export type MembershipStatus = 'active' | 'pending' | 'removed';

export type ProjectMember = InferSchemaType<typeof projectMemberSchema>;
export type ProjectMemberDocument = HydratedDocument<ProjectMember>;
export type ProjectMemberModel = Model<ProjectMember>;

const ProjectMember = mongoose.model<ProjectMember>('ProjectMember', projectMemberSchema);

export default ProjectMember;