import mongoose from 'mongoose';

const NOTIFICATION_TYPES = [
  'lead_assigned',
  'follow_up_due',
  'quotation_status',
  'handover',
  'invoice_overdue',
  'task_assigned',
  'project_update',
  'payment_received',
  'general',
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required'],
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: {
        values: NOTIFICATION_TYPES,
        message: 'Invalid notification type: {VALUE}',
      },
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: 1000,
    },
    resourceType: {
      type: String,
      enum: ['Lead', 'Opportunity', 'Client', 'Project', 'Task', 'Invoice', 'Quotation', 'Payment', 'Activity'],
      default: null,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1 });
notificationSchema.index({ createdAt: -1 }); // For cleanup jobs

// Static constants
notificationSchema.statics.NOTIFICATION_TYPES = NOTIFICATION_TYPES;

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
