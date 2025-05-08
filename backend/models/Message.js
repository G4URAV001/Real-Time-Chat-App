const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  text: {
    type: String,
    required: function() {
      // Text is required only if there are no attachments
      return this.attachments.length === 0;
    },
    trim: true,
    maxlength: 2000
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  },
  directRecipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'file'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    name: String,
    size: Number,
    mimetype: String
  }]
}, {
  timestamps: true
});

// A message must have either a room or a directRecipient, but not both
MessageSchema.pre('save', function(next) {
  const hasRoom = Boolean(this.room);
  const hasDirectRecipient = Boolean(this.directRecipient);
  
  if (hasRoom === hasDirectRecipient) {
    const error = new Error('Message must have either a room or a directRecipient, but not both');
    return next(error);
  }
  
  next();
});

// Create indexes for efficient queries
MessageSchema.index({ room: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, directRecipient: 1, createdAt: -1 });
MessageSchema.index({ directRecipient: 1, sender: 1, createdAt: -1 });

const Message = mongoose.model('Message', MessageSchema);

module.exports = Message;
