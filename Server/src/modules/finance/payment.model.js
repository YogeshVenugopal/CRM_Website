import mongoose from 'mongoose';

const PAYMENT_METHODS = ['bank_transfer', 'cash', 'card', 'upi', 'other'];

const paymentSchema = new mongoose.Schema(
  {
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: [true, 'Invoice is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Payment amount must be greater than 0'],
    },
    method: {
      type: String,
      enum: {
        values: PAYMENT_METHODS,
        message: 'Invalid payment method: {VALUE}',
      },
      required: [true, 'Payment method is required'],
    },
    transactionRef: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recorded by is required'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
paymentSchema.index({ invoice: 1 });
paymentSchema.index({ invoice: 1, createdAt: -1 });
paymentSchema.index({ recordedBy: 1 });
paymentSchema.index({ paidAt: -1 });

// Static constants
paymentSchema.statics.PAYMENT_METHODS = PAYMENT_METHODS;

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
