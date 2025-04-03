import * as pty from 'node-pty';
import os from 'os';
import { Server } from 'socket.io';
import { SocketEvent } from '../types/socket';

const setupStreamTerminalHandler = (io: Server) => {
  console.log('Setting up stream terminal handler');
  
  // Create a namespace for terminal connections
  const terminalNamespace = io.of('/terminal');

  // Handle terminal connections
  terminalNamespace.on('connection', (socket) => {
    console.log(`New terminal connection: ${socket.id}`);
    
    // Determine the shell based on the platform
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    
    // Spawn a PTY process
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.env.HOME || process.env.USERPROFILE || '/',
      env: process.env
    });
    
    // Get the current working directory to send to the client
    const cwd = process.env.HOME || process.env.USERPROFILE || '/';
    
    // Send connected event with current directory
    // socket.emit(SocketEvent.TERMINAL_CONNECTED, { cwd });

    
    // Handle data from the PTY process
    ptyProcess.onData((data) => {
      // Send data to the client
      console.log(data)
      socket.emit(SocketEvent.TERMINAL_OUTPUT, { data });

    });
    
    // Handle terminal commands from the client
    socket.on(SocketEvent.TERMINAL_COMMAND, (command) => {
      // Write command to the PTY process
      console.log(command);
      ptyProcess.write(command);
    });
    
    // Handle terminal resize
    socket.on(SocketEvent.TERMINAL_RESIZE, ({ cols, rows }) => {
      if (ptyProcess.resize) {
        ptyProcess.resize(cols, rows);
      }
    });
    
    // Handle client disconnect
    socket.on('disconnect', () => {
      console.log(`Terminal disconnected: ${socket.id}`);
      ptyProcess.kill();
    });
    
    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
      socket.emit(SocketEvent.TERMINAL_ERROR, { message: 'Terminal connection error' });

    });
  });
  
  return terminalNamespace;
};

export default setupStreamTerminalHandler;