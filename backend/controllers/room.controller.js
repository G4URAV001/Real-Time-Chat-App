const Room = require('../models/Room');
const User = require('../models/User');
const Message = require('../models/Message');

// Get all rooms
exports.getAllRooms = async (req, res) => {
  try {
    // Only get public rooms
    const query = { isPrivate: false };
    
    // If user is authenticated, exclude rooms they're already a member of
    if (req.user) {
      query.members = { $ne: req.user.id };
    }
    
    const rooms = await Room.find(query)
    .select('name description createdBy isPrivate members lastActivity')
    .populate('createdBy', 'username avatar')
    .sort({ lastActivity: -1 });

    res.status(200).json({ rooms });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ message: 'Failed to get rooms', error: error.message });
  }
};

// Get rooms user is a member of
exports.getUserRooms = async (req, res) => {
  try {
    const rooms = await Room.find({
      members: req.user.id
    })
    .select('name description createdBy isPrivate inviteCode members lastActivity')
    .populate('createdBy', 'username avatar')
    .sort({ lastActivity: -1 });

    res.status(200).json({ rooms });
  } catch (error) {
    console.error('Get user rooms error:', error);
    res.status(500).json({ message: 'Failed to get user rooms', error: error.message });
  }
};

// Create a new room
exports.createRoom = async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    const userId = req.user.id;

    // Check if room name already exists
    const existingRoom = await Room.findOne({ name });
    if (existingRoom) {
      return res.status(400).json({ message: 'A room with this name already exists' });
    }

    // Create new room
    const room = new Room({
      name,
      description,
      isPrivate: Boolean(isPrivate),
      createdBy: userId,
      members: [userId]
    });

    await room.save();

    // Add room to user's rooms
    await User.findByIdAndUpdate(userId, {
      $push: { rooms: room._id }
    });

    // Populate creator info
    await room.populate('createdBy', 'username avatar');

    res.status(201).json({
      message: 'Room created successfully',
      room
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ message: 'Failed to create room', error: error.message });
  }
};

// Get room by ID
exports.getRoomById = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id;

    const room = await Room.findById(roomId)
      .populate('createdBy', 'username avatar')
      .populate('members', 'username avatar status lastActive');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is a member of the room
    if (!room.members.some(member => member._id.toString() === userId)) {
      return res.status(403).json({ message: 'You are not a member of this room' });
    }

    res.status(200).json({ room });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ message: 'Failed to get room', error: error.message });
  }
};

// Update room
exports.updateRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id;
    const { name, description } = req.body;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is the creator of the room
    if (room.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Only the room creator can update room details' });
    }

    // Check if room name already exists (if changing name)
    if (name && name !== room.name) {
      const existingRoom = await Room.findOne({ name, _id: { $ne: roomId } });
      if (existingRoom) {
        return res.status(400).json({ message: 'A room with this name already exists' });
      }
    }

    // Update room
    if (name) room.name = name;
    if (description !== undefined) room.description = description;
    room.lastActivity = Date.now();

    await room.save();

    // Populate creator and members
    await room.populate('createdBy', 'username avatar');
    await room.populate('members', 'username avatar status lastActive');

    res.status(200).json({
      message: 'Room updated successfully',
      room
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ message: 'Failed to update room', error: error.message });
  }
};

// Join room by invite code
exports.joinRoomByInviteCode = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user.id;

    // Find room by invite code
    const room = await Room.findOne({ inviteCode });
    if (!room) {
      return res.status(404).json({ message: 'Invalid invite code or room not found' });
    }

    // Check if user is already a member
    if (room.members.includes(userId)) {
      return res.status(400).json({ message: 'You are already a member of this room' });
    }

    // Add user to room members
    room.members.push(userId);
    room.lastActivity = Date.now();
    await room.save();

    // Add room to user's rooms
    await User.findByIdAndUpdate(userId, {
      $push: { rooms: room._id }
    });

    // Populate creator and members
    await room.populate('createdBy', 'username avatar');
    await room.populate('members', 'username avatar status lastActive');

    res.status(200).json({
      message: 'Successfully joined room',
      room
    });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ message: 'Failed to join room', error: error.message });
  }
};

// Generate new invite code
exports.generateNewInviteCode = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is the creator of the room
    if (room.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Only the room creator can generate new invite codes' });
    }

    // Check if room is private
    if (!room.isPrivate) {
      return res.status(400).json({ message: 'Cannot generate invite code for public rooms' });
    }

    // Generate new invite code
    const newInviteCode = room.generateInviteCode();
    await room.save();

    res.status(200).json({
      message: 'New invite code generated',
      inviteCode: newInviteCode
    });
  } catch (error) {
    console.error('Generate invite code error:', error);
    res.status(500).json({ message: 'Failed to generate invite code', error: error.message });
  }
};

// Leave room
exports.leaveRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is a member of the room
    if (!room.members.includes(userId)) {
      return res.status(400).json({ message: 'You are not a member of this room' });
    }

    // Check if user is the creator
    if (room.createdBy.toString() === userId) {
      return res.status(400).json({ message: 'Room creator cannot leave the room (delete it instead)' });
    }

    // Remove user from room members
    room.members = room.members.filter(member => member.toString() !== userId);
    await room.save();

    // Remove room from user's rooms
    await User.findByIdAndUpdate(userId, {
      $pull: { rooms: roomId }
    });

    res.status(200).json({
      message: 'Successfully left room'
    });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ message: 'Failed to leave room', error: error.message });
  }
};

// Delete room
exports.deleteRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is the creator of the room
    if (room.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Only the room creator can delete the room' });
    }

    // Delete all messages in the room
    await Message.deleteMany({ room: roomId });

    // Remove room from all members' rooms array
    await User.updateMany(
      { rooms: roomId },
      { $pull: { rooms: roomId } }
    );

    // Delete the room
    await Room.findByIdAndDelete(roomId);

    res.status(200).json({
      message: 'Room deleted successfully'
    });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ message: 'Failed to delete room', error: error.message });
  }
};

// Remove member from room
exports.removeMember = async (req, res) => {
  try {
    const roomId = req.params.id;
    const memberId = req.params.memberId;
    const userId = req.user.id;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is the creator of the room
    if (room.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Only the room creator can remove members' });
    }

    // Check if member is in the room
    if (!room.members.includes(memberId)) {
      return res.status(400).json({ message: 'User is not a member of this room' });
    }

    // Cannot remove the creator
    if (memberId === room.createdBy.toString()) {
      return res.status(400).json({ message: 'Cannot remove the room creator' });
    }

    // Remove member from room
    room.members = room.members.filter(member => member.toString() !== memberId);
    await room.save();

    // Remove room from member's rooms
    await User.findByIdAndUpdate(memberId, {
      $pull: { rooms: roomId }
    });

    res.status(200).json({
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Failed to remove member', error: error.message });
  }
};
