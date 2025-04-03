import { useFileSystem } from "@/context/FileContext"
import useResponsive from "@/hooks/useResponsive"
import cn from "classnames"
import Editor from "./Editor"
import FileTab from "./FileTab"
import TerminalPanel from "./TerminalPanel"
import { useState } from "react"
import { VscTerminalCmd } from "react-icons/vsc"

function EditorComponent() {
    const { openFiles } = useFileSystem()
    const { minHeightReached } = useResponsive()
    const [isTerminalVisible, setIsTerminalVisible] = useState(false)

    const toggleTerminal = () => {
        setIsTerminalVisible(!isTerminalVisible)
    }

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
            className={cn("flex w-full flex-col overflow-x-auto md:h-screen relative", {
                "h-[calc(100vh-50px)]": !minHeightReached,
                "h-full": minHeightReached,
            })}
        >
            <FileTab />
            <Editor />

            {/* Terminal toggle button */}
            <button
                className="absolute bottom-4 right-4 p-2 bg-primary text-black rounded-full shadow-lg hover:bg-primary-dark z-20"
                onClick={toggleTerminal}
                title={isTerminalVisible ? "Hide Terminal" : "Show Terminal"}
            >
                <VscTerminalCmd size={20} />
            </button>

            {/* Terminal panel */}
            <TerminalPanel
                isVisible={isTerminalVisible}
                onClose={() => setIsTerminalVisible(false)}
            />
        </main>
    )
}

export default EditorComponent
