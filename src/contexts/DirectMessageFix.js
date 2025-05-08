// This file contains the fixes for direct messages with attachments
// Copy these functions to the appropriate places in ChatContext.tsx

// 1. Update the handleDirectMessage function to better handle attachments
const handleDirectMessage = (message) => {
  console.log('Received direct message via socket:', message);
  
  // Format the message to match our expected structure
  const formattedMessage = {
    id: message._id || message.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    senderId: message.sender?._id || message.sender?.id || message.senderId,
    senderName: message.sender?.username || message.senderName || 'Unknown User',
    senderAvatar: message.sender?.avatar || message.senderAvatar,
    text: message.text || message.content || '',
    timestamp: message.timestamp || message.createdAt ? new Date(message.timestamp || message.createdAt).getTime() : Date.now(),
    directRecipientId: message.directRecipient || message.recipientId,
    isRead: false,
    attachments: message.attachments || []
  };
  
  // Check if the message is from the current user and is a temporary message
  const isFromCurrentUser = formattedMessage.senderId === currentUser?.id;
  
  // Determine the other user's ID (the one we're chatting with)
  const otherUserId = formattedMessage.senderId === currentUser?.id 
    ? formattedMessage.directRecipientId 
    : formattedMessage.senderId;
    
  console.log(`Updating conversation with user: ${otherUserId}`);

  // Add message to messages state if we're in the direct conversation
  if (currentDirectRecipient && (currentDirectRecipient.id === otherUserId || currentDirectRecipient.id === formattedMessage.senderId)) {
    setMessages(prev => {
      // For messages with attachments, we need a different check since text might be empty
      const hasAttachments = formattedMessage.attachments && formattedMessage.attachments.length > 0;
      
      // Check if message already exists to prevent duplicates
      const exists = prev.some(m => 
        m.id === formattedMessage.id || 
        (isFromCurrentUser && 
         ((hasAttachments && Math.abs(m.timestamp - formattedMessage.timestamp) < 10000) || // For attachment messages, just check timestamp
          (!hasAttachments && m.text === formattedMessage.text && Math.abs(m.timestamp - formattedMessage.timestamp) < 5000)) && // For text messages, check text and timestamp
         m.id.toString().startsWith('temp-'))
      );
      
      console.log('Checking if message exists:', { exists, hasAttachments, formattedMessage });
      
      if (exists) {
        console.log('Message already exists in state, skipping');
        return prev;
      }
      
      // If it's from the current user, we might need to replace a temporary message
      if (isFromCurrentUser) {
        // Try to find a matching temporary message
        const tempIndex = prev.findIndex(m => 
          m.id.toString().startsWith('temp-') && 
          ((hasAttachments && Math.abs(m.timestamp - formattedMessage.timestamp) < 10000) || // For attachment messages, just check timestamp
           (!hasAttachments && m.text === formattedMessage.text && Math.abs(m.timestamp - formattedMessage.timestamp) < 5000)) // For text messages, check text and timestamp
        );
        
        if (tempIndex >= 0) {
          console.log('Replacing temporary message with confirmed message');
          const newMessages = [...prev];
          newMessages[tempIndex] = formattedMessage;
          return newMessages;
        }
      }
      
      return [...prev, formattedMessage];
    });
  }

  // Update direct conversations with new message
  setDirectConversations(prev => {
    // Rest of the function remains the same...
    // ...
  });
};

// 2. Update the sendDirectMessage function to properly handle attachments
// In the .then() callback after axios.post for direct messages with attachments:
.then(response => {
  console.log('Direct message with attachments sent successfully:', response.data);
  
  // Update the temporary message with the real one from the server
  if (currentDirectRecipient && currentDirectRecipient.id === recipientId) {
    const serverMessage = response.data.data;
    
    // Replace the temporary message with the server message
    setMessages(prev => prev.map(msg => 
      msg.id === tempMessage.id ? {
        ...serverMessage,
        id: serverMessage._id || serverMessage.id,
        senderId: serverMessage.sender._id || serverMessage.sender.id,
        senderName: serverMessage.sender.username,
        senderAvatar: serverMessage.sender.avatar,
        timestamp: serverMessage.createdAt ? new Date(serverMessage.createdAt).getTime() : serverMessage.timestamp,
        directRecipientId: serverMessage.recipientId,
        attachments: serverMessage.attachments || []
      } : msg
    ));
    
    // Revoke any blob URLs to prevent memory leaks
    if (tempMessage.attachments) {
      tempMessage.attachments.forEach(attachment => {
        if (attachment.url.startsWith('blob:')) {
          URL.revokeObjectURL(attachment.url);
        }
      });
    }
  }
});
