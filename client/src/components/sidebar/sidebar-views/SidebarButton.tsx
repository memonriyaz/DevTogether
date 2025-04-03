import { useChatRoom } from "@/context/ChatContext"
import { useViews } from "@/context/ViewContext"
import { VIEWS } from "@/types/view"

interface ViewButtonProps {
    viewName: VIEWS
    icon: JSX.Element
}

const ViewButton = ({ viewName, icon }: ViewButtonProps) => {
    const { activeView, setActiveView, isSidebarOpen, setIsSidebarOpen } =
        useViews()
    const { isNewMessage } = useChatRoom()

    const handleViewClick = (viewName: VIEWS) => {
        if (viewName === activeView) {
            setIsSidebarOpen(!isSidebarOpen)
        } else {
            setIsSidebarOpen(true)
            setActiveView(viewName)
        }
    }

    // Get the label for the view
    const getViewLabel = () => {
        switch (viewName) {
            case VIEWS.FILES:
                return 'Files';
            case VIEWS.FILES_EXPLORER:
                return 'Files Explorer';
            case VIEWS.CHATS:
                return 'Chats';
            case VIEWS.CLIENTS:
                return 'Users';
            case VIEWS.RUN:
                return 'Run';
            case VIEWS.SETTINGS:
                return 'Settings';
            case VIEWS.CALLS:
                return 'Calls';
            case VIEWS.TERMINAL:
                return 'Terminal';
            default:
                return viewName;
        }
    };

    return (
        <button
            onClick={() => handleViewClick(viewName)}
            className="relative flex items-center justify-center"
            title={getViewLabel()}
        >
            {icon}
            {/* Show dot for new message in chat View Button */}
            {viewName === VIEWS.CHATS && isNewMessage && (
                <div className="absolute right-0 top-0 h-3 w-3 rounded-full bg-primary"></div>
            )}
        </button>
    )
}

export default ViewButton
