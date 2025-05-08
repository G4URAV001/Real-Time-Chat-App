require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Room = require('./models/Room');
const Message = require('./models/Message');

// MongoDB Connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chitchat';

// Sample data
const users = [
  {
    username: 'admin',
    email: 'admin@example.com',
    password: 'password123',
    avatar: 'https://ui-avatars.com/api/?name=Admin&background=random',
    status: 'online'
  },
  {
    username: 'john',
    email: 'john@example.com',
    password: 'password123',
    avatar: 'https://ui-avatars.com/api/?name=John&background=random',
    status: 'online'
  },
  {
    username: 'sarah',
    email: 'sarah@example.com',
    password: 'password123',
    avatar: 'https://ui-avatars.com/api/?name=Sarah&background=random',
    status: 'away'
  },
  {
    username: 'mike',
    email: 'mike@example.com',
    password: 'password123',
    avatar: 'https://ui-avatars.com/api/?name=Mike&background=random',
    status: 'offline'
  }
];

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Room.deleteMany({});
    await Message.deleteMany({});
    console.log('✅ Existing data cleared');

    // Create users
    console.log('Creating users...');
    const createdUsers = [];
    
    for (const userData of users) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      const user = new User({
        ...userData,
        password: hashedPassword,
        lastActive: Date.now()
      });
      
      const savedUser = await user.save();
      createdUsers.push(savedUser);
      console.log(`Created user: ${savedUser.username}`);
    }

    // Create rooms
    console.log('\nCreating rooms...');
    const adminUser = createdUsers[0];
    const johnUser = createdUsers[1];
    
    // Public rooms
    const generalRoom = new Room({
      name: 'General',
      description: 'General chat for everyone',
      isPrivate: false,
      createdBy: adminUser._id,
      members: createdUsers.map(user => user._id),
      lastActivity: Date.now()
    });
    await generalRoom.save();
    console.log(`Created public room: ${generalRoom.name}`);
    
    const techRoom = new Room({
      name: 'Tech Talk',
      description: 'Discuss the latest in technology',
      isPrivate: false,
      createdBy: johnUser._id,
      members: [createdUsers[0]._id, createdUsers[1]._id, createdUsers[3]._id],
      lastActivity: Date.now() - 3600000
    });
    await techRoom.save();
    console.log(`Created public room: ${techRoom.name}`);
    
    // Private room
    const privateRoom = new Room({
      name: 'Project Alpha',
      description: 'Private discussion for Project Alpha',
      isPrivate: true,
      createdBy: adminUser._id,
      members: [createdUsers[0]._id, createdUsers[1]._id],
      lastActivity: Date.now() - 7200000
    });
    
    // Generate invite code for private room
    privateRoom.generateInviteCode();
    await privateRoom.save();
    console.log(`Created private room: ${privateRoom.name} (Invite Code: ${privateRoom.inviteCode})`);
    
    // Create messages
    console.log('\nCreating messages...');
    
    // Messages in General room
    const generalMessages = [
      {
        text: 'Welcome to the General chat room!',
        sender: adminUser._id,
        room: generalRoom._id,
        createdAt: new Date(Date.now() - 86400000) // 1 day ago
      },
      {
        text: 'Thanks for setting up this chat app!',
        sender: johnUser._id,
        room: generalRoom._id,
        createdAt: new Date(Date.now() - 82800000) // 23 hours ago
      },
      {
        text: 'Hello everyone! How are you all doing today?',
        sender: createdUsers[2]._id, // Sarah
        room: generalRoom._id,
        createdAt: new Date(Date.now() - 3600000) // 1 hour ago
      }
    ];
    
    for (const msgData of generalMessages) {
      const message = new Message(msgData);
      await message.save();
    }
    console.log(`Created ${generalMessages.length} messages in General room`);
    
    // Messages in Tech Talk room
    const techMessages = [
      {
        text: 'Has anyone tried the new React 18 features?',
        sender: johnUser._id,
        room: techRoom._id,
        createdAt: new Date(Date.now() - 7200000) // 2 hours ago
      },
      {
        text: 'Yes, the concurrent rendering is amazing!',
        sender: adminUser._id,
        room: techRoom._id,
        createdAt: new Date(Date.now() - 7000000) // 1.9 hours ago
      }
    ];
    
    for (const msgData of techMessages) {
      const message = new Message(msgData);
      await message.save();
    }
    console.log(`Created ${techMessages.length} messages in Tech Talk room`);
    
    // Messages in Private room
    const privateMessages = [
      {
        text: 'This is a private room for Project Alpha discussions.',
        sender: adminUser._id,
        room: privateRoom._id,
        createdAt: new Date(Date.now() - 7200000) // 2 hours ago
      },
      {
        text: 'When is our next meeting scheduled?',
        sender: johnUser._id,
        room: privateRoom._id,
        createdAt: new Date(Date.now() - 3600000) // 1 hour ago
      },
      {
        text: 'Next Tuesday at 2 PM. I\'ll send calendar invites.',
        sender: adminUser._id,
        room: privateRoom._id,
        createdAt: new Date(Date.now() - 3500000) // 58 minutes ago
      }
    ];
    
    for (const msgData of privateMessages) {
      const message = new Message(msgData);
      await message.save();
    }
    console.log(`Created ${privateMessages.length} messages in Project Alpha room`);
    
    // Create direct messages
    const directMessages = [
      {
        text: 'Hey John, do you have a minute to chat?',
        sender: adminUser._id,
        directRecipient: johnUser._id,
        createdAt: new Date(Date.now() - 3600000) // 1 hour ago
      },
      {
        text: 'Sure, what\'s up?',
        sender: johnUser._id,
        directRecipient: adminUser._id,
        createdAt: new Date(Date.now() - 3500000) // 58 minutes ago
      },
      {
        text: 'I wanted to discuss the new project requirements.',
        sender: adminUser._id,
        directRecipient: johnUser._id,
        createdAt: new Date(Date.now() - 3400000) // 56 minutes ago
      }
    ];
    
    for (const msgData of directMessages) {
      const message = new Message(msgData);
      await message.save();
    }
    console.log(`Created ${directMessages.length} direct messages`);
    
    // Add direct conversations to users
    await User.findByIdAndUpdate(adminUser._id, {
      $push: {
        directConversations: {
          userId: johnUser._id,
          lastReadTimestamp: new Date(Date.now() - 3400000)
        }
      }
    });
    
    await User.findByIdAndUpdate(johnUser._id, {
      $push: {
        directConversations: {
          userId: adminUser._id,
          lastReadTimestamp: new Date(Date.now() - 3500000)
        }
      }
    });
    
    console.log('\n✅ Database seeded successfully!');
    console.log('\nTest User Credentials:');
    users.forEach(user => {
      console.log(`Username: ${user.username}, Password: ${user.password}`);
    });
    
    console.log('\nPrivate Room Invite Code:');
    console.log(`Room: ${privateRoom.name}, Invite Code: ${privateRoom.inviteCode}`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

seedDatabase();
