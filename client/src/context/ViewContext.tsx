import ChatsView from "@/components/sidebar/sidebar-views/ChatsView"
import FilesView from "@/components/sidebar/sidebar-views/FilesView"
import FilesExplorerView from "@/components/sidebar/sidebar-views/FilesExplorerView"
import RunView from "@/components/sidebar/sidebar-views/RunView"
import SettingsView from "@/components/sidebar/sidebar-views/SettingsView"
import UsersView from "@/components/sidebar/sidebar-views/UsersView"
import VoiceVideoView from "@/components/sidebar/sidebar-views/VoiceVideoView"
import TerminalView from "@/components/sidebar/sidebar-views/TerminalView"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { VIEWS, ViewContext as ViewContextType } from "@/types/view"
import { ReactNode, createContext, useContext, useState } from "react"
import { IoSettingsOutline } from "react-icons/io5"
import { LuFiles, LuFolderOpen } from "react-icons/lu"
import { PiChats, PiPlay, PiUsers } from "react-icons/pi"
import { BsCameraVideo } from "react-icons/bs"
import { VscTerminalCmd } from "react-icons/vsc"

const ViewContext = createContext<ViewContextType | null>(null)

export const useViews = (): ViewContextType => {
    const context = useContext(ViewContext)
    if (!context) {
        throw new Error("useViews must be used within a ViewContextProvider")
    }
    return context
}

function ViewContextProvider({ children }: { children: ReactNode }) {
    const { isMobile } = useWindowDimensions()
    const [activeView, setActiveView] = useState<VIEWS>(VIEWS.FILES)
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(!isMobile)
    const [viewComponents] = useState({
        [VIEWS.FILES]: <FilesView />,
        [VIEWS.FILES_EXPLORER]: <FilesExplorerView />,
        [VIEWS.CLIENTS]: <UsersView />,
        [VIEWS.SETTINGS]: <SettingsView />,
        [VIEWS.CHATS]: <ChatsView />,
        [VIEWS.RUN]: <RunView />,
        [VIEWS.CALLS]: <VoiceVideoView />,
        [VIEWS.TERMINAL]: <TerminalView />,
    })
    const [viewIcons] = useState({
        [VIEWS.FILES]: <LuFiles size={28} />,
        [VIEWS.FILES_EXPLORER]: <LuFolderOpen size={28} />,
        [VIEWS.CLIENTS]: <PiUsers size={30} />,
        [VIEWS.SETTINGS]: <IoSettingsOutline size={28} />,
        [VIEWS.CHATS]: <PiChats size={30} />,
        [VIEWS.RUN]: <PiPlay size={28} />,
        [VIEWS.CALLS]: <BsCameraVideo size={28} />,
        [VIEWS.TERMINAL]: <VscTerminalCmd size={28} />,
    })

    return (
        <ViewContext.Provider
            value={{
                activeView,
                setActiveView,
                isSidebarOpen,
                setIsSidebarOpen,
                viewComponents,
                viewIcons,
            }}
        >
            {children}
        </ViewContext.Provider>
    )
}

export { ViewContextProvider }
export default ViewContext
