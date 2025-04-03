import React, { useState, useEffect } from 'react';
import { FaFolder, FaFile, FaEdit, FaTrash, FaSave, FaPlus, FaFolderPlus } from 'react-icons/fa';
import fileApiService, { FileInfo } from '@/services/fileApiService';
import { toast } from 'react-hot-toast';

interface FileExplorerProps {
  roomId: string;
  onFileSelect?: (file: FileInfo) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ roomId, onFileSelect }) => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  const [isCreatingFile, setIsCreatingFile] = useState<boolean>(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');

  // Load files when component mounts or roomId/currentPath changes
  useEffect(() => {
    loadFiles();
  }, [roomId, currentPath]);

  // Load files from the server
  const loadFiles = async () => {
    if (!roomId) return;
    
    setLoading(true);
    try {
      const fileList = await fileApiService.listFiles(roomId, currentPath);
      setFiles(fileList);
    } catch (error) {
      toast.error(`Failed to load files: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = async (file: FileInfo) => {
    if (file.isDirectory) {
      // Navigate into directory
      setCurrentPath(file.path);
    } else {
      // Select file and load its content
      setSelectedFile(file);
      setIsEditing(false);
      
      try {
        const content = await fileApiService.readFile(roomId, file.path);
        setFileContent(content);
        
        // Call the onFileSelect callback if provided
        if (onFileSelect) {
          onFileSelect(file);
        }
      } catch (error) {
        toast.error(`Failed to read file: ${error.message}`);
      }
    }
  };

  // Handle navigation to parent directory
  const handleNavigateUp = () => {
    if (!currentPath) return;
    
    const pathParts = currentPath.split('/');
    pathParts.pop();
    const parentPath = pathParts.join('/');
    setCurrentPath(parentPath);
  };

  // Handle file editing
  const handleEditFile = () => {
    setIsEditing(true);
  };

  // Handle file saving
  const handleSaveFile = async () => {
    if (!selectedFile) return;
    
    try {
      await fileApiService.writeFile(roomId, selectedFile.path, fileContent);
      setIsEditing(false);
      toast.success('File saved successfully');
      loadFiles();
    } catch (error) {
      toast.error(`Failed to save file: ${error.message}`);
    }
  };

  // Handle file deletion
  const handleDeleteFile = async (file: FileInfo) => {
    if (window.confirm(`Are you sure you want to delete ${file.name}?`)) {
      try {
        await fileApiService.deleteFile(roomId, file.path);
        toast.success('File deleted successfully');
        
        // If the deleted file was selected, clear selection
        if (selectedFile && selectedFile.path === file.path) {
          setSelectedFile(null);
          setFileContent('');
        }
        
        loadFiles();
      } catch (error) {
        toast.error(`Failed to delete file: ${error.message}`);
      }
    }
  };

  // Handle new file creation
  const handleCreateFile = async () => {
    if (!newFileName) {
      toast.error('Please enter a file name');
      return;
    }
    
    try {
      const filePath = currentPath ? `${currentPath}/${newFileName}` : newFileName;
      await fileApiService.writeFile(roomId, filePath, '');
      toast.success('File created successfully');
      setIsCreatingFile(false);
      setNewFileName('');
      loadFiles();
    } catch (error) {
      toast.error(`Failed to create file: ${error.message}`);
    }
  };

  // Handle new folder creation
  const handleCreateFolder = async () => {
    if (!newFolderName) {
      toast.error('Please enter a folder name');
      return;
    }
    
    try {
      const folderPath = currentPath ? `${currentPath}/${newFolderName}` : newFolderName;
      await fileApiService.createDirectory(roomId, folderPath);
      toast.success('Folder created successfully');
      setIsCreatingFolder(false);
      setNewFolderName('');
      loadFiles();
    } catch (error) {
      toast.error(`Failed to create folder: ${error.message}`);
    }
  };

  return (
    <div className="flex h-full">
      {/* File list */}
      <div className="w-1/3 bg-gray-800 p-2 overflow-auto">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Files</h2>
          <div className="flex space-x-2">
            <button
              className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => setIsCreatingFile(true)}
              title="New File"
            >
              <FaPlus size={14} />
            </button>
            <button
              className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
              onClick={() => setIsCreatingFolder(true)}
              title="New Folder"
            >
              <FaFolderPlus size={14} />
            </button>
          </div>
        </div>
        
        {/* Path navigation */}
        <div className="flex items-center mb-2 text-sm bg-gray-700 p-1 rounded">
          <button
            className="mr-1 p-1 hover:bg-gray-600 rounded disabled:opacity-50"
            onClick={handleNavigateUp}
            disabled={!currentPath}
          >
            ..
          </button>
          <span className="truncate">{currentPath || '/'}</span>
        </div>
        
        {/* New file form */}
        {isCreatingFile && (
          <div className="mb-2 p-2 bg-gray-700 rounded">
            <input
              type="text"
              className="w-full p-1 mb-2 bg-gray-800 border border-gray-600 rounded"
              placeholder="File name"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <button
                className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-500"
                onClick={() => {
                  setIsCreatingFile(false);
                  setNewFileName('');
                }}
              >
                Cancel
              </button>
              <button
                className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={handleCreateFile}
              >
                Create
              </button>
            </div>
          </div>
        )}
        
        {/* New folder form */}
        {isCreatingFolder && (
          <div className="mb-2 p-2 bg-gray-700 rounded">
            <input
              type="text"
              className="w-full p-1 mb-2 bg-gray-800 border border-gray-600 rounded"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <button
                className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-500"
                onClick={() => {
                  setIsCreatingFolder(false);
                  setNewFolderName('');
                }}
              >
                Cancel
              </button>
              <button
                className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                onClick={handleCreateFolder}
              >
                Create
              </button>
            </div>
          </div>
        )}
        
        {/* File list */}
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <ul className="space-y-1">
            {files.length === 0 ? (
              <li className="text-gray-400 text-center py-4">No files found</li>
            ) : (
              files.map((file) => (
                <li
                  key={file.path}
                  className={`flex items-center justify-between p-2 rounded hover:bg-gray-700 cursor-pointer ${
                    selectedFile?.path === file.path ? 'bg-gray-700' : ''
                  }`}
                >
                  <div
                    className="flex items-center flex-grow overflow-hidden"
                    onClick={() => handleFileSelect(file)}
                  >
                    {file.isDirectory ? (
                      <FaFolder className="mr-2 text-yellow-400" />
                    ) : (
                      <FaFile className="mr-2 text-blue-400" />
                    )}
                    <span className="truncate">{file.name}</span>
                  </div>
                  <div className="flex space-x-1">
                    {!file.isDirectory && (
                      <button
                        className="p-1 text-gray-400 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileSelect(file);
                          handleEditFile();
                        }}
                        title="Edit"
                      >
                        <FaEdit size={14} />
                      </button>
                    )}
                    <button
                      className="p-1 text-gray-400 hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(file);
                      }}
                      title="Delete"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      
      {/* File content */}
      <div className="w-2/3 bg-gray-900 p-2 overflow-auto">
        {selectedFile ? (
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold truncate">{selectedFile.name}</h2>
              {isEditing ? (
                <button
                  className="p-1 bg-green-500 text-white rounded hover:bg-green-600 flex items-center"
                  onClick={handleSaveFile}
                >
                  <FaSave className="mr-1" size={14} />
                  Save
                </button>
              ) : (
                <button
                  className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
                  onClick={handleEditFile}
                >
                  <FaEdit className="mr-1" size={14} />
                  Edit
                </button>
              )}
            </div>
            {isEditing ? (
              <textarea
                className="flex-grow p-2 bg-gray-800 text-white font-mono resize-none border border-gray-700 rounded"
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
              />
            ) : (
              <pre className="flex-grow p-2 bg-gray-800 text-white font-mono overflow-auto border border-gray-700 rounded">
                {fileContent}
              </pre>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            Select a file to view its content
          </div>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
