import mongoose from 'mongoose';

const PROJECT_STATUSES = ['planned', 'in_progress', 'on_hold', 'completed', 'cancelled'];

const PROJECT_STATUS_TRANSITIONS = {
  planned: ['in_progress', 'cancelled'],
  in_progress: ['on_hold', 'completed', 'cancelled'],
  on_hold: ['in_progress', 'cancelled'],
  completed: [],
  cancelled: [],
};

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    sourceOpportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      default: null,
    },
    sourceQuotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      default: null,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    team: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: {
        values: PROJECT_STATUSES,
        message: 'Invalid project status: {VALUE}',
      },
      default: 'planned',
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    budget: {
      type: Number,
      min: [0, 'Budget cannot be negative'],
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required'],
    },
  },
  {
    timestamps: true,
  },
);

// Text search on name
projectSchema.index({ name: 'text' });

// Common query indexes
projectSchema.index({ client: 1 });
projectSchema.index({ manager: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ createdBy: 1 });
projectSchema.index({ manager: 1, status: 1 });
projectSchema.index({ client: 1, status: 1 });
projectSchema.index({ sourceOpportunity: 1 });
projectSchema.index({ sourceQuotation: 1 });

// Static constants
projectSchema.statics.PROJECT_STATUSES = PROJECT_STATUSES;
projectSchema.statics.PROJECT_STATUS_TRANSITIONS = PROJECT_STATUS_TRANSITIONS;

projectSchema.statics.isValidTransition = function (currentStatus, newStatus) {
  const allowed = PROJECT_STATUS_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(newStatus) : false;
};

const Project = mongoose.model('Project', projectSchema);

export default Project;
