import { Router, Request, Response } from 'express';
import fileService from '../services/fileService';

const router = Router();

// List files in a directory
router.get('/list/:roomId', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { dir } = req.query;

    const files = await fileService.listFiles(roomId, dir as string || '');
    res.json({ success: true, files });
  } catch (error) {
    console.error(`Error listing files: ${error}`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Read a file
router.get('/read/:roomId', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { path } = req.query;

    if (!path) {
      return res.status(400).json({ success: false, error: 'File path is required' });
    }

    const content = await fileService.readFile(roomId, path as string);
    res.json({ success: true, content });
  } catch (error) {
    console.error(`Error reading file: ${error}`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Write to a file
router.post('/write/:roomId', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { path, content } = req.body;

    if (!path) {
      return res.status(400).json({ success: false, error: 'File path is required' });
    }

    await fileService.writeFile(roomId, path, content || '');
    res.json({ success: true });
  } catch (error) {
    console.error(`Error writing file: ${error}`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Create a directory
router.post('/mkdir/:roomId', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { path } = req.body;

    if (!path) {
      return res.status(400).json({ success: false, error: 'Directory path is required' });
    }

    await fileService.createDirectory(roomId, path);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error creating directory: ${error}`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Delete a file or directory
router.delete('/delete/:roomId', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { path } = req.query;

    if (!path) {
      return res.status(400).json({ success: false, error: 'File path is required' });
    }

    await fileService.deleteFile(roomId, path as string);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error deleting file: ${error}`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMessage });
  }
});

export default router;
