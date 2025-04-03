import { Server } from 'socket.io';
import { handleTerminalConnection, setSharedTerminalMode } from '../services/streamTerminal';

export default function setupStreamTerminalHandler(io: Server): void {
  console.log('Creating stream terminal namespace');

  // Set to false for individual terminal sessions, true for shared terminal
  setSharedTerminalMode(false);

  // Create terminal namespace
  const terminalNamespace = io.of('/terminal');

  // Handle connections
  terminalNamespace.on('connection', (socket) => {
    console.log('New terminal connection received:', socket.id);

    // Handle connection errors
    socket.on('error', (error) => {
      console.error('Terminal socket error:', error);
    });

    // Handle connection
    try {
      handleTerminalConnection(socket);
    } catch (error) {
      console.error('Error handling terminal connection:', error);
      socket.emit('terminal:error', {
        message: 'Failed to initialize terminal session'
      });
    }
  });

  // Handle namespace errors
  terminalNamespace.on('error', (error) => {
    console.error('Terminal namespace error:', error);
  });
}
