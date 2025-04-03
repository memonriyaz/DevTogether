import { spawn, ChildProcess } from 'child_process';
import * as os from 'os';
import * as path from 'path';

export class TerminalService {
  private processes: Map<string, ChildProcess> = new Map();
  private cwd: string;

  constructor() {
    // Set the initial working directory to the savedFiles directory
    this.cwd = path.join(process.cwd(), 'savedFiles');
    console.log('Terminal service initialized with cwd:', this.cwd);
  }

  public executeCommand(command: string, sessionId: string, callback: (data: any) => void): void {
    console.log(`Executing command: ${command} for session ${sessionId} in directory ${this.cwd}`);

    // Check if the directory exists
    try {
      const fs = require('fs');
      if (!fs.existsSync(this.cwd)) {
        console.log(`Creating directory: ${this.cwd}`);
        fs.mkdirSync(this.cwd, { recursive: true });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error checking/creating directory: ${errorMessage}`);
    }

    // Split the command into the executable and arguments
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    // Determine the shell to use based on the OS
    const shell = os.platform() === 'win32' ? 'cmd.exe' : '/bin/bash';
    const shellArgs = os.platform() === 'win32' ? ['/c', command] : ['-c', command];

    try {
      // Send initial feedback
      callback({
        type: 'output',
        data: `Executing: ${command}\n`,
        sessionId
      });

      // Spawn the process
      const proc = spawn(shell, shellArgs, {
        cwd: this.cwd,
        env: process.env,
        shell: true
      });

      // Store the process
      this.processes.set(sessionId, proc);

      // Handle stdout
      proc.stdout.on('data', (data) => {
        callback({
          type: 'output',
          data: data.toString(),
          sessionId
        });
      });

      // Handle stderr
      proc.stderr.on('data', (data) => {
        callback({
          type: 'error',
          data: data.toString(),
          sessionId
        });
      });

      // Handle process exit
      proc.on('exit', (code) => {
        callback({
          type: 'exit',
          data: `Process exited with code ${code}`,
          code,
          sessionId
        });
        this.processes.delete(sessionId);
      });

      // Handle process error
      proc.on('error', (err) => {
        callback({
          type: 'error',
          data: `Process error: ${err.message}`,
          sessionId
        });
        this.processes.delete(sessionId);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      callback({
        type: 'error',
        data: `Failed to execute command: ${errorMessage}`,
        sessionId
      });
    }
  }

  public terminateProcess(sessionId: string): void {
    const proc = this.processes.get(sessionId);
    if (proc) {
      proc.kill();
      this.processes.delete(sessionId);
    }
  }

  public changeDirectory(newDir: string, sessionId: string, callback: (data: any) => void): void {
    try {
      // Resolve the new directory path
      const resolvedPath = path.resolve(this.cwd, newDir);

      // Make sure we don't navigate outside of the savedFiles directory
      const savedFilesDir = path.join(process.cwd(), 'savedFiles');
      if (!resolvedPath.startsWith(savedFilesDir)) {
        callback({
          type: 'error',
          data: `Cannot navigate outside of the project directory.\nStaying in ${this.cwd}\n`,
          sessionId
        });
        return;
      }

      // Check if the directory exists
      const fs = require('fs');
      if (!fs.existsSync(resolvedPath)) {
        callback({
          type: 'error',
          data: `Directory does not exist: ${resolvedPath}\n`,
          sessionId
        });
        return;
      }

      // Update the current working directory
      this.cwd = resolvedPath;

      callback({
        type: 'cwd',
        data: `Changed directory to ${this.cwd}\n`,
        cwd: this.cwd,
        sessionId
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      callback({
        type: 'error',
        data: `Failed to change directory: ${errorMessage}`,
        sessionId
      });
    }
  }

  public getCurrentDirectory(): string {
    // Ensure the directory exists
    try {
      const fs = require('fs');
      if (!fs.existsSync(this.cwd)) {
        console.log(`Creating directory: ${this.cwd}`);
        fs.mkdirSync(this.cwd, { recursive: true });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error checking/creating directory: ${errorMessage}`);
    }

    return this.cwd;
  }
}

export default new TerminalService();
