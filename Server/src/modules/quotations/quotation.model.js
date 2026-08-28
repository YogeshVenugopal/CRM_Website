import mongoose from 'mongoose';

const QUOTATION_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];

/**
 * Allowed status transitions:
 *   draft → sent
 *   sent → accepted, rejected, expired
 *   accepted → (terminal, immutable)
 *   rejected → (terminal, immutable)
 *   expired → (terminal, immutable)
 */
const STATUS_TRANSITIONS = {
  draft: ['sent'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: [],
  rejected: [],
  expired: [],
};

const lineItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: [true, 'Item description is required'],
      trim: true,
      maxlength: 500,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.01, 'Quantity must be greater than 0'],
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
    taxPercent: {
      type: Number,
      required: [true, 'Tax percent is required'],
      min: [0, 'Tax percent cannot be negative'],
      max: [100, 'Tax percent cannot exceed 100'],
    },
  },
  { _id: false },
);

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    parentQuotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      default: null,
    },
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      required: [true, 'Opportunity is required'],
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required'],
    },
    items: {
      type: [lineItemSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'At least one line item is required',
      },
    },
    // Server-calculated monetary values — never trust frontend
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      enum: {
        values: CURRENCIES,
        message: 'Invalid currency: {VALUE}',
      },
      default: 'INR',
    },
    status: {
      type: String,
      enum: {
        values: QUOTATION_STATUSES,
        message: 'Invalid status: {VALUE}',
      },
      default: 'draft',
    },
    validUntil: {
      type: Date,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    termsAndConditions: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
quotationSchema.index({ opportunity: 1 });
quotationSchema.index({ client: 1 });
quotationSchema.index({ status: 1 });
quotationSchema.index({ createdBy: 1 });
quotationSchema.index({ opportunity: 1, status: 1 });
quotationSchema.index({ client: 1, status: 1 });
quotationSchema.index({ createdAt: -1 });
quotationSchema.index({ validUntil: 1 });

// Static constants
quotationSchema.statics.QUOTATION_STATUSES = QUOTATION_STATUSES;
quotationSchema.statics.STATUS_TRANSITIONS = STATUS_TRANSITIONS;
quotationSchema.statics.CURRENCIES = CURRENCIES;

quotationSchema.statics.isValidTransition = function (currentStatus, newStatus) {
  const allowed = STATUS_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(newStatus) : false;
};

const Quotation = mongoose.model('Quotation', quotationSchema);

export default Quotation;
