import React, { useEffect, useRef, useMemo } from "react"
import { useMedia } from "@/context/MediaContext"
import { useAppContext } from "@/context/AppContext"
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa"
import { BsCameraVideo, BsCameraVideoOff } from "react-icons/bs"
import { MdFullscreen, MdFullscreenExit } from "react-icons/md"
import { MediaStatus } from "@/types/media"
import { RemoteUser } from "@/types/user"

interface VideoGridProps {
    isFullScreen?: boolean;
    onToggleFullScreen?: () => void;
}

function VideoGrid({ isFullScreen = false, onToggleFullScreen }: VideoGridProps) {
    const { localStream, connections, isMicOn, isCameraOn, activeChannel } = useMedia()
    const { currentUser } = useAppContext()
    const localVideoRef = useRef<HTMLVideoElement>(null)
    const gridRef = useRef<HTMLDivElement>(null)

    // Create a stable array of connection entries to use in effects
    const connectionEntries = useMemo(() =>
        Object.entries(connections),
        [connections]
    )

    // Create refs for each connection outside of the render loop
    const videoRefs = useRef<{[key: string]: React.RefObject<HTMLVideoElement>}>({})

    // Initialize or update refs for new connections
    useEffect(() => {
        // Create refs for any new connections
        connectionEntries.forEach(([username]) => {
            if (!videoRefs.current[username]) {
                videoRefs.current[username] = React.createRef<HTMLVideoElement>()
            }
        })
    }, [connectionEntries])

    // Handle local video stream
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream
        }
    }, [localStream])

    // Handle remote video streams
    useEffect(() => {
        connectionEntries.forEach(([username, connection]) => {
            const videoRef = videoRefs.current[username]?.current
            if (videoRef && connection.stream) {
                console.log(`Setting stream for ${username} with ${connection.stream.getTracks().length} tracks`)

                // Log track information for debugging
                connection.stream.getTracks().forEach(track => {
                    console.log(`Remote track: ${track.kind}, enabled: ${track.enabled}, muted: ${track.muted}, readyState: ${track.readyState}`)
                })

                // Set the stream as the source object
                videoRef.srcObject = connection.stream

                // Add event listeners for debugging
                videoRef.onloadedmetadata = () => {
                    console.log(`Video metadata loaded for ${username}`)
                    // Force play the video
                    const playPromise = videoRef.play()
                    if (playPromise) {
                        playPromise.catch(e => {
                            console.error(`Error playing video for ${username}:`, e)
                            // Try again after a short delay
                            setTimeout(() => {
                                videoRef.play().catch(e2 =>
                                    console.error(`Retry error playing video for ${username}:`, e2)
                                )
                            }, 1000)
                        })
                    }
                }

                videoRef.onplay = () => {
                    console.log(`Video playing for ${username}`)
                }

                videoRef.onerror = (e) => {
                    console.error(`Video error for ${username}:`, e)
                }
            }
        })
    }, [connectionEntries])

    // If no active channel, show a message
    if (!activeChannel) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <p className="text-lg text-white">Join a channel to start a call</p>
            </div>
        )
    }

    // We now only have combined channels, so voice-only mode is disabled
    const isVoiceOnly = false

    // Helper function to get connection status color
    const getStatusColor = (status: MediaStatus) => {
        switch (status) {
            case MediaStatus.CONNECTED:
                return "bg-green-500";
            case MediaStatus.CONNECTING:
                return "bg-yellow-500";
            case MediaStatus.DISCONNECTED:
            case MediaStatus.ERROR:
                return "bg-red-500";
            default:
                return "bg-gray-500";
        }
    };

    return (
        <div
            ref={gridRef}
            className={`flex flex-col ${isFullScreen ? 'fixed inset-0 z-50 bg-dark' : 'h-full'}`}
        >
            <div className="flex justify-between items-center p-2 bg-darkHover">
                <h3 className="text-lg font-semibold">{activeChannel.name}</h3>
                {onToggleFullScreen && (
                    <button
                        onClick={onToggleFullScreen}
                        className="p-2 rounded-full hover:bg-dark"
                        title={isFullScreen ? "Exit fullscreen" : "Enter fullscreen"}
                    >
                        {isFullScreen ? <MdFullscreenExit size={20} /> : <MdFullscreen size={20} />}
                    </button>
                )}
            </div>
            <div className="flex-grow overflow-auto p-2">
                {isVoiceOnly ? (
                    // Voice channel layout - just show participant names and mic status
                    <div className="grid grid-cols-2 gap-4">
                        {/* Local user */}
                        <div className="flex items-center p-4 bg-darkHover rounded-md">
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-black font-bold">
                                {currentUser.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-3 flex-grow">
                                <p className="text-white">{currentUser.username} (You)</p>
                            </div>
                            <div>
                                {isMicOn ? (
                                    <FaMicrophone className="text-primary" />
                                ) : (
                                    <FaMicrophoneSlash className="text-red-500" />
                                )}
                            </div>
                        </div>

                        {/* Remote users */}
                        {connectionEntries.map(([username, connection]) => (
                            <div key={username} className="flex items-center p-4 bg-darkHover rounded-md">
                                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-black font-bold">
                                    {username.charAt(0).toUpperCase()}
                                </div>
                                <div className="ml-3 flex-grow">
                                    <p className="text-white">{username}</p>
                                </div>
                                <div>
                                    {(connection.user as RemoteUser).isMicOn ? (
                                        <FaMicrophone className="text-primary" />
                                    ) : (
                                        <FaMicrophoneSlash className="text-red-500" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    // Video channel layout - show video streams
                    <div className={`grid gap-4 ${isFullScreen
                        ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                        {/* Local video */}
                        <div className="relative">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className={`w-full h-full object-cover rounded-md ${
                                    (!isCameraOn || !localStream || !localStream.getVideoTracks().length) && "hidden"
                                }`}
                            />
                            {(!isCameraOn || !localStream || !localStream.getVideoTracks().length) && (
                                <div className="w-full h-full min-h-[200px] bg-darkHover rounded-md flex items-center justify-center">
                                    <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-black text-2xl font-bold">
                                        {currentUser.username.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                            )}
                            <div className="absolute bottom-2 left-2 flex gap-2">
                                <div className={`p-1 rounded-full ${isMicOn ? "bg-primary" : "bg-red-500"}`}>
                                    {isMicOn ? (
                                        <FaMicrophone size={12} className="text-black" />
                                    ) : (
                                        <FaMicrophoneSlash size={12} className="text-white" />
                                    )}
                                </div>
                                <div className={`p-1 rounded-full ${isCameraOn ? "bg-primary" : "bg-red-500"}`}>
                                    {isCameraOn ? (
                                        <BsCameraVideo size={12} className="text-black" />
                                    ) : (
                                        <BsCameraVideoOff size={12} className="text-white" />
                                    )}
                                </div>
                            </div>
                            <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 px-2 py-1 rounded text-xs">
                                {currentUser.username} (You)
                            </div>
                        </div>

                        {/* Remote videos */}
                        {connectionEntries.map(([username, connection]) => (
                            <div key={username} className="relative">
                                {/* Connection status indicator */}
                                <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                                    <div className={`w-3 h-3 rounded-full ${getStatusColor(connection.status)}`}></div>
                                    <span className="text-xs bg-black bg-opacity-50 px-1 rounded">
                                        {connection.status}
                                    </span>
                                </div>

                                {/* Video element */}
                                <video
                                    ref={videoRefs.current[username]}
                                    autoPlay
                                    playsInline
                                    muted={false}
                                    controls={false}
                                    className={`w-full h-full object-cover rounded-md ${
                                        (!(connection.user as RemoteUser).isCameraOn || !connection.stream || !connection.stream.getVideoTracks().length) && "hidden"
                                    }`}
                                />

                                {/* Placeholder when video is off or not available */}
                                {(!(connection.user as RemoteUser).isCameraOn || !connection.stream || !connection.stream.getVideoTracks().length) && (
                                    <div className="w-full h-full min-h-[200px] bg-darkHover rounded-md flex flex-col items-center justify-center">
                                        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-black text-2xl font-bold mb-2">
                                            {username.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="text-sm text-center px-2">
                                            {!connection.stream && connection.status !== MediaStatus.CONNECTED ?
                                                `Connecting to ${username}...` :
                                                connection.stream && !connection.stream.getVideoTracks().length ?
                                                `${username} (No video track)` :
                                                `${username} (Camera off)`
                                            }
                                        </div>
                                    </div>
                                )}

                                {/* Media controls indicators */}
                                <div className="absolute bottom-2 left-2 flex gap-2">
                                    <div
                                        className={`p-1 rounded-full ${
                                            (connection.user as RemoteUser).isMicOn ? "bg-primary" : "bg-red-500"
                                        }`}
                                    >
                                        {(connection.user as RemoteUser).isMicOn ? (
                                            <FaMicrophone size={12} className="text-black" />
                                        ) : (
                                            <FaMicrophoneSlash size={12} className="text-white" />
                                        )}
                                    </div>
                                    <div
                                        className={`p-1 rounded-full ${
                                            (connection.user as RemoteUser).isCameraOn ? "bg-primary" : "bg-red-500"
                                        }`}
                                    >
                                        {(connection.user as RemoteUser).isCameraOn ? (
                                            <BsCameraVideo size={12} className="text-black" />
                                        ) : (
                                            <BsCameraVideoOff size={12} className="text-white" />
                                        )}
                                    </div>
                                </div>

                                {/* Username display */}
                                <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 px-2 py-1 rounded text-xs">
                                    {username}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default VideoGrid