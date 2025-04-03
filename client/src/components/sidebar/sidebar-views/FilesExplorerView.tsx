import React, { useState, useEffect } from 'react';
import useResponsive from '@/hooks/useResponsive';
import FileExplorer from '@/components/files/FileExplorer';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'react-hot-toast';

function FilesExplorerView() {
  const { viewHeight } = useResponsive();
  const { currentUser } = useAppContext();
  const [roomId, setRoomId] = useState<string>('');

  // Set room ID based on user or use default
  useEffect(() => {
    if (currentUser?.roomId) {
      setRoomId(currentUser.roomId);
    } else {
      // Use a default room ID if user is not in a room
      setRoomId('default');
      toast.info('Using default room for file storage');
    }
  }, [currentUser]);

  return (
    <div
      className="flex max-h-full min-h-[400px] w-full flex-col gap-2 p-4"
      style={{ height: viewHeight }}
    >
      <h1 className="view-title">Files Explorer</h1>
      <p className="text-sm text-gray-400 mb-2">
        Room: {roomId}
      </p>

      <div className="flex-grow bg-dark rounded-md overflow-hidden">
        {roomId ? (
          <FileExplorer roomId={roomId} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            Loading room information...
          </div>
        )}
      </div>
    </div>
  );
}

export default FilesExplorerView;
