import { ReactNode } from "react"
import { AppContextProvider } from "./AppContext.js"
import { ChatContextProvider } from "./ChatContext.jsx"
import { FileContextProvider } from "./FileContext.jsx"
import { MediaContextProvider } from "./MediaContext"
import { RunCodeContextProvider } from "./RunCodeContext.jsx"
import { SettingContextProvider } from "./SettingContext.jsx"
import { SocketProvider } from "./SocketContext.jsx"
import { ViewContextProvider } from "./ViewContext.js"

function AppProvider({ children }: { children: ReactNode }) {
    return (
        <AppContextProvider>
            <SocketProvider>
                <SettingContextProvider>
                    <ViewContextProvider>
                        <FileContextProvider>
                            <RunCodeContextProvider>
                                <MediaContextProvider>
                                    <ChatContextProvider>
                                        {children}
                                    </ChatContextProvider>
                                </MediaContextProvider>
                            </RunCodeContextProvider>
                        </FileContextProvider>
                    </ViewContextProvider>
                </SettingContextProvider>
            </SocketProvider>
        </AppContextProvider>
    )
}

export default AppProvider
