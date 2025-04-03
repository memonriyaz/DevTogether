import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as pty from 'node-pty';
import { Socket } from 'socket.io';
import { SocketEvent } from '../types/socket';

// Shared terminal instance for all connections
let sharedPtyProcess: pty.IPty | null = null;
let sharedTerminalMode = false;

// Default working directory
const defaultCwd = path.join(process.cwd(), 'savedFiles');

// Ensure the directory exists
if (!fs.existsSync(defaultCwd)) {
  console.log(`Creating directory: ${defaultCwd}`);
  fs.mkdirSync(defaultCwd, { recursive: true });
}

// Determine shell based on platform
const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
const shellArgs = os.platform() === 'win32' ? [] : ['-l']; // Use login shell on Unix

// Spawn a new shell
const spawnShell = (cols = 80, rows = 24) => {
  console.log(`Spawning shell in ${defaultCwd}`);
  return pty.spawn(shell, shellArgs, {
    name: 'xterm-color',
    cols,
    rows,
    cwd: defaultCwd,
    env: process.env as { [key: string]: string }
  });
};

// Set shared terminal mode
export const setSharedTerminalMode = (useSharedTerminal: boolean) => {
  sharedTerminalMode = useSharedTerminal;
  if (sharedTerminalMode && !sharedPtyProcess) {
    sharedPtyProcess = spawnShell();
  }
};

// Handle terminal connection
export const handleTerminalConnection = (socket: Socket) => {
  console.log('Terminal client connected:', socket.id);

  // Send connection acknowledgment
  socket.emit('connect_ack', { status: 'connected', socketId: socket.id });

  // Use shared process or create a new one
  const ptyProcess = sharedTerminalMode ? sharedPtyProcess! : spawnShell();

  // Send initial connection info
  socket.emit(SocketEvent.TERMINAL_CONNECTED, {
    cwd: defaultCwd
  });

  // Also send a welcome message directly to the terminal
  ptyProcess.write('echo "Welcome to DevTogether Terminal!\nCurrent directory: ' + defaultCwd + '\nType commands like ls, pwd, or mkdir to work with files\n"\n');

  // Handle terminal data (output from the terminal)
  ptyProcess.onData((data) => {
    // Send data directly like in interactive-terminal
    socket.emit(SocketEvent.TERMINAL_OUTPUT, {
      type: 'output',
      data
    });

    // Also send raw data for compatibility with interactive-terminal
    socket.emit('terminal:output', data);
  });

  // Handle input from the client - support both string and enum event names
  socket.on(SocketEvent.TERMINAL_COMMAND, (data) => {
    try {
      console.log(`Terminal command received (enum): ${data.length > 20 ? data.substring(0, 20) + '...' : data}`);
      ptyProcess.write(data);
    } catch (error) {
      console.error(`Error writing to terminal: ${error}`);
      socket.emit(SocketEvent.TERMINAL_ERROR, {
        message: `Failed to send command: ${error}`
      });
    }
  });

  // Also support the string event name for backward compatibility
  socket.on('terminal:command', (data) => {
    try {
      console.log(`Terminal command received (string): ${data.length > 20 ? data.substring(0, 20) + '...' : data}`);
      ptyProcess.write(data);
    } catch (error) {
      console.error(`Error writing to terminal: ${error}`);
      socket.emit('terminal:error', {
        message: `Failed to send command: ${error}`
      });
    }
  });

  // Handle terminal resize
  socket.on(SocketEvent.TERMINAL_RESIZE, ({ cols, rows }) => {
    try {
      ptyProcess.resize(cols, rows);
      console.log(`Terminal resized to ${cols}x${rows}`);
    } catch (error) {
      console.error(`Error resizing terminal: ${error}`);
    }
  });

  // Also support the string event name for backward compatibility
  socket.on('terminal:resize', ({ cols, rows }) => {
    try {
      ptyProcess.resize(cols, rows);
      console.log(`Terminal resized to ${cols}x${rows} (string event)`);
    } catch (error) {
      console.error(`Error resizing terminal: ${error}`);
    }
  });

  // Handle client disconnect
  socket.on('disconnect', () => {
    console.log('Terminal client disconnected:', socket.id);
    if (!sharedTerminalMode) {
      ptyProcess.kill();
    }
  });
};
