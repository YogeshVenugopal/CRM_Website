import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      enum: ['admin', 'management', 'sales', 'project_manager', 'employee', 'finance'],
    },
    permissions: {
      type: [String],
      default: [],
      // Permissions follow "resource:action" pattern
      // e.g. "lead:create", "invoice:approve", "project:*"
    },
    isSystemRole: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  },
);

// Prevent deletion of system roles
roleSchema.pre('findOneAndDelete', async function () {
  const doc = await this.model.findOne(this.getFilter());
  if (doc && doc.isSystemRole) {
    throw new Error('Cannot delete system roles');
  }
});

roleSchema.pre('findByIdAndDelete', async function () {
  const doc = await this.model.findOne(this.getFilter());
  if (doc && doc.isSystemRole) {
    throw new Error('Cannot delete system roles');
  }
});

const Role = mongoose.model('Role', roleSchema);

export default Role;
