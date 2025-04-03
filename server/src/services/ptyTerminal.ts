import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as pty from 'node-pty';

interface PtyProcess {
  pty: pty.IPty;
  cols: number;
  rows: number;
}

export class PtyTerminalService {
  private terminals: Map<string, PtyProcess> = new Map();
  private defaultCwd: string;

  constructor() {
    // Set the initial working directory to the savedFiles directory
    this.defaultCwd = path.join(process.cwd(), 'savedFiles');
    
    // Ensure the directory exists
    if (!fs.existsSync(this.defaultCwd)) {
      console.log(`Creating directory: ${this.defaultCwd}`);
      fs.mkdirSync(this.defaultCwd, { recursive: true });
    }
    
    console.log('PTY Terminal service initialized with cwd:', this.defaultCwd);
  }

  /**
   * Create a new terminal session
   */
  public createTerminal(sessionId: string, cols: number = 80, rows: number = 24): void {
    // Determine shell based on platform
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    const args = os.platform() === 'win32' ? [] : ['-l']; // Use login shell on Unix
    
    try {
      // Create the PTY process
      const terminal = pty.spawn(shell, args, {
        name: 'xterm-color',
        cols,
        rows,
        cwd: this.defaultCwd,
        env: process.env as { [key: string]: string }
      });
      
      // Store the terminal
      this.terminals.set(sessionId, { 
        pty: terminal,
        cols,
        rows
      });
      
      console.log(`Terminal created for session ${sessionId}`);
      return;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error creating terminal: ${errorMessage}`);
      throw new Error(`Failed to create terminal: ${errorMessage}`);
    }
  }

  /**
   * Write data to the terminal
   */
  public write(sessionId: string, data: string): void {
    const terminal = this.terminals.get(sessionId);
    if (!terminal) {
      console.error(`Terminal not found for session ${sessionId}`);
      return;
    }
    
    terminal.pty.write(data);
  }

  /**
   * Resize the terminal
   */
  public resize(sessionId: string, cols: number, rows: number): void {
    const terminal = this.terminals.get(sessionId);
    if (!terminal) {
      console.error(`Terminal not found for session ${sessionId}`);
      return;
    }
    
    terminal.pty.resize(cols, rows);
    terminal.cols = cols;
    terminal.rows = rows;
    console.log(`Terminal ${sessionId} resized to ${cols}x${rows}`);
  }

  /**
   * Close the terminal
   */
  public closeTerminal(sessionId: string): void {
    const terminal = this.terminals.get(sessionId);
    if (!terminal) {
      console.error(`Terminal not found for session ${sessionId}`);
      return;
    }
    
    terminal.pty.kill();
    this.terminals.delete(sessionId);
    console.log(`Terminal ${sessionId} closed`);
  }

  /**
   * Get a terminal by session ID
   */
  public getTerminal(sessionId: string): pty.IPty | null {
    const terminal = this.terminals.get(sessionId);
    return terminal ? terminal.pty : null;
  }

  /**
   * Get the current working directory
   */
  public getCurrentDirectory(): string {
    return this.defaultCwd;
  }
}

export default new PtyTerminalService();
