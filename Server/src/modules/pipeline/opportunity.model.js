import mongoose from 'mongoose';

const OPPORTUNITY_STAGES = ['prospecting', 'qualification', 'proposal', 'negotiation', 'won', 'lost'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];

/**
 * Allowed stage transitions:
 *   prospecting → qualification
 *   qualification → proposal
 *   proposal → negotiation, lost
 *   negotiation → won, lost
 *   won → (terminal)
 *   lost → (terminal)
 */
const STAGE_TRANSITIONS = {
  prospecting: ['qualification'],
  qualification: ['proposal'],
  proposal: ['negotiation', 'lost'],
  negotiation: ['won', 'lost'],
  won: [],
  lost: [],
};

const opportunitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Opportunity title is required'],
      trim: true,
      maxlength: 200,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    stage: {
      type: String,
      enum: {
        values: OPPORTUNITY_STAGES,
        message: 'Invalid stage: {VALUE}',
      },
      default: 'prospecting',
    },
    value: {
      type: Number,
      required: [true, 'Opportunity value is required'],
      min: [0, 'Value cannot be negative'],
    },
    currency: {
      type: String,
      enum: {
        values: CURRENCIES,
        message: 'Invalid currency: {VALUE}',
      },
      default: 'INR',
    },
    probability: {
      type: Number,
      min: [0, 'Probability cannot be less than 0'],
      max: [100, 'Probability cannot exceed 100'],
      default: 10,
    },
    expectedCloseDate: {
      type: Date,
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lostReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    wonAt: {
      type: Date,
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

// Text search on title
opportunitySchema.index({ title: 'text' });

// Compound indexes for common queries
opportunitySchema.index({ assignedTo: 1, stage: 1 });
opportunitySchema.index({ stage: 1, expectedCloseDate: 1 });
opportunitySchema.index({ createdBy: 1 });
opportunitySchema.index({ lead: 1 });
opportunitySchema.index({ client: 1 });

// Static constants
opportunitySchema.statics.OPPORTUNITY_STAGES = OPPORTUNITY_STAGES;
opportunitySchema.statics.STAGE_TRANSITIONS = STAGE_TRANSITIONS;
opportunitySchema.statics.CURRENCIES = CURRENCIES;

/**
 * Check if a stage transition is valid
 */
opportunitySchema.statics.isValidTransition = function (currentStage, newStage) {
  const allowed = STAGE_TRANSITIONS[currentStage];
  return allowed ? allowed.includes(newStage) : false;
};

const Opportunity = mongoose.model('Opportunity', opportunitySchema);

export default Opportunity;
