import mongoose from 'mongoose';

const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note', 'follow_up'];
const RELATED_RESOURCE_TYPES = ['Lead', 'Opportunity', 'Client', 'Project', 'Quotation'];

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, 'Activity type is required'],
      enum: {
        values: ACTIVITY_TYPES,
        message: 'Invalid activity type: {VALUE}',
      },
    },
    relatedTo: {
      type: {
        type: String,
        required: [true, 'Related resource type is required'],
        enum: {
          values: RELATED_RESOURCE_TYPES,
          message: 'Invalid related resource type: {VALUE}',
        },
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Related resource ID is required'],
        refPath: 'relatedTo.type',
      },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Activity owner is required'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Timeline query: activities for a resource, newest first
activitySchema.index({ 'relatedTo.type': 1, 'relatedTo.id': 1, createdAt: -1 });

// Follow-up queries: owner's open follow-ups
activitySchema.index({ owner: 1, dueDate: 1, completedAt: 1 });

// Owner-based queries
activitySchema.index({ owner: 1, createdAt: -1 });

// Type filter
activitySchema.index({ type: 1 });

// Compound index for follow-up due date queries
activitySchema.index({ type: 1, completedAt: 1, dueDate: 1 });

// Static constants
activitySchema.statics.ACTIVITY_TYPES = ACTIVITY_TYPES;
activitySchema.statics.RELATED_RESOURCE_TYPES = RELATED_RESOURCE_TYPES;

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;
