import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { io, Socket } from 'socket.io-client';
import 'xterm/css/xterm.css';
import { SocketEvent } from '@/types/socket';

interface TerminalComponentProps {
  width?: string;
  height?: string;
  className?: string;
  roomId?: string; // Optional room ID for collaborative sessions
}

const TerminalComponent: React.FC<TerminalComponentProps> = ({
  width = 'full',
  height = 'full',
  className = '',
  roomId
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  // We need setIsConnected for the connect/disconnect handlers
  const [isConnected, setIsConnected] = useState(false);
  // We need setCurrentDirectory for the terminal:connected handler
  const [currentDirectory, setCurrentDirectory] = useState('');
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef(new FitAddon());

  // Initialize terminal and socket connection
  useEffect(() => {
    // Create socket connection
    const BACKEND_URL = (window as any).VITE_BACKEND_URL || 'http://localhost:3000';
    console.log('Connecting to terminal server at:', BACKEND_URL);

    const socketInstance = io(`${BACKEND_URL}/terminal`, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      autoConnect: true,
      query: roomId ? { roomId } : {}
    });

    setSocket(socketInstance);

    // Log socket connection events
    socketInstance.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      if (terminalInstance.current) {
        terminalInstance.current.writeln(`\r\n\x1b[31mConnection error: ${err.message}\x1b[0m\r\n`);
      }
    });

    socketInstance.on('connect_timeout', () => {
      console.error('Socket connection timeout');
      if (terminalInstance.current) {
        terminalInstance.current.writeln('\r\n\x1b[31mConnection timeout\x1b[0m\r\n');
      }
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      if (terminalInstance.current) {
        terminalInstance.current.writeln(`\r\n\x1b[32mReconnected to server\x1b[0m\r\n`);
      }
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Socket reconnection attempt ${attemptNumber}`);
      if (terminalInstance.current) {
        terminalInstance.current.writeln(`\r\n\x1b[33mAttempting to reconnect (${attemptNumber})...\x1b[0m\r\n`);
      }
    });

    socketInstance.on('reconnect_error', (err) => {
      console.error('Socket reconnection error:', err);
      if (terminalInstance.current) {
        terminalInstance.current.writeln(`\r\n\x1b[31mReconnection error: ${err.message}\x1b[0m\r\n`);
      }
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      if (terminalInstance.current) {
        terminalInstance.current.writeln('\r\n\x1b[31mReconnection failed. Please refresh the page.\x1b[0m\r\n');
      }
    });

    // Initialize terminal
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        selectionBackground: 'rgba(255, 255, 255, 0.3)',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      }
    });

    // Add addons
    term.loadAddon(fitAddon.current);
    term.loadAddon(new WebLinksAddon());

    // Store terminal instance
    terminalInstance.current = term;

    // Clean up on unmount
    return () => {
      if (terminalInstance.current) {
        terminalInstance.current.dispose();
      }
      socketInstance.disconnect();
    };
  }, [roomId]);

  // Handle socket events
  useEffect(() => {
    if (!socket) return;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to terminal server');
      setIsConnected(true);

      if (terminalInstance.current) {
        terminalInstance.current.writeln('\r\n\x1b[32mConnected to terminal server\x1b[0m\r\n');
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from terminal server');
      setIsConnected(false);

      if (terminalInstance.current) {
        terminalInstance.current.writeln('\r\n\x1b[31mDisconnected from terminal server\x1b[0m\r\n');
        terminalInstance.current.writeln('\r\n\x1b[33mWaiting for reconnection...\x1b[0m\r\n');
      }
    });

    // Terminal events
    socket.on(SocketEvent.TERMINAL_CONNECTED, (data: { cwd: string }) => {
      console.log('Terminal session established:', data);
      setCurrentDirectory(data.cwd);

      if (terminalInstance.current) {
        terminalInstance.current.writeln('Connected to terminal server');
        terminalInstance.current.writeln(`Current directory: ${data.cwd}`);
        terminalInstance.current.writeln('');
      }
    });

    socket.on(SocketEvent.TERMINAL_OUTPUT, (data: any) => {
      if (!terminalInstance.current) return;

      if (typeof data === 'object' && data.data) {
        terminalInstance.current.write(data.data);
      } else if (typeof data === 'string') {
        terminalInstance.current.write(data);
      }
    });

    socket.on(SocketEvent.TERMINAL_ERROR, (data: any) => {
      console.error('Terminal error:', data);
      if (terminalInstance.current) {
        terminalInstance.current.writeln(`\r\n\x1b[31mError: ${data.message || 'Unknown error'}\x1b[0m\r\n`);
      }
    });


    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('connect_timeout');
      socket.off('reconnect');
      socket.off('reconnect_attempt');
      socket.off('reconnect_error');
      socket.off('reconnect_failed');
      socket.off(SocketEvent.TERMINAL_CONNECTED);
      socket.off(SocketEvent.TERMINAL_OUTPUT);
      socket.off(SocketEvent.TERMINAL_ERROR);
      socket.off('terminal:connected');
      socket.off('terminal:output');
      socket.off('terminal:error');
    };
  }, [socket]);

  // Mount terminal to DOM and set up event listeners
  useEffect(() => {
    if (!terminalRef.current || !terminalInstance.current || !socket) return;

    const term = terminalInstance.current;

    // Open terminal in the container
    term.open(terminalRef.current);

    // Fit terminal to container
    setTimeout(() => {
      fitAddon.current.fit();

      // Send initial resize event
      if (socket && term.cols && term.rows) {
        socket.emit(SocketEvent.TERMINAL_RESIZE, { cols: term.cols, rows: term.rows });
      }
    }, 100);

    // Handle terminal resize
    const handleResize = () => {
      fitAddon.current.fit();
      if (socket && term.cols && term.rows) {
        console.log(`Resizing terminal to ${term.cols}x${term.rows}`);
        socket.emit(SocketEvent.TERMINAL_RESIZE, { cols: term.cols, rows: term.rows });
      }
    };

    window.addEventListener('resize', handleResize);

    // Handle user input
    term.onKey(({ key }) => {
      // Send every keystroke directly to the PTY
      
        socket.emit(SocketEvent.TERMINAL_COMMAND, key);
      // if (!isConnected && terminalInstance.current) {
      //   // If not connected, show a message
      //   if (key === '\r') { // Enter key
      //     terminalInstance.current.writeln('\r\n\x1b[31mNot connected to terminal server\x1b[0m\r\n');
      //   }
      // }
    });

    // Handle paste events
    term.attachCustomKeyEventHandler((e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        navigator.clipboard.readText().then(text => {
          if (socket) {
            socket.emit(SocketEvent.TERMINAL_COMMAND, text);
          }
        }).catch(err => {
          console.error('Failed to read clipboard contents: ', err);
        });
        return false;
      }
      return true;
    });

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [ socket]);

  // Generate style classes
  const containerClasses = [
    'terminal-container',
    width === 'full' ? 'w-full' : width,
    height === 'full' ? 'h-full' : height,
    className
  ].join(' ');

  return (
    <div
      className={containerClasses}
      style={{
        backgroundColor: '#1e1e1e',
        padding: '4px',
        borderRadius: '4px',
        overflow: 'hidden'
      }}
    >
      {!isConnected && (
        <div className="absolute inset-0 flex items-center justify-center bg-opacity-75 bg-gray-800 z-10">
          <div className="text-white">Connecting to terminal...</div>
        </div>
      )}
      <div
        ref={terminalRef}
        className="terminal-inner w-full h-full"
      />
    </div>
  );
};

export default TerminalComponent;