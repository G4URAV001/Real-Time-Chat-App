import React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline' | 'away' | 'busy';
}

const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  name = '', 
  size = 'md',
  status
}) => {
  // Get initials from name
  const getInitials = (name: string) => {
    if (!name) return '';
    
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  // Size classes
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-24 w-24 text-xl'
  };

  // Status indicator classes
  const statusClasses = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500'
  };

  return (
    <div className="relative inline-block">
      <AvatarPrimitive.Root className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        sizeClasses[size]
      )}>
        {src && (
          <AvatarPrimitive.Image
            src={src}
            alt={name || 'User avatar'}
            className="h-full w-full object-cover"
          />
        )}
        <AvatarPrimitive.Fallback 
          className="flex h-full w-full items-center justify-center rounded-full bg-violet-100 text-violet-600"
        >
          {getInitials(name)}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      
      {status && (
        <span 
          className={`absolute right-0 bottom-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white ${statusClasses[status]}`}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default Avatar;
