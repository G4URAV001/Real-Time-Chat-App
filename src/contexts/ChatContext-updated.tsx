// This file contains the updated direct message handling code
// Replace the corresponding sections in your ChatContext.tsx file

// 1. Update the handleDirectMessage function (around line 270)
const handleDirectMessage = (message: any) => {
  console.log('Received direct message via socket:', message);
  
  // Format the message to match our expected structure
  const formattedMessage: Message = {
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
      // Only check for exact ID matches to avoid skipping messages with attachments
      const exists = prev.some(m => m.id === formattedMessage.id);
      
      if (exists) {
        console.log('Message with same ID already exists in state, skipping');
        return prev;
      }
      
      // Add the message to the state
      return [...prev, formattedMessage];
    });
  }

  // Rest of the function remains the same...
};

// 2. Update the direct message with attachments HTTP response handler (around line 840)
.then(response => {
  console.log('Direct message with attachments sent successfully:', response.data);
  
  // Update the temporary message with the real one from the server
  if (currentDirectRecipient && currentDirectRecipient.id === recipientId) {
    const serverMessage = response.data.data;
    
    // Replace the temporary message with the server message
    setMessages(prev => {
      // Find the temporary message
      const tempIndex = prev.findIndex(msg => msg.id === tempMessage.id);
      
      if (tempIndex >= 0) {
        console.log('Replacing temporary message with server message');
        const newMessages = [...prev];
        newMessages[tempIndex] = {
          ...serverMessage,
          id: serverMessage._id || serverMessage.id,
          senderId: serverMessage.sender._id || serverMessage.sender.id,
          senderName: serverMessage.sender.username,
          senderAvatar: serverMessage.sender.avatar,
          timestamp: serverMessage.createdAt ? new Date(serverMessage.createdAt).getTime() : serverMessage.timestamp,
          directRecipientId: serverMessage.recipientId,
          attachments: serverMessage.attachments || []
        };
        return newMessages;
      }
      
      return prev;
    });
    
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
