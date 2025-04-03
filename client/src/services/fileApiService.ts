import axios from 'axios';

// Get the backend URL from environment variables or use default
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  lastModified: Date;
}

export class FileApiService {
  /**
   * List files in a directory
   */
  async listFiles(roomId: string, dir: string = ''): Promise<FileInfo[]> {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/files/list/${roomId}`, {
        params: { dir }
      });

      if (response.data.success) {
        return response.data.files;
      } else {
        throw new Error(response.data.error || 'Failed to list files');
      }
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  /**
   * Read a file
   */
  async readFile(roomId: string, filePath: string): Promise<string> {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/files/read/${roomId}`, {
        params: { path: filePath }
      });

      if (response.data.success) {
        return response.data.content;
      } else {
        throw new Error(response.data.error || 'Failed to read file');
      }
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }

  /**
   * Write to a file
   */
  async writeFile(roomId: string, filePath: string, content: string): Promise<void> {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/files/write/${roomId}`, {
        path: filePath,
        content
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to write file');
      }
    } catch (error) {
      console.error('Error writing file:', error);
      throw error;
    }
  }

  /**
   * Create a directory
   */
  async createDirectory(roomId: string, dirPath: string): Promise<void> {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/files/mkdir/${roomId}`, {
        path: dirPath
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create directory');
      }
    } catch (error) {
      console.error('Error creating directory:', error);
      throw error;
    }
  }

  /**
   * Delete a file or directory
   */
  async deleteFile(roomId: string, filePath: string): Promise<void> {
    try {
      const response = await axios.delete(`${BACKEND_URL}/api/files/delete/${roomId}`, {
        params: { path: filePath }
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
}

export default new FileApiService();
