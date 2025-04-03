import React, { useState } from 'react';
import TerminalComponent from '@/components/terminal/TerminalComponent';
import { IoClose } from 'react-icons/io5';
import { VscTerminalCmd } from 'react-icons/vsc';

interface TerminalPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({ isVisible, onClose }) => {
  const [height, setHeight] = useState(300);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newHeight = window.innerHeight - e.clientY;
    if (newHeight > 100 && newHeight < window.innerHeight / 2) {
      setHeight(newHeight);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add and remove event listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!isVisible) return null;

  return (
    <div 
      className="terminal-panel absolute bottom-0 left-0 right-0 bg-dark z-10 border-t border-gray-700"
      style={{ height: `${height}px` }}
    >
      {/* Resize handle */}
      <div 
        className="resize-handle absolute top-0 left-0 right-0 h-1 bg-gray-700 cursor-ns-resize"
        onMouseDown={handleMouseDown}
      />
      
      {/* Terminal header */}
      <div className="terminal-header flex items-center justify-between p-2 border-b border-gray-700">
        <div className="flex items-center">
          <VscTerminalCmd className="mr-2" />
          <span>Terminal</span>
        </div>
        <button 
          className="p-1 hover:bg-gray-700 rounded"
          onClick={onClose}
        >
          <IoClose />
        </button>
      </div>
      
      {/* Terminal content */}
      <div className="terminal-content h-[calc(100%-36px)]">
        <TerminalComponent />
      </div>
    </div>
  );
};

export default TerminalPanel;
