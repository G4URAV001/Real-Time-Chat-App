import React from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Avatar from '@/components/UI/Avatar';
import { FileIcon, ImageIcon } from 'lucide-react';

interface Attachment {
  type: 'image' | 'file';
  url: string;
  name?: string;
  size?: number;
  mimetype?: string;
}

interface MessageProps {
  message: {
    id: string;
    roomId?: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    text: string;
    timestamp: number;
    directRecipientId?: string;
    attachments?: Attachment[];
  };
  isOwnMessage: boolean;
}

const Message: React.FC<MessageProps> = ({ message, isOwnMessage }) => {
  // Format the timestamp safely
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return 'unknown time';
    
    try {
      return format(new Date(timestamp), 'h:mm a');
    } catch (error) {
      console.error('Invalid timestamp:', timestamp);
      return 'unknown time';
    }
  };
  
  const time = formatTime(message.timestamp);

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };
  
  return (
    <div className={cn(
      "flex items-start gap-2 group animate-slide-in",
      isOwnMessage ? "flex-row-reverse" : ""
    )}>
      <div className="flex-shrink-0">
        <Avatar 
          src={message.senderAvatar} 
          name={message.senderName || 'Unknown User'}
          size="sm"
        />
      </div>
      
      <div className={cn(
        "flex flex-col max-w-[75%]",
        isOwnMessage ? "items-end" : "items-start"
      )}>
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            "text-xs text-muted-foreground",
            isOwnMessage ? "order-last" : "order-first"
          )}>
            {time}
          </span>
          <span className="font-medium text-sm">
            {isOwnMessage ? 'You' : (message.senderName || 'Unknown User')}
          </span>
        </div>
        
        <div className={cn(
          "rounded-lg px-3 py-2 break-words",
          isOwnMessage 
            ? "bg-primary text-primary-foreground rounded-tr-none" 
            : "bg-muted rounded-tl-none"
        )}>
          {/* Text content */}
          {message.text && (
            <p className="whitespace-pre-wrap mb-2">{message.text}</p>
          )}
          
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="space-y-2 mt-1">
              {message.attachments.map((attachment, index) => (
                <div key={`${message.id}-attachment-${index}`}>
                  {attachment.type === 'image' ? (
                    <div className="relative">
                      <img 
                        src={attachment.url.startsWith('blob:') ? attachment.url : 
                             attachment.url.startsWith('http') ? attachment.url : 
                             `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${attachment.url}`} 
                        alt={attachment.name || 'Image attachment'} 
                        className="rounded-md max-w-full max-h-[300px] object-contain"
                        onError={(e) => {
                          console.log('Image failed to load:', e.currentTarget.src);
                          // If the image fails to load, show a fallback image
                          const target = e.target as HTMLImageElement;
                          // Use a data URI for the fallback image instead of an external service
                          target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22300%22%20height%3D%22200%22%20fill%3D%22%23cccccc%22%2F%3E%3Ctext%20x%3D%22150%22%20y%3D%22100%22%20font-size%3D%2216%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23666666%22%3EImage%20not%20available%3C%2Ftext%3E%3C%2Fsvg%3E';
                          // Prevent infinite error loop
                          target.onerror = null;
                        }}
                      />
                      <a 
                        href={attachment.url.startsWith('blob:') ? attachment.url : 
                              attachment.url.startsWith('http') ? attachment.url : 
                              `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${attachment.url}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="absolute bottom-2 right-2 bg-black/60 text-white p-1 rounded-md text-xs"
                        download={attachment.name}
                      >
                        Download
                      </a>
                    </div>
                  ) : (
                    <a 
                      href={attachment.url.startsWith('blob:') ? attachment.url : 
                           attachment.url.startsWith('http') ? attachment.url : 
                           `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${attachment.url}`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      download={attachment.name}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md",
                        isOwnMessage ? "bg-primary/80" : "bg-muted-foreground/10"
                      )}
                    >
                      <FileIcon className="h-5 w-5 flex-shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-sm font-medium truncate">{attachment.name}</p>
                        {attachment.size && (
                          <p className="text-xs opacity-70">{formatFileSize(attachment.size)}</p>
                        )}
                      </div>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;
