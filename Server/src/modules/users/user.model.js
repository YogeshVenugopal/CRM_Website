import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    passwordHash: {
      type: String,
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'Role is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    // OAuth fields
    oauth: {
      provider: { type: String, enum: ['local', 'google', 'github'], default: 'local' },
      providerId: { type: String, default: null },
    },
    // OTP fields (for future use)
    otp: {
      code: { type: String },
      expiresAt: { type: Date },
    },
    // Refresh token hash (stored server-side for revocation)
    refreshTokenHash: {
      type: String,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Virtual password setter — allows setting password as plain text
userSchema.virtual('password').set(function (password) {
  this._password = password;
  this.passwordHash = password;
});

// Index for faster lookups (email already indexed via unique: true)
userSchema.index({ role: 1 });

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  if (!this.passwordHash) return;

  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.refreshTokenHash;
  delete user.otp;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);

export default User;
