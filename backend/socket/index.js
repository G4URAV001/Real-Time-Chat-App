const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');
const jwt = require('jsonwebtoken');

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'chitchat-secret';

// Setup socket.io handlers
exports.setupSocketHandlers = (io) => {
  // Authentication middleware for socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }
      
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Find user
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      // Update user status to online
      user.status = 'online';
      user.lastActive = Date.now();
      await user.save();
      
      // Attach user to socket
      socket.user = user;
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error: ' + error.message));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.user._id})`);
    
    // Join user to their personal room for private messages
    socket.join(`user:${socket.user._id}`);
    
    // Join all rooms the user is a member of
    const userRooms = await Room.find({ members: socket.user._id });
    userRooms.forEach(room => {
      socket.join(`room:${room._id}`);
    });
    
    // Broadcast user connection to all clients
    io.emit('user:status', {
      userId: socket.user._id,
      username: socket.user.username,
      status: 'online',
      lastActive: socket.user.lastActive
    });

    // Handle room messages
    socket.on('room:message', async (data) => {
      try {
        const { roomId, text, attachments, timestamp } = data;
        
        console.log(`Processing room message to ${roomId} from ${socket.user.username}`);
        
        // Check if room exists and user is a member
        const room = await Room.findById(roomId);
        if (!room || !room.members.includes(socket.user._id)) {
          console.error(`Room ${roomId} not found or user not a member`);
          socket.emit('error', { message: 'Cannot send message to this room' });
          return;
        }
        
        // Create message
        const message = new Message({
          text,
          sender: socket.user._id,
          room: roomId,
          attachments: attachments || [],
          createdAt: timestamp ? new Date(timestamp) : new Date()
        });
        
        await message.save();
        console.log(`Message saved with ID: ${message._id}`);
        
        // Update room's lastActivity
        room.lastActivity = Date.now();
        await room.save();
        
        // Populate sender info
        await message.populate('sender', 'username avatar');
        
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
        
        console.log(`Emitting room:message to room ${roomId}`);
        
        // Broadcast message to all room members
        io.to(`room:${roomId}`).emit('room:message', formattedMessage);
      } catch (error) {
        console.error('Room message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle direct messages
    socket.on('direct:message', async (data) => {
      try {
        const { recipientId, text, attachments, timestamp } = data;
        
        console.log(`Processing direct message to ${recipientId} from ${socket.user.username}`);
        
        // Check if recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
          console.error(`Recipient with ID ${recipientId} not found`);
          socket.emit('error', { message: 'Recipient not found' });
          return;
        }
        
        // Create message
        const message = new Message({
          text,
          sender: socket.user._id,
          directRecipient: recipientId,
          attachments: attachments || [],
          createdAt: timestamp ? new Date(timestamp) : new Date()
        });
        
        await message.save();
        console.log(`Message saved with ID: ${message._id}`);
        
        // Ensure both users have this conversation in their directConversations list
        // For sender
        const senderHasConversation = await User.findOne({
          _id: socket.user._id,
          'directConversations.userId': recipientId
        });
        
        if (!senderHasConversation) {
          await User.findByIdAndUpdate(socket.user._id, {
            $push: {
              directConversations: {
                userId: recipientId,
                lastReadTimestamp: new Date()
              }
            }
          });
          console.log(`Added conversation to sender's list`);
        }
        
        // For recipient
        const recipientHasConversation = await User.findOne({
          _id: recipientId,
          'directConversations.userId': socket.user._id
        });
        
        if (!recipientHasConversation) {
          await User.findByIdAndUpdate(recipientId, {
            $push: {
              directConversations: {
                userId: socket.user._id,
                lastReadTimestamp: new Date()
              }
            }
          });
          console.log(`Added conversation to recipient's list`);
        }
        
        // Populate sender info
        await message.populate('sender', 'username avatar');
        
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
        
        console.log(`Emitting direct:message to sender and recipient`);
        
        // Send to sender
        socket.emit('direct:message', formattedMessage);
        
        // Send to recipient
        io.to(`user:${recipientId}`).emit('direct:message', formattedMessage);
      } catch (error) {
        console.error('Direct message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle join room
    socket.on('room:join', async ({ roomId }) => {
      try {
        console.log(`User ${socket.user.username} joining room ${roomId}`);
        
        // Check if room exists
        const room = await Room.findById(roomId);
        if (!room) {
          console.error(`Room ${roomId} not found`);
          socket.emit('error', { message: 'Room not found' });
          return;
        }
        
        // Join the socket room
        socket.join(`room:${roomId}`);
        console.log(`User ${socket.user.username} joined socket room:${roomId}`);
        
        // If user is not a member, add them
        if (!room.members.includes(socket.user._id)) {
          room.members.push(socket.user._id);
          await room.save();
          console.log(`Added user ${socket.user.username} to room members`);
          
          // Notify other users in the room
          socket.to(`room:${roomId}`).emit('room:user-joined', {
            userId: socket.user._id,
            username: socket.user.username
          });
        }
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });
    
    // Handle leave room
    socket.on('room:leave', async ({ roomId }) => {
      try {
        console.log(`User ${socket.user.username} leaving room ${roomId}`);
        socket.leave(`room:${roomId}`);
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    });

    // Handle typing indicator for rooms
    socket.on('room:typing', ({ roomId, isTyping }) => {
      socket.to(`room:${roomId}`).emit('room:typing', {
        roomId,
        userId: socket.user._id,
        username: socket.user.username,
        isTyping
      });
    });

    // Handle typing indicator for direct messages
    socket.on('direct:typing', ({ recipientId, isTyping }) => {
      socket.to(`user:${recipientId}`).emit('direct:typing', {
        userId: socket.user._id,
        username: socket.user.username,
        isTyping
      });
    });

    // Handle mark direct messages as read
    socket.on('direct:mark-read', async ({ recipientId }) => {
      try {
        console.log(`User ${socket.user.username} marking messages from ${recipientId} as read`);
        
        // Find the conversation in the user's direct conversations
        const user = await User.findById(socket.user._id);
        if (!user) {
          console.error(`User ${socket.user._id} not found`);
          return;
        }
        
        // Update the conversation's lastReadTimestamp
        const conversationIndex = user.directConversations.findIndex(
          conv => conv.userId.toString() === recipientId
        );
        
        if (conversationIndex >= 0) {
          user.directConversations[conversationIndex].lastReadTimestamp = new Date();
          user.directConversations[conversationIndex].unreadCount = 0;
          await user.save();
          console.log(`Updated lastReadTimestamp for conversation with ${recipientId}`);
        } else {
          console.log(`No conversation found with ${recipientId}`);
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle user status update
    socket.on('user:updateStatus', async ({ status }) => {
      try {
        if (!['online', 'offline', 'away'].includes(status)) {
          socket.emit('error', { message: 'Invalid status value' });
          return;
        }
        
        // Update user status
        await User.findByIdAndUpdate(socket.user._id, {
          status,
          lastActive: Date.now()
        });
        
        // Broadcast status update to all clients
        io.emit('user:status', {
          userId: socket.user._id,
          status,
          lastActive: Date.now()
        });
      } catch (error) {
        console.error('Update status error:', error);
        socket.emit('error', { message: 'Failed to update status' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.username} (${socket.user._id})`);
      
      try {
        // Update user status to offline
        await User.findByIdAndUpdate(socket.user._id, {
          status: 'offline',
          lastActive: Date.now()
        });
        
        // Broadcast user disconnection to all clients
        io.emit('user:status', {
          userId: socket.user._id,
          status: 'offline',
          lastActive: Date.now()
        });
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    });
  });
};
