import { Server, Socket } from 'socket.io';
import ptyTerminalService from '../services/ptyTerminal';
import { v4 as uuidv4 } from 'uuid';
import { SocketEvent } from '../types/socket';

export default function setupPtyTerminalHandler(io: Server): void {
  console.log('Creating PTY terminal namespace');
  const terminalNamespace = io.of('/terminal');

  terminalNamespace.on('connection', (socket: Socket) => {
    console.log('Terminal client connected:', socket.id);

    // Generate a unique session ID for this connection
    const sessionId = uuidv4();

    // Default terminal dimensions
    const cols = 80;
    const rows = 24;

    try {
      // Create a new terminal
      ptyTerminalService.createTerminal(sessionId, cols, rows);

      // Get the terminal instance
      const terminal = ptyTerminalService.getTerminal(sessionId);

      if (!terminal) {
        socket.emit('terminal:error', {
          message: 'Failed to create terminal session'
        });
        return;
      }

      // Send initial connection info
      socket.emit(SocketEvent.TERMINAL_CONNECTED, {
        sessionId,
        cwd: ptyTerminalService.getCurrentDirectory()
      });

      // Handle terminal data (output from the terminal)
      terminal.onData((data) => {
        socket.emit(SocketEvent.TERMINAL_OUTPUT, {
          type: 'output',
          data,
          sessionId
        });
      });

      // Handle terminal exit
      terminal.onExit(({ exitCode, signal }) => {
        socket.emit(SocketEvent.TERMINAL_OUTPUT, {
          type: 'exit',
          data: `Process exited with code ${exitCode} and signal ${signal}`,
          code: exitCode,
          signal,
          sessionId
        });

        // Clean up the terminal
        ptyTerminalService.closeTerminal(sessionId);

        // Create a new terminal session
        ptyTerminalService.createTerminal(sessionId, cols, rows);
      });

      // Handle input from the client - support both event types
      socket.on(SocketEvent.TERMINAL_COMMAND, (data) => {
        try {
          ptyTerminalService.write(sessionId, data);
        } catch (error) {
          console.error(`Error writing to terminal: ${error}`);
          socket.emit(SocketEvent.TERMINAL_ERROR, {
            message: `Failed to send command: ${error}`
          });
        }
      });

      // Also handle the terminal:input event for compatibility
      socket.on(SocketEvent.TERMINAL_INPUT, (data) => {
        try {
          ptyTerminalService.write(sessionId, data);
        } catch (error) {
          console.error(`Error writing to terminal: ${error}`);
          socket.emit(SocketEvent.TERMINAL_ERROR, {
            message: `Failed to send command: ${error}`
          });
        }
      });

      // Handle terminal resize
      socket.on(SocketEvent.TERMINAL_RESIZE, ({ cols, rows }) => {
        try {
          ptyTerminalService.resize(sessionId, cols, rows);
        } catch (error) {
          console.error(`Error resizing terminal: ${error}`);
        }
      });

      // Handle client disconnect
      socket.on('disconnect', () => {
        console.log('Terminal client disconnected:', socket.id);
        ptyTerminalService.closeTerminal(sessionId);
      });

    } catch (error) {
      console.error(`Error setting up terminal: ${error}`);
      socket.emit('terminal:error', {
        message: `Failed to set up terminal: ${error}`
      });
    }
  });
}
