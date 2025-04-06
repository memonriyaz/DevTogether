import FileStructureView from "@/components/files/FileStructureView"
import { useFileSystem } from "@/context/FileContext"
import useResponsive from "@/hooks/useResponsive"
import { FileSystemItem } from "@/types/file"
import cn from "classnames"
import { BiArchiveIn } from "react-icons/bi"
import { TbFileUpload } from "react-icons/tb"
import { FaServer } from "react-icons/fa"
import { v4 as uuidV4 } from "uuid"
import { toast } from "react-hot-toast"
import { useAppContext } from "@/context/AppContext"
import { useEffect, useState } from "react"
import axios from "axios"

// Backend URL for file operations
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

function FilesView() {
    const { downloadFilesAndFolders, updateDirectory } = useFileSystem()
    const { viewHeight } = useResponsive()
    const { minHeightReached } = useResponsive()
    const { currentUser } = useAppContext()
    const [isLoading, setIsLoading] = useState(false)

    const handleOpenDirectory = async () => {
        if ("showDirectoryPicker" in window) {
            try {
                const directoryHandle = await window.showDirectoryPicker()
                toast.loading("Getting files and folders...")
                const structure = await readDirectory(directoryHandle)
                updateDirectory("", structure)
            } catch (error) {
                console.error("Error opening directory:", error)
            }
        } else {
            alert(
                "The File System Access API is not supported in this browser.",
            )
        }
    }

    const readDirectory = async (
        directoryHandle: FileSystemDirectoryHandle,
    ): Promise<FileSystemItem[]> => {
        const children: FileSystemItem[] = []
        const blackList = ["node_modules", ".git", ".vscode", ".next"]

        for await (const entry of directoryHandle.values()) {
            if (entry.kind === "file") {
                const file = await entry.getFile()
                const newFile: FileSystemItem = {
                    id: uuidV4(),
                    name: entry.name,
                    type: "file",
                    content: await file.text(),
                }
                children.push(newFile)
            } else if (entry.kind === "directory") {
                if (blackList.includes(entry.name)) continue

                const newDirectory: FileSystemItem = {
                    id: uuidV4(),
                    name: entry.name,
                    type: "directory",
                    children: await readDirectory(entry),
                    isOpen: false,
                }
                children.push(newDirectory)
            }
        }
        return children
    }

    // Function to load files from server
    const loadFilesFromServer = async () => {
        if (!currentUser?.roomId) {
            toast.error('No room ID available');
            return;
        }

        setIsLoading(true);
        try {
            // Get the list of files from the server
            const response = await axios.get(`${BACKEND_URL}api/files/list/${currentUser.roomId}`);

            if (response.data.success && response.data.files.length > 0) {
                // Process the files and update the file structure
                const serverFiles = response.data.files;

                // Create a new directory structure for the server files
                const serverDir: FileSystemItem = {
                    id: uuidV4(),
                    name: `Room: ${currentUser.roomId}`,
                    type: 'directory',
                    isOpen: true,
                    children: []
                };

                // Add each file to the directory structure
                for (const file of serverFiles) {
                    if (file.isDirectory) {
                        // Add directory
                        const dirId = uuidV4();
                        const newDir: FileSystemItem = {
                            id: dirId,
                            name: file.name,
                            type: 'directory',
                            isOpen: false,
                            children: [],
                        };

                        // Add to server directory
                        if (serverDir.children) {
                            serverDir.children.push(newDir);
                        }
                    } else {
                        // Add file
                        const fileId = uuidV4();
                        const newFile: FileSystemItem = {
                            id: fileId,
                            name: file.name,
                            type: 'file',
                            content: '',
                            path: file.path, // Store the path for later use
                        };

                        // Add to server directory
                        if (serverDir.children) {
                            serverDir.children.push(newFile);
                        }

                        // Load file content
                        try {
                            const contentResponse = await axios.get(`${BACKEND_URL}/api/files/read/${currentUser.roomId}`, {
                                params: { path: file.path }
                            });

                            if (contentResponse.data.success) {
                                console.log(`Loaded content for ${file.name} from server`);
                                newFile.content = contentResponse.data.content;
                            }
                        } catch (error) {
                            console.error(`Error loading file content: ${error}`);
                        }
                    }
                }

                // Update the file structure with the server directory
                updateDirectory('', [serverDir]);
                toast.success(`Loaded ${serverFiles.length} files from server`);
            } else {
                toast('No files found on server');
            }
        } catch (error) {
            console.error(`Error loading files from server: ${error}`);
            toast.error(`Failed to load files from server: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Load files from server when component mounts
    useEffect(() => {
        if (currentUser?.roomId) {
            loadFilesFromServer();
        }
    }, [currentUser?.roomId]);

    return (
        <div
            className="flex select-none flex-col gap-1 px-4 py-2"
            style={{ height: viewHeight, maxHeight: viewHeight }}
        >
            <FileStructureView />
            <div
                className={cn(`flex min-h-fit flex-col justify-end pt-2`, {
                    hidden: minHeightReached,
                })}
            >
                <hr />
                <button
                    className="mt-2 flex w-full justify-start rounded-md p-2 transition-all hover:bg-darkHover"
                    onClick={handleOpenDirectory}
                >
                    <TbFileUpload className="mr-2" size={24} />
                    Open File/Folder
                </button>
                <button
                    className="flex w-full justify-start rounded-md p-2 transition-all hover:bg-darkHover"
                    onClick={downloadFilesAndFolders}
                >
                    <BiArchiveIn className="mr-2" size={22} /> Download Code
                </button>
                <button
                    className="flex w-full justify-start rounded-md p-2 transition-all hover:bg-darkHover"
                    onClick={loadFilesFromServer}
                    disabled={isLoading}
                >
                    <FaServer className="mr-2" size={20} /> {isLoading ? 'Loading...' : 'Load Server Files'}
                </button>
            </div>
        </div>
    )
}

export default FilesView
