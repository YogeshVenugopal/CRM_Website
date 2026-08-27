import mongoose from 'mongoose';

const CLIENT_STATUSES = ['active', 'inactive'];

const clientSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: 200,
    },
    primaryContact: {
      name: {
        type: String,
        required: [true, 'Primary contact name is required'],
        trim: true,
        maxlength: 100,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
      },
      phone: {
        type: String,
        trim: true,
        default: null,
      },
    },
    billingAddress: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    accountOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: CLIENT_STATUSES,
        message: 'Invalid client status: {VALUE}',
      },
      default: 'active',
    },
    convertedFromLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
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

// Text search on companyName
clientSchema.index({ companyName: 'text' });

// Ownership and status queries
clientSchema.index({ accountOwner: 1 });
clientSchema.index({ status: 1 });
clientSchema.index({ accountOwner: 1, status: 1 });
clientSchema.index({ createdBy: 1 });

// Static constants
clientSchema.statics.CLIENT_STATUSES = CLIENT_STATUSES;

const Client = mongoose.model('Client', clientSchema);

export default Client;
