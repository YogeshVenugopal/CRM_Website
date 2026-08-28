import mongoose from 'mongoose';

const INVOICE_STATUSES = ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'];

const INVOICE_STATUS_TRANSITIONS = {
  draft: ['sent', 'cancelled'],
  sent: ['partially_paid', 'paid', 'overdue', 'cancelled'],
  partially_paid: ['paid', 'overdue', 'cancelled'],
  paid: [],
  overdue: ['partially_paid', 'paid'],
  cancelled: [],
};

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];

const invoiceLineItemSchema = new mongoose.Schema(
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

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      default: null,
    },
    quotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required'],
    },
    items: {
      type: [invoiceLineItemSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'At least one line item is required',
      },
    },
    // Server-calculated — never trust frontend
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
    amountDue: {
      type: Number,
      default: 0,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    balance: {
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
        values: INVOICE_STATUSES,
        message: 'Invalid invoice status: {VALUE}',
      },
      default: 'draft',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    issuedAt: {
      type: Date,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
invoiceSchema.index({ client: 1, status: 1 });
invoiceSchema.index({ project: 1, status: 1 });
invoiceSchema.index({ opportunity: 1 });
invoiceSchema.index({ quotation: 1 });
invoiceSchema.index({ createdBy: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ createdAt: -1 });

// Static constants
invoiceSchema.statics.INVOICE_STATUSES = INVOICE_STATUSES;
invoiceSchema.statics.INVOICE_STATUS_TRANSITIONS = INVOICE_STATUS_TRANSITIONS;
invoiceSchema.statics.CURRENCIES = CURRENCIES;

invoiceSchema.statics.isValidTransition = function (currentStatus, newStatus) {
  const allowed = INVOICE_STATUS_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(newStatus) : false;
};

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
