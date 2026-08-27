import mongoose from 'mongoose';

const LEAD_SOURCES = ['website', 'referral', 'cold_call', 'event', 'ads', 'other'];
const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'unqualified', 'converted'];

/**
 * Allowed status transitions:
 *   new → contacted
 *   contacted → qualified, unqualified
 *   qualified → converted
 *
 * Terminal states: converted, unqualified
 */
const STATUS_TRANSITIONS = {
  new: ['contacted'],
  contacted: ['qualified', 'unqualified'],
  qualified: ['converted'],
  unqualified: [],
  converted: [],
};

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true,
      maxlength: 200,
    },
    company: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    source: {
      type: String,
      enum: {
        values: LEAD_SOURCES,
        message: 'Invalid lead source: {VALUE}',
      },
      default: 'other',
    },
    status: {
      type: String,
      enum: {
        values: LEAD_STATUSES,
        message: 'Invalid lead status: {VALUE}',
      },
      default: 'new',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
    convertedToOpportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      default: null,
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

// Text search index on name and company
leadSchema.index({ name: 'text', company: 'text' });

// Compound index for assigned lead queries
leadSchema.index({ assignedTo: 1, status: 1 });

// Index for common filters
leadSchema.index({ status: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ createdBy: 1 });

// Expose status transition rules
leadSchema.statics.STATUS_TRANSITIONS = STATUS_TRANSITIONS;
leadSchema.statics.LEAD_STATUSES = LEAD_STATUSES;
leadSchema.statics.LEAD_SOURCES = LEAD_SOURCES;

/**
 * Check if a status transition is valid
 */
leadSchema.statics.isValidTransition = function (currentStatus, newStatus) {
  const allowed = STATUS_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(newStatus) : false;
};

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
