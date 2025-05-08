// This file contains the fixed direct message handling code
// Copy the relevant sections to ChatContext.tsx

// 1. Update the handleDirectMessage function to include attachments
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
      // Check if message already exists to prevent duplicates
      // For the current user, we might have a temporary message with different ID
      const exists = prev.some(m => 
        m.id === formattedMessage.id || 
        (isFromCurrentUser && 
         m.text === formattedMessage.text && 
         Math.abs(m.timestamp - formattedMessage.timestamp) < 5000 && // Within 5 seconds
         m.id.toString().startsWith('temp-'))
      );
      
      if (exists) {
        console.log('Message already exists in state, skipping');
        return prev;
      }
      
      // If it's from the current user, we might need to replace a temporary message
      if (isFromCurrentUser) {
        // Try to find a matching temporary message
        const tempIndex = prev.findIndex(m => 
          m.id.toString().startsWith('temp-') && 
          ((m.text === formattedMessage.text && Math.abs(m.timestamp - formattedMessage.timestamp) < 5000) || // Within 5 seconds for text messages
           (formattedMessage.attachments && formattedMessage.attachments.length > 0 && Math.abs(m.timestamp - formattedMessage.timestamp) < 10000)) // Within 10 seconds for messages with attachments
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
    // Try to find the conversation
    const conversationIndex = prev.findIndex(c => 
      c.userId === otherUserId
    );

    if (conversationIndex >= 0) {
      // Update existing conversation
      const updatedConversations = [...prev];
      const conversation = { ...updatedConversations[conversationIndex] };
      
      conversation.lastMessage = {
        text: formattedMessage.text,
        timestamp: formattedMessage.timestamp,
        senderId: formattedMessage.senderId
      };
      
      // Increment unread count if message is not from current user
      if (!isFromCurrentUser) {
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
      }
      
      updatedConversations[conversationIndex] = conversation;
      return updatedConversations;
    } else {
      // Create new conversation
      console.log(`Creating new direct conversation with user ID: ${otherUserId}`);
      
      // Try to find user info from onlineUsers
      const user = onlineUsers.find(u => u.id === otherUserId);
      
      return [
        ...prev,
        {
          userId: otherUserId,
          username: user?.username || formattedMessage.senderName,
          avatar: user?.avatar || formattedMessage.senderAvatar,
          isOnline: !!user?.status && user.status === 'online',
          unreadCount: isFromCurrentUser ? 0 : 1,
          lastMessage: {
            text: formattedMessage.text,
            timestamp: formattedMessage.timestamp,
            senderId: formattedMessage.senderId
          }
        }
      ];
    }
  });
};
