import mongoose, { Schema, type InferSchemaType, type HydratedDocument, type Model } from 'mongoose';

const projectChatMessageSchema = new Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    mentionedUserIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: []
    }
  },
  { timestamps: true }
);

projectChatMessageSchema.index({ projectId: 1, createdAt: -1 });

export type ProjectChatMessage = InferSchemaType<typeof projectChatMessageSchema>;
export type ProjectChatMessageDocument = HydratedDocument<ProjectChatMessage>;
export type ProjectChatMessageModel = Model<ProjectChatMessage>;

const ProjectChatMessage = mongoose.model<ProjectChatMessage>(
  'ProjectChatMessage',
  projectChatMessageSchema
);

export default ProjectChatMessage;
