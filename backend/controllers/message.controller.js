const Message = require('../models/Message');
const Room = require('../models/Room');
const User = require('../models/User');

// Get messages for a room
exports.getRoomMessages = async (req, res) => {
  try {
    const roomId = req.params.roomId;
    const userId = req.user.id;
    const { limit = 50, before } = req.query;

    // Check if room exists and user is a member
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!room.members.includes(userId)) {
      return res.status(403).json({ message: 'You are not a member of this room' });
    }

    // Query messages
    let query = { room: roomId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('sender', 'username avatar')
      .lean();

    // Return messages in chronological order
    res.status(200).json({
      messages: messages.reverse(),
      hasMore: messages.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Get room messages error:', error);
    res.status(500).json({ message: 'Failed to get messages', error: error.message });
  }
};

// Send message to a room
exports.sendRoomMessage = async (req, res) => {
  try {
    const roomId = req.params.roomId;
    const userId = req.user.id;
    const { text, attachments } = req.body;

    // Check if room exists and user is a member
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!room.members.includes(userId)) {
      return res.status(403).json({ message: 'You are not a member of this room' });
    }

    // Create message
    const message = new Message({
      text,
      sender: userId,
      room: roomId,
      attachments: attachments || []
    });

    await message.save();

    // Update room's lastActivity
    room.lastActivity = Date.now();
    await room.save();

    // Populate sender info
    await message.populate('sender', 'username avatar');

    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Send room message error:', error);
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
};

// Send message with attachments to a room
exports.sendRoomMessageWithAttachments = async (req, res) => {
  try {
    const roomId = req.body.roomId;
    const userId = req.user.id;
    const { text = '' } = req.body;  
    const files = req.files;

    console.log(`Sending room message with ${files.length} attachments`);

    // Check if room exists and user is a member
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!room.members.includes(userId)) {
      return res.status(403).json({ message: 'You are not a member of this room' });
    }

    // Process attachments
    const attachments = files.map(file => {
      const isImage = file.mimetype.startsWith('image/');
      return {
        type: isImage ? 'image' : 'file',
        url: `/uploads/${file.filename}`,
        name: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      };
    });

    // Create message
    const message = new Message({
      text: text || ' ',  
      sender: userId,
      room: roomId,
      attachments
    });

    await message.save();

    // Update room's lastActivity
    room.lastActivity = Date.now();
    await room.save();

    // Populate sender info
    await message.populate('sender', 'username avatar');

    // Get the socket.io instance from the req object
    const io = req.app.get('io');
    if (io) {
      // Format the message for socket emission
      const formattedMessage = {
        _id: message._id,
        id: message._id,
        text: message.text,
        sender: {
          _id: message.sender._id,
          id: message.sender._id,
          username: message.sender.username,
          avatar: message.sender.avatar
        },
        senderId: message.sender._id,
        senderName: message.sender.username,
        senderAvatar: message.sender.avatar,
        room: message.room,
        roomId: message.room,
        createdAt: message.createdAt,
        timestamp: message.createdAt.getTime(),
        attachments: message.attachments || []
      };
      
      console.log(`Emitting room:message to room ${roomId} for message with attachments`);
      
      // Broadcast message to all room members
      io.to(`room:${roomId}`).emit('room:message', formattedMessage);
    } else {
      console.warn('Socket.io instance not available in request object');
    }

    res.status(201).json({
      message: 'Message with attachments sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Send room message with attachments error:', error);
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
};

// Get direct messages between two users
exports.getDirectMessages = async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const userId = req.user.id;
    const { limit = 50, before } = req.query;

    console.log(`Getting direct messages between ${userId} and ${otherUserId}`);

    // Check if other user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Query direct messages (both sent and received)
    let query = {
      $or: [
        { sender: userId, directRecipient: otherUserId },
        { sender: otherUserId, directRecipient: userId }
      ]
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('sender', 'username avatar')
      .lean();

    console.log(`Found ${messages.length} direct messages`);

    // Mark messages as read
    await Message.updateMany(
      { sender: otherUserId, directRecipient: userId, isRead: false },
      { isRead: true }
    );

    // Update user's last read timestamp for this conversation
    await User.findOneAndUpdate(
      { _id: userId, 'directConversations.userId': otherUserId },
      { 'directConversations.$.lastReadTimestamp': new Date() },
      { upsert: true }
    );

    // Return messages in chronological order
    res.status(200).json({
      messages: messages.reverse(),
      hasMore: messages.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Get direct messages error:', error);
    res.status(500).json({ message: 'Failed to get messages', error: error.message });
  }
};

// Send direct message to a user
exports.sendDirectMessage = async (req, res) => {
  try {
    const recipientId = req.params.userId;
    const senderId = req.user.id;
    const { text, attachments } = req.body;

    console.log(`Sending direct message from ${senderId} to ${recipientId}: ${text}`);

    // Check if recipient user exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Create message
    const message = new Message({
      text,
      sender: senderId,
      directRecipient: recipientId,
      attachments: attachments || []
    });

    await message.save();

    // Populate sender info
    await message.populate('sender', 'username avatar');

    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Send direct message error:', error);
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
};

// Send direct message with attachments
exports.sendDirectMessageWithAttachments = async (req, res) => {
  try {
    const recipientId = req.body.recipientId;
    const senderId = req.user.id;
    const { text = '' } = req.body;  
    const files = req.files;

    console.log(`Sending direct message with ${files.length} attachments from ${senderId} to ${recipientId}`);

    // Check if recipient user exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Process attachments
    const attachments = files.map(file => {
      const isImage = file.mimetype.startsWith('image/');
      return {
        type: isImage ? 'image' : 'file',
        url: `/uploads/${file.filename}`,
        name: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      };
    });

    // Create message
    const message = new Message({
      text: text || ' ',  
      sender: senderId,
      directRecipient: recipientId,
      attachments
    });

    await message.save();
    console.log(`Direct message with attachments saved with ID: ${message._id}`);

    // Ensure both users have this conversation in their directConversations list
    // For sender
    const senderHasConversation = await User.findOne({
      _id: senderId,
      'directConversations.userId': recipientId
    });
    
    if (!senderHasConversation) {
      await User.findByIdAndUpdate(senderId, {
        $push: {
          directConversations: {
            userId: recipientId,
            lastReadTimestamp: new Date()
          }
        }
      });
    }
    
    // For recipient
    const recipientHasConversation = await User.findOne({
      _id: recipientId,
      'directConversations.userId': senderId
    });
    
    if (!recipientHasConversation) {
      await User.findByIdAndUpdate(recipientId, {
        $push: {
          directConversations: {
            userId: senderId,
            lastReadTimestamp: new Date()
          }
        }
      });
    }

    // Populate sender info
    await message.populate('sender', 'username avatar');

    // Get the socket.io instance from the req object
    const io = req.app.get('io');
    if (io) {
      // Format the message for socket emission
      const formattedMessage = {
        _id: message._id,
        id: message._id,
        text: message.text,
        sender: {
          _id: message.sender._id,
          id: message.sender._id,
          username: message.sender.username,
          avatar: message.sender.avatar
        },
        senderId: message.sender._id,
        senderName: message.sender.username,
        senderAvatar: message.sender.avatar,
        directRecipient: message.directRecipient,
        recipientId: message.directRecipient,
        createdAt: message.createdAt,
        timestamp: message.createdAt.getTime(),
        attachments: message.attachments || []
      };
      
      console.log(`Emitting direct:message to sender and recipient for message with attachments`);
      
      // Send to sender's socket
      io.to(`user:${senderId}`).emit('direct:message', formattedMessage);
      
      // Send to recipient's socket
      io.to(`user:${recipientId}`).emit('direct:message', formattedMessage);
    } else {
      console.warn('Socket.io instance not available in request object');
    }

    res.status(201).json({
      message: 'Message with attachments sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Send direct message with attachments error:', error);
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
};

// Get all direct conversations
exports.getDirectConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get the user with populated directConversations
    const user = await User.findById(userId)
      .select('directConversations')
      .populate('directConversations.userId', 'username avatar status lastActive');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get last message for each conversation
    const conversations = await Promise.all(
      user.directConversations.map(async (conv) => {
        const lastMessage = await Message.findOne({
          $or: [
            { sender: userId, directRecipient: conv.userId._id },
            { sender: conv.userId._id, directRecipient: userId }
          ]
        })
        .sort({ createdAt: -1 })
        .select('text createdAt sender isRead')
        .populate('sender', 'username');
        
        // Count unread messages
        const unreadCount = await Message.countDocuments({
          sender: conv.userId._id,
          directRecipient: userId,
          isRead: false
        });
        
        return {
          user: conv.userId,
          lastMessage: lastMessage || null,
          unreadCount,
          lastReadTimestamp: conv.lastReadTimestamp
        };
      })
    );
    
    // Sort by last message time (newest first)
    conversations.sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
    });
    
    res.status(200).json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Failed to get conversations', error: error.message });
  }
};
