const mongoose = require('mongoose');
const crypto = require('crypto');

const RoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  inviteCode: {
    type: String,
    unique: true,
    sparse: true // Only enforce uniqueness if field exists
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate new invite code for private rooms
RoomSchema.methods.generateInviteCode = function() {
  this.inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  return this.inviteCode;
};

// Middleware to auto-generate invite code for private rooms
RoomSchema.pre('save', function(next) {
  if (this.isPrivate && !this.inviteCode) {
    this.generateInviteCode();
  } else if (!this.isPrivate && this.inviteCode) {
    this.inviteCode = undefined;
  }
  
  // Make sure creator is also a member
  if (this.createdBy && !this.members.includes(this.createdBy)) {
    this.members.push(this.createdBy);
  }
  
  next();
});

const Room = mongoose.model('Room', RoomSchema);

module.exports = Room;
