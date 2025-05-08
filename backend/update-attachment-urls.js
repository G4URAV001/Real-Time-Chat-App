require('dotenv').config();
const mongoose = require('mongoose');
const Message = require('./models/Message');

async function updateAttachmentUrls() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chitchat');
    console.log('Connected to MongoDB');
    
    // Find all messages with attachments
    const messages = await Message.find({ attachments: { $exists: true, $ne: [] } });
    
    console.log(`Found ${messages.length} messages with attachments to update`);
    
    let updatedCount = 0;
    
    // Update each message's attachments
    for (const message of messages) {
      let hasUpdates = false;
      
      if (message.attachments && message.attachments.length > 0) {
        for (const attachment of message.attachments) {
          if (attachment.url && attachment.url.startsWith('/uploads/')) {
            // Update the URL to use the correct path
            const filename = attachment.url.split('/').pop();
            attachment.url = `/uploads/${filename}`;
            hasUpdates = true;
            console.log(`Updated attachment URL for message ${message._id}: ${attachment.url}`);
          }
        }
        
        if (hasUpdates) {
          await message.save();
          updatedCount++;
          console.log(`Saved message ${message._id} with updated attachment URLs`);
        }
      }
    }
    
    console.log(`Successfully updated ${updatedCount} messages with attachment URLs`);
  } catch (error) {
    console.error('Error updating attachment URLs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

updateAttachmentUrls();
