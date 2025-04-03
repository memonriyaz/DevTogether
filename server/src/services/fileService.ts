import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

// Convert fs methods to promise-based
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Base directory for all saved files
const BASE_DIR = path.join(process.cwd(), 'savedFiles');

// Ensure base directory exists
if (!fs.existsSync(BASE_DIR)) {
  fs.mkdirSync(BASE_DIR, { recursive: true });
}

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  lastModified: Date;
}

export class FileService {
  /**
   * Get the room directory path
   */
  private getRoomDir(roomId: string): string {
    const roomDir = path.join(BASE_DIR, roomId);

    // Ensure room directory exists
    if (!fs.existsSync(roomDir)) {
      fs.mkdirSync(roomDir, { recursive: true });
    }

    return roomDir;
  }

  /**
   * List files in a directory
   */
  async listFiles(roomId: string, dirPath: string = ''): Promise<FileInfo[]> {
    try {
      const roomDir = this.getRoomDir(roomId);
      const targetDir = path.join(roomDir, dirPath);

      // Ensure the target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Read directory contents
      const files = await readdir(targetDir);

      // Get file info for each file
      const fileInfoPromises = files.map(async (file) => {
        const filePath = path.join(targetDir, file);
        const stats = await stat(filePath);

        return {
          name: file,
          path: path.join(dirPath, file),
          isDirectory: stats.isDirectory(),
          size: stats.size,
          lastModified: stats.mtime
        };
      });

      return Promise.all(fileInfoPromises);
    } catch (error) {
      console.error(`Error listing files: ${error}`);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list files: ${errorMessage}`);
    }
  }

  /**
   * Read a file
   */
  async readFile(roomId: string, filePath: string): Promise<string> {
    try {
      const roomDir = this.getRoomDir(roomId);
      const fullPath = path.join(roomDir, filePath);

      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Check if it's a directory
      const stats = await stat(fullPath);
      if (stats.isDirectory()) {
        throw new Error(`Cannot read directory as file: ${filePath}`);
      }

      // Read file content
      const content = await readFile(fullPath, 'utf8');
      return content;
    } catch (error) {
      console.error(`Error reading file: ${error}`);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read file: ${errorMessage}`);
    }
  }

  /**
   * Write to a file
   */
  async writeFile(roomId: string, filePath: string, content: string): Promise<void> {
    try {
      const roomDir = this.getRoomDir(roomId);
      const fullPath = path.join(roomDir, filePath);

      // Ensure parent directory exists
      const dirPath = path.dirname(fullPath);
      if (!fs.existsSync(dirPath)) {
        await mkdir(dirPath, { recursive: true });
      }

      // Write file content
      await writeFile(fullPath, content, 'utf8');
    } catch (error) {
      console.error(`Error writing file: ${error}`);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to write file: ${errorMessage}`);
    }
  }

  /**
   * Create a new directory
   */
  async createDirectory(roomId: string, dirPath: string): Promise<void> {
    try {
      const roomDir = this.getRoomDir(roomId);
      const fullPath = path.join(roomDir, dirPath);

      // Create directory
      await mkdir(fullPath, { recursive: true });
    } catch (error) {
      console.error(`Error creating directory: ${error}`);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create directory: ${errorMessage}`);
    }
  }

  /**
   * Delete a file or directory
   */
  async deleteFile(roomId: string, filePath: string): Promise<void> {
    try {
      const roomDir = this.getRoomDir(roomId);
      const fullPath = path.join(roomDir, filePath);

      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Check if it's a directory
      const stats = await stat(fullPath);
      if (stats.isDirectory()) {
        // Remove directory recursively
        fs.rmdirSync(fullPath, { recursive: true });
      } else {
        // Remove file
        fs.unlinkSync(fullPath);
      }
    } catch (error) {
      console.error(`Error deleting file: ${error}`);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete file: ${errorMessage}`);
    }
  }
}

export default new FileService();
