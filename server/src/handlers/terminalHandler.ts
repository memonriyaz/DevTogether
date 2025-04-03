import { Server, Socket } from 'socket.io';
import terminalService from '../services/terminal';
import { v4 as uuidv4 } from 'uuid';
import { SocketEvent } from '../types/socket';

export default function setupTerminalHandler(io: Server): void {
  console.log('Creating terminal namespace');
  const terminalNamespace = io.of('/terminal');

  terminalNamespace.on('connection', (socket: Socket) => {
    console.log('Terminal client connected:', socket.id);

    // Generate a unique session ID for this connection
    const sessionId = uuidv4();

    // Send initial connection info
    socket.emit(SocketEvent.TERMINAL_CONNECTED, {
      sessionId,
      cwd: terminalService.getCurrentDirectory()
    });

    // Handle command execution
    socket.on(SocketEvent.TERMINAL_COMMAND, (command: string) => {
      console.log(`Received command: ${command}`);

      // Special handling for 'cd' command
      if (command.trim().startsWith('cd ')) {
        const dir = command.trim().substring(3);
        terminalService.changeDirectory(dir, sessionId, (data) => {
          socket.emit(SocketEvent.TERMINAL_OUTPUT, data);
        });
      } else {
        // Execute the command
        terminalService.executeCommand(command, sessionId, (data) => {
          socket.emit(SocketEvent.TERMINAL_OUTPUT, data);
        });
      }
    });

    // Handle terminal resize
    socket.on(SocketEvent.TERMINAL_RESIZE, (dimensions: { cols: number, rows: number }) => {
      // This would be used to resize the PTY if we were using one
      console.log(`Terminal resized to ${dimensions.cols}x${dimensions.rows}`);
    });

    // Handle client disconnect
    socket.on('disconnect', () => {
      console.log('Terminal client disconnected:', socket.id);
      terminalService.terminateProcess(sessionId);
    });
  });
}
