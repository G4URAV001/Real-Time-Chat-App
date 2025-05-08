const User = require('../models/User');

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    
    // Get all users except current user
    const users = await User.find({ _id: { $ne: currentUserId } })
      .select('username avatar status lastActive')
      .sort({ username: 1 });
    
    res.status(200).json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to get users', error: error.message });
  }
};

// Get online users
exports.getOnlineUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // Get users who were active in the last 5 minutes
    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { status: 'online' },
        { lastActive: { $gte: fiveMinutesAgo } }
      ]
    })
    .select('username avatar status lastActive')
    .sort({ username: 1 });
    
    res.status(200).json({ users });
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({ message: 'Failed to get online users', error: error.message });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId)
      .select('username avatar status lastActive');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user', error: error.message });
  }
};

// Update user's status
exports.updateStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.body;
    
    // Validate status
    if (!['online', 'offline', 'away'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        status,
        lastActive: Date.now()
      },
      { new: true }
    ).select('username avatar status lastActive');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({
      message: 'Status updated successfully',
      user
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Failed to update status', error: error.message });
  }
};

// Search users by username
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user.id;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const users = await User.find({
      _id: { $ne: currentUserId },
      username: { $regex: query, $options: 'i' }
    })
    .select('username avatar status lastActive')
    .limit(10)
    .sort({ username: 1 });
    
    res.status(200).json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Failed to search users', error: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, password, avatar } = req.body;
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields if provided
    if (username) {
      // Check if username is already taken
      const existingUser = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
      user.username = username;
    }
    
    if (password) {
      user.password = password; // The password will be hashed by the pre-save hook in the User model
    }
    
    if (avatar) {
      user.avatar = avatar;
    }
    
    // Save the updated user
    await user.save();
    
    // Return the updated user without sensitive information
    const updatedUser = {
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
      lastActive: user.lastActive
    };
    
    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};
