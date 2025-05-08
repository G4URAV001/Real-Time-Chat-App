import React from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Badge } from '@/components/ui/badge';
import { Globe, Lock } from 'lucide-react';

interface RoomListProps {
  onSelectRoom: () => void;
  searchQuery?: string;
}

const RoomList: React.FC<RoomListProps> = ({ onSelectRoom, searchQuery = '' }) => {
  const { rooms, currentRoom, joinRoom } = useChat();
  
  const filteredRooms = searchQuery
    ? rooms.filter(room => 
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (room.description && room.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : rooms;

  // Helper function to check if a room is the current room
  const isCurrentRoom = (room: any) => {
    if (!currentRoom) return false;
    return (
      (room.id && currentRoom.id && room.id === currentRoom.id) ||
      (room._id && currentRoom._id && room._id === currentRoom._id) ||
      (room.id && currentRoom._id && room.id === currentRoom._id) ||
      (room._id && currentRoom.id && room._id === currentRoom.id)
    );
  };

  return (
    <div className="space-y-1">
      {filteredRooms.length > 0 ? (
        filteredRooms.map((room) => {
          const roomId = room.id || room._id;
          return (
            <div
              key={roomId}
              className={`p-2 rounded-md cursor-pointer flex items-center ${
                isCurrentRoom(room) ? 'bg-primary/10' : 'hover:bg-accent/50'
              }`}
              onClick={() => {
                console.log("Clicking room:", room);
                joinRoom(roomId);
                onSelectRoom();
              }}
            >
              <div className="mr-3">
                {room.isPrivate ? (
                  <div className="p-2 bg-muted rounded-full">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                ) : (
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium truncate">{room.name}</p>
                  {room.isPrivate && (
                    <Badge variant="secondary" className="ml-2 text-xs">Private</Badge>
                  )}
                </div>
                {room.description && (
                  <p className="text-sm text-muted-foreground truncate">{room.description}</p>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-6">
          <p className="text-muted-foreground">No rooms found</p>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
          )}
        </div>
      )}
    </div>
  );
};

export default RoomList;
