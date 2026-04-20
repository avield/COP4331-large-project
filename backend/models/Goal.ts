import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IGoal extends Document {
  projectId: Types.ObjectId
  title: string
  description?: string
  order: number
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const goalSchema = new Schema<IGoal>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

goalSchema.index({ projectId: 1, order: 1 })

export default mongoose.model<IGoal>('Goal', goalSchema)