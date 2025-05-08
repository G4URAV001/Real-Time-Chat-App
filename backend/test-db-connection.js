require('dotenv').config();
const mongoose = require('mongoose');
const Room = require('./models/Room');
const User = require('./models/User');
const Message = require('./models/Message');

// MongoDB Connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chitchat';

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log(`Connection URI: ${MONGODB_URI}`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connection successful!');
    
    // Check if collections exist
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('\nCollections in database:');
    console.log(collectionNames);
    
    // Check Room collection
    const roomCount = await Room.countDocuments();
    console.log(`\nRoom collection: ${roomCount} documents`);
    
    if (roomCount > 0) {
      const rooms = await Room.find().limit(3);
      console.log('Sample rooms:');
      rooms.forEach(room => {
        console.log(`- ${room.name} (${room.isPrivate ? 'Private' : 'Public'})`);
      });
    }
    
    // Check User collection
    const userCount = await User.countDocuments();
    console.log(`\nUser collection: ${userCount} documents`);
    
    if (userCount > 0) {
      const users = await User.find().select('username email status').limit(3);
      console.log('Sample users:');
      users.forEach(user => {
        console.log(`- ${user.username} (${user.email}) - Status: ${user.status}`);
      });
    }
    
    // Check Message collection
    const messageCount = await Message.countDocuments();
    console.log(`\nMessage collection: ${messageCount} documents`);
    
    if (messageCount > 0) {
      const messages = await Message.find().limit(3);
      console.log('Sample messages:');
      messages.forEach(message => {
        console.log(`- From: ${message.sender}, Text: "${message.text.substring(0, 30)}${message.text.length > 30 ? '...' : ''}"`);
      });
    }
    
    // Test public rooms endpoint
    console.log('\nTesting public rooms endpoint (getAllRooms controller):');
    const roomController = require('./controllers/room.controller');
    
    // Mock request and response
    const req = {};
    const res = {
      status: function(statusCode) {
        console.log(`Status code: ${statusCode}`);
        return this;
      },
      json: function(data) {
        console.log('Response data:');
        console.log(data);
        return this;
      }
    };
    
    try {
      await roomController.getAllRooms(req, res);
      console.log('✅ Public rooms endpoint test successful');
    } catch (error) {
      console.error('❌ Public rooms endpoint test failed:', error);
    }
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  }
}

testConnection().catch(console.error);
