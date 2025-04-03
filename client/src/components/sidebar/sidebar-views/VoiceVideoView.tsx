import ChannelList from "@/components/media/ChannelList"
import MediaControls from "@/components/media/MediaControls"
import VideoGrid from "@/components/media/VideoGrid"
import { useMedia } from "@/context/MediaContext"
import useResponsive from "@/hooks/useResponsive"
import { useState } from "react"

function VoiceVideoView() {
    const { viewHeight } = useResponsive()
    const { activeChannel } = useMedia()
    const [isFullScreen, setIsFullScreen] = useState(false)

    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen)
    }

    // If in fullscreen mode, only show the video grid
    if (isFullScreen && activeChannel) {
        return (
            <>
                <VideoGrid isFullScreen={true} onToggleFullScreen={toggleFullScreen} />
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
                    <MediaControls />
                </div>
            </>
        )
    }

    // Normal sidebar view
    return (
        <div
            className="flex max-h-full min-h-[400px] w-full flex-col gap-2 p-4"
            style={{ height: viewHeight }}
        >
            <h1 className="view-title">Voice & Video Calls</h1>

            <div className="flex-grow flex flex-col md:flex-row gap-4">
                {/* Channel list */}
                <div className="w-full md:w-1/3 bg-dark rounded-md p-3">
                    <ChannelList />
                </div>

                {/* Video grid or active channel info */}
                <div className="w-full md:w-2/3 bg-dark rounded-md p-3 flex flex-col">
                    {activeChannel ? (
                        <>
                            <div className="flex-grow">
                                <VideoGrid isFullScreen={false} onToggleFullScreen={toggleFullScreen} />
                            </div>
                            <div className="mt-2">
                                <MediaControls />
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-lg text-white">Select a channel to join</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default VoiceVideoView
