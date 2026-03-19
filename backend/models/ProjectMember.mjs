import mongoose from 'mongoose';

const projectMemberSchema = new mongoose.Schema(
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

const ProjectMember = mongoose.model('ProjectMember', projectMemberSchema);

export default ProjectMember;