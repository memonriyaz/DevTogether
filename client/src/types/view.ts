enum VIEWS {
    FILES = "FILES",
    FILES_EXPLORER = "FILES_EXPLORER",
    CHATS = "CHATS",
    CLIENTS = "CLIENTS",
    RUN = "RUN",
    SETTINGS = "SETTINGS",
    CALLS = "CALLS",
    TERMINAL = "TERMINAL",
}

interface ViewContext {
    activeView: VIEWS
    setActiveView: (activeView: VIEWS) => void
    isSidebarOpen: boolean
    setIsSidebarOpen: (isSidebarOpen: boolean) => void
    viewComponents: { [key in VIEWS]: JSX.Element }
    viewIcons: { [key in VIEWS]: JSX.Element }
}

export { VIEWS, ViewContext }
