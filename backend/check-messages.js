require('dotenv').config();
const mongoose = require('mongoose');
const Message = require('./models/Message');

async function checkMessages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chitchat');
    console.log('Connected to MongoDB');
    
    // Find messages with attachments
    const messages = await Message.find({ attachments: { $exists: true, $ne: [] } })
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log(`Found ${messages.length} messages with attachments`);
    
    // Print message details
    messages.forEach((message, index) => {
      console.log(`\nMessage ${index + 1}:`);
      console.log(`ID: ${message._id}`);
      console.log(`Text: ${message.text}`);
      console.log(`Sender: ${message.sender}`);
      console.log(`Created At: ${message.createdAt}`);
      console.log(`Attachments: ${message.attachments.length}`);
      
      // Print attachment details
      message.attachments.forEach((attachment, i) => {
        console.log(`\n  Attachment ${i + 1}:`);
        console.log(`  Type: ${attachment.type}`);
        console.log(`  URL: ${attachment.url}`);
        console.log(`  URL Path Parts: ${attachment.url.split('/')}`);
        console.log(`  Filename: ${attachment.url.split('/').pop()}`);
        console.log(`  Name: ${attachment.name}`);
        console.log(`  Size: ${attachment.size}`);
        console.log(`  MIME Type: ${attachment.mimetype}`);
      });
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkMessages();
