import { useFileSystem } from "@/context/FileContext"
import useResponsive from "@/hooks/useResponsive"
import cn from "classnames"
import Editor from "./Editor"
import { useState, useEffect } from "react";
import FileTab from "./FileTab"
import Terminal from "@/components/terminal/Terminal.tsx";

function EditorComponent() {
    const { openFiles } = useFileSystem()
    const { minHeightReached } = useResponsive()
    const [socket, setSocket] = useState<WebSocket | null>(null);
    
    useEffect(() => {
        const ws = new WebSocket("ws://139.59.74.236:80/terminal");
        ws.onopen = () => {
          console.log("connected");
        };
        setSocket(ws);
        return () => {
          ws.close();
        };
      }, []);

    if (openFiles.length <= 0) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <h1 className="text-xl text-white">
                    No file is currently open.
                </h1>
            </div>
        )
    }

    return (
        <main
            className={cn("flex w-full flex-col overflow-x-auto md:h-screen", {
                "h-[calc(100vh-50px)]": !minHeightReached,
                "h-full": minHeightReached,
            })}
        >
            <FileTab />
            <Editor />
            <Terminal width="full" socket={socket} setFiles={setFiles} />
        </main>
    )
}

export default EditorComponent
