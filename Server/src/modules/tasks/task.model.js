import mongoose from 'mongoose';

const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done'];
const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const TASK_STATUS_TRANSITIONS = {
  todo: ['in_progress', 'done'],
  in_progress: ['review', 'done', 'todo'],
  review: ['in_progress', 'done'],
  done: [],
};

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: TASK_STATUSES,
        message: 'Invalid task status: {VALUE}',
      },
      default: 'todo',
    },
    priority: {
      type: String,
      enum: {
        values: TASK_PRIORITIES,
        message: 'Invalid task priority: {VALUE}',
      },
      default: 'medium',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    dependsOn: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],
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

// Common query indexes
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignee: 1, status: 1 });
taskSchema.index({ project: 1, assignee: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ priority: 1 });

// Static constants
taskSchema.statics.TASK_STATUSES = TASK_STATUSES;
taskSchema.statics.TASK_PRIORITIES = TASK_PRIORITIES;
taskSchema.statics.TASK_STATUS_TRANSITIONS = TASK_STATUS_TRANSITIONS;

taskSchema.statics.isValidTransition = function (currentStatus, newStatus) {
  const allowed = TASK_STATUS_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(newStatus) : false;
};

const Task = mongoose.model('Task', taskSchema);

export default Task;
