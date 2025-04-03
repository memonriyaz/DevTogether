import {
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    useRef,
} from "react"
import { useSocket } from "./SocketContext"
import { useAppContext } from "./AppContext"
import { SocketEvent } from "@/types/socket"
import {
    Channel,
    ChannelType,
    MediaConnection,
    MediaContextType,
    MediaStatus,
} from "@/types/media"
import { toast } from "react-hot-toast"
import { v4 as uuidV4 } from "uuid"
import { createPeerConnection, isWebRTCSupported } from "@/utils/webrtc"

const MediaContext = createContext<MediaContextType | null>(null)

export const useMedia = (): MediaContextType => {
    const context = useContext(MediaContext)
    if (!context) {
        throw new Error("useMedia must be used within a MediaContextProvider")
    }
    return context
}

function MediaContextProvider({ children }: { children: ReactNode }) {
    const { socket } = useSocket()
    const { currentUser, users, setUsers } = useAppContext()

    // Media state
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [connections, setConnections] = useState<Record<string, MediaConnection>>({})
    const [isMicOn, setIsMicOn] = useState<boolean>(false)
    const [isCameraOn, setIsCameraOn] = useState<boolean>(false)
    const [activeChannel, setActiveChannel] = useState<Channel | null>(null)
    const [channels, setChannels] = useState<Channel[]>([])
    const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false)
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null)

    // Create refs for functions to avoid circular dependencies
    const leaveChannelRef = useRef<() => Promise<void>>(async () => {})

    // Initialize default channels
    useEffect(() => {
        if (channels.length === 0) {
            setChannels([
                {
                    id: "general-channel",
                    name: "General Channel",
                    type: ChannelType.COMBINED,
                    participants: [],
                    createdAt: Date.now(),
                    description: "General communication channel"
                },
                {
                    id: "team-channel",
                    name: "Team Channel",
                    type: ChannelType.COMBINED,
                    participants: [],
                    createdAt: Date.now(),
                    description: "Team communication channel"
                },
            ])
        }
    }, [channels.length])

    // Handle media signals and errors
    useEffect(() => {
        // Handle media errors
        const handleMediaError = ({ error, target, type }: { error: string; target: string; type: string }) => {
            console.error(`Media error: ${error} for ${type} to ${target}`);
            toast.error(`Connection error: ${error}`);

            // Clean up any pending connections
            setConnections(prev => {
                const newConnections = { ...prev };
                // Find the connection with this target socket ID
                const username = Object.keys(newConnections).find(u => {
                    const user = users.find(user => user.username === u);
                    return user && (user as any).socketId === target;
                });

                if (username) {
                    console.log(`Cleaning up connection to ${username} due to error`);
                    if (newConnections[username]) {
                        newConnections[username].peer.close();
                        delete newConnections[username];
                    }
                }

                return newConnections;
            });
        };

        // Handle media signals
        const handleMediaSignal = async ({ signal, from, username, type }: { signal: any; from: string; username: string; type: 'offer' | 'answer' | 'ice-candidate' }) => {
            console.log(`Received ${type} from ${username}:`, signal);

            const user = users.find(u => u.username === username);
            if (!user) {
                console.error(`User ${username} not found in users list`);
                return;
            }

            // Skip processing signals if we're not in a channel
            if (!activeChannel) {
                console.log(`Ignoring signal from ${username} because we're not in a channel`);
                return;
            }

            // If we already have a connection with this user, handle the signal
            if (connections[username]) {
                try {
                    if (type === 'ice-candidate') {
                        await connections[username].peer.addIceCandidate(signal);
                    } else if (type === 'offer' || type === 'answer') {
                        await connections[username].peer.setRemoteDescription(signal);

                        // If we received an offer, we need to create an answer
                        if (type === 'offer') {
                            console.log(`Creating answer for ${username}`);
                            const answer = await connections[username].peer.createAnswer(signal);
                            socket.emit(SocketEvent.MEDIA_SIGNAL, {
                                signal: answer,
                                to: from,
                                username: currentUser.username,
                                type: 'answer'
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Error handling ${type} from ${username}:`, error);
                }
            } else {
                console.log(`Creating new peer connection for ${username}`);
                // Create a new peer connection if we don't have one
                const peer = createPeerConnection(false);

                // Set up connection state change handling
                peer.onConnectionStateChange((state) => {
                    console.log(`Connection state with ${username} changed to ${state}`);
                    if (state === 'connected') {
                        setConnections(prev => ({
                            ...prev,
                            [username]: {
                                ...prev[username],
                                status: MediaStatus.CONNECTED,
                            },
                        }));
                    } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                        setConnections(prev => {
                            if (!prev[username]) return prev;
                            return {
                                ...prev,
                                [username]: {
                                    ...prev[username],
                                    status: MediaStatus.DISCONNECTED,
                                },
                            };
                        });
                    }
                });

                // Set up ice candidate handling
                peer.onIceCandidate((candidate) => {
                    console.log(`Sending ICE candidate to ${username}`);
                    socket.emit(SocketEvent.MEDIA_SIGNAL, {
                        signal: candidate,
                        to: from,
                        username: currentUser.username,
                        type: 'ice-candidate'
                    });
                });

                // Set up stream handling
                peer.onTrack((stream) => {
                    console.log(`Received stream from ${username}`);
                    setConnections(prev => {
                        if (!prev[username]) return prev;
                        return {
                            ...prev,
                            [username]: {
                                ...prev[username],
                                stream,
                                status: MediaStatus.CONNECTED,
                                hasVideo: stream.getVideoTracks().length > 0,
                                hasAudio: stream.getAudioTracks().length > 0,
                            },
                        };
                    });
                });

                // Add the new connection to our state
                setConnections(prev => ({
                    ...prev,
                    [username]: {
                        peer,
                        stream: null,
                        user,
                        status: MediaStatus.CONNECTING,
                        hasVideo: false,
                        hasAudio: false,
                    },
                }))

                // Set a timeout to detect stalled connections
                const connectionTimeout = setTimeout(() => {
                    // Check if the connection is still in connecting state
                    setConnections(prev => {
                        if (prev[username]?.status === MediaStatus.CONNECTING) {
                            console.error(`Connection to ${username} timed out`);
                            toast.error(`Connection to ${username} timed out. Try rejoining the channel.`);

                            // Close the peer connection
                            prev[username].peer.close();

                            // Remove the connection
                            const newConnections = { ...prev };
                            delete newConnections[username];
                            return newConnections;
                        }
                        return prev;
                    });
                }, 15000); // 15 seconds timeout;

                // Add our local stream tracks to the peer connection
                if (localStream) {
                    console.log(`Adding local tracks to connection with ${username}`);
                    const videoTracks = localStream.getVideoTracks();
                    const audioTracks = localStream.getAudioTracks();

                    console.log(`Local stream has ${videoTracks.length} video tracks and ${audioTracks.length} audio tracks`);

                    // Log track information
                    localStream.getTracks().forEach(track => {
                        console.log(`Local track: ${track.kind}, enabled: ${track.enabled}, muted: ${track.muted}, readyState: ${track.readyState}`);
                    });

                    // Make sure video tracks are enabled
                    videoTracks.forEach(track => {
                        track.enabled = true;
                    });

                    // Add all tracks to the peer connection
                    localStream.getTracks().forEach(track => {
                        peer.addTrack(track, localStream);
                    });
                } else {
                    console.warn(`No local stream available when connecting to ${username}`);
                }

                // Handle the received signal
                if (type === 'offer') {
                    console.log(`Creating answer for offer from ${username}`);
                    try {
                        const answer = await peer.createAnswer(signal);
                        socket.emit(SocketEvent.MEDIA_SIGNAL, {
                            signal: answer,
                            to: from,
                            username: currentUser.username,
                            type: 'answer'
                        });
                    } catch (error) {
                        console.error(`Error creating answer for ${username}:`, error);
                    }
                } else if (type === 'ice-candidate') {
                    await peer.addIceCandidate(signal);
                }
            }
        };

        socket.on(SocketEvent.MEDIA_SIGNAL, handleMediaSignal);
        socket.on(SocketEvent.MEDIA_ERROR, handleMediaError);
        socket.on(SocketEvent.MEDIA_CONNECTION_FAILED, handleMediaError);

        return () => {
            socket.off(SocketEvent.MEDIA_SIGNAL, handleMediaSignal);
            socket.off(SocketEvent.MEDIA_ERROR, handleMediaError);
            socket.off(SocketEvent.MEDIA_CONNECTION_FAILED, handleMediaError);
        };
    }, [socket, connections, users, currentUser.username, localStream, activeChannel])

    // Handle channel events
    useEffect(() => {
        socket.on(
            SocketEvent.CHANNEL_JOIN,
            ({ channelId, username }: { channelId: string; username: string }) => {
                setChannels(prev =>
                    prev.map(channel =>
                        channel.id === channelId
                            ? { ...channel, participants: [...channel.participants, username] }
                            : channel
                    )
                )

                // If we're in this channel, initiate connection with the new participant
                if (activeChannel?.id === channelId && username !== currentUser.username) {
                    initiateConnection(username)
                }
            },
        )

        socket.on(
            SocketEvent.CHANNEL_LEAVE,
            ({ channelId, username }: { channelId: string; username: string }) => {
                setChannels(prev =>
                    prev.map(channel =>
                        channel.id === channelId
                            ? {
                                ...channel,
                                participants: channel.participants.filter(p => p !== username)
                              }
                            : channel
                    )
                )

                // If we have a connection with this user, close it
                if (connections[username]) {
                    connections[username].peer.close()
                    setConnections(prev => {
                        const newConnections = { ...prev }
                        delete newConnections[username]
                        return newConnections
                    })
                }
            },
        )

        socket.on(
            SocketEvent.CHANNEL_LIST,
            ({ channels }: { channels: Channel[] }) => {
                setChannels(channels)
            },
        )

        socket.on(
            SocketEvent.CHANNEL_CREATE,
            ({ channel }: { channel: Channel }) => {
                setChannels(prev => [...prev, channel])
            },
        )

        socket.on(
            SocketEvent.MEDIA_STATUS_CHANGE,
            ({ username, isMicOn, isCameraOn, activeChannelId }:
                { username: string; isMicOn: boolean; isCameraOn: boolean; activeChannelId: string | null }) => {
                // Update the user's media status
                setUsers(prev =>
                    prev.map(user =>
                        user.username === username
                            ? {
                                ...user,
                                isMicOn,
                                isCameraOn,
                                activeChannelId: activeChannelId as string | undefined
                              }
                            : user
                    )
                )
            },
        )

        return () => {
            socket.off(SocketEvent.MEDIA_SIGNAL)
            socket.off(SocketEvent.CHANNEL_JOIN)
            socket.off(SocketEvent.CHANNEL_LEAVE)
            socket.off(SocketEvent.CHANNEL_LIST)
            socket.off(SocketEvent.CHANNEL_CREATE)
            socket.off(SocketEvent.MEDIA_STATUS_CHANGE)
        }
    }, [socket, connections, users, currentUser.username, localStream, activeChannel])

    // Initialize media stream when joining a channel
    const initializeMediaStream = useCallback(async (video: boolean) => {
        console.log(`Initializing media stream with video=${video}`);
        try {
            // Stop any existing stream
            if (localStream) {
                console.log('Stopping existing local stream tracks');
                localStream.getTracks().forEach(track => {
                    console.log(`Stopping ${track.kind} track`);
                    track.stop();
                });
            }

            console.log('Requesting user media...');
            // Get new media stream with constraints
            const constraints = {
                video: video ? {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user',
                    frameRate: { ideal: 30 }
                } : false,
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };

            console.log('Media constraints:', constraints);
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log(`Got media stream with ${stream.getTracks().length} tracks`);

            // Set initial state of devices
            const videoTrack = stream.getVideoTracks()[0];
            const audioTrack = stream.getAudioTracks()[0];

            if (videoTrack) {
                console.log(`Video track obtained: ${videoTrack.label}`);
                videoTrack.enabled = true; // Always enable initially

                // Apply any constraints to improve video quality
                try {
                    const constraints = { width: 1280, height: 720, frameRate: 30 };
                    await videoTrack.applyConstraints(constraints);
                    console.log('Applied video constraints:', constraints);
                } catch (error) {
                    console.warn('Could not apply video constraints:', error);
                }
            } else {
                console.warn('No video track obtained');
            }

            if (audioTrack) {
                console.log(`Audio track obtained: ${audioTrack.label}`);
                audioTrack.enabled = true; // Always enable initially
            } else {
                console.warn('No audio track obtained');
            }

            setLocalStream(stream);
            return stream;
        } catch (error) {
            console.error("Error accessing media devices:", error);

            // Try fallback to audio only if video fails
            if (video) {
                console.log('Trying fallback to audio only...');
                try {
                    const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
                        video: false,
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true
                        }
                    });

                    console.log('Got audio-only stream');
                    setLocalStream(audioOnlyStream);
                    toast.success('Connected with audio only. Video is disabled.');
                    return audioOnlyStream;
                } catch (audioError) {
                    console.error('Audio fallback also failed:', audioError);
                    toast.error('Could not access microphone');
                    return null;
                }
            }

            toast.error("Could not access camera or microphone");
            return null;
        }
    }, [localStream, isCameraOn, isMicOn])

    // Initiate a connection with another user
    const initiateConnection = useCallback(async (username: string) => {
        console.log(`Initiating connection with ${username}`);

        if (!localStream) {
            console.error(`Cannot initiate connection with ${username}: No local stream available`);
            return;
        }

        const user = users.find(u => u.username === username);
        if (!user) {
            console.error(`Cannot initiate connection with ${username}: User not found`);
            return;
        }

        // Skip if we already have a connection with this user
        if (connections[username]) {
            console.log(`Connection with ${username} already exists, skipping initiation`);
            return;
        }

        console.log(`Creating peer connection with ${username}`);
        // Create a new peer connection
        const peer = createPeerConnection(true);

        // Set up connection state change handling
        peer.onConnectionStateChange((state) => {
            console.log(`Connection state with ${username} changed to ${state}`);
            if (state === 'connected') {
                setConnections(prev => ({
                    ...prev,
                    [username]: {
                        ...prev[username],
                        status: MediaStatus.CONNECTED,
                    },
                }));
                toast.success(`Connected to ${username}`);
            } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                setConnections(prev => {
                    if (!prev[username]) return prev;
                    return {
                        ...prev,
                        [username]: {
                            ...prev[username],
                            status: MediaStatus.DISCONNECTED,
                        },
                    };
                });
                if (state === 'failed') {
                    toast.error(`Connection with ${username} failed`);
                }
            }
        });

        // Set up ice candidate handling
        peer.onIceCandidate((candidate) => {
            console.log(`Sending ICE candidate to ${username}`);
            socket.emit(SocketEvent.MEDIA_SIGNAL, {
                signal: candidate,
                to: user.socketId,
                username: currentUser.username,
                type: 'ice-candidate'
            });
        });

        // Set up stream handling
        peer.onTrack((stream) => {
            console.log(`Received stream from ${username}`);
            setConnections(prev => {
                if (!prev[username]) return prev;
                return {
                    ...prev,
                    [username]: {
                        ...prev[username],
                        stream,
                        status: MediaStatus.CONNECTED,
                        hasVideo: stream.getVideoTracks().length > 0,
                        hasAudio: stream.getAudioTracks().length > 0,
                    },
                };
            });
        });

        // Add the new connection to our state
        setConnections(prev => ({
            ...prev,
            [username]: {
                peer,
                stream: null,
                user,
                status: MediaStatus.CONNECTING,
                hasVideo: false,
                hasAudio: false,
            },
        }));

        // Add our local stream tracks to the peer connection
        console.log(`Adding local tracks to connection with ${username}`);
        const videoTracks = localStream.getVideoTracks();
        const audioTracks = localStream.getAudioTracks();

        console.log(`Local stream has ${videoTracks.length} video tracks and ${audioTracks.length} audio tracks`);

        // Log track information
        localStream.getTracks().forEach(track => {
            console.log(`Local track: ${track.kind}, enabled: ${track.enabled}, muted: ${track.muted}, readyState: ${track.readyState}`);
        });

        // Make sure video tracks are enabled
        videoTracks.forEach(track => {
            track.enabled = true;
        });

        // Add all tracks to the peer connection
        localStream.getTracks().forEach(track => {
            console.log(`Adding ${track.kind} track to connection with ${username}`);
            peer.addTrack(track, localStream);
        });

        // Create and send an offer
        try {
            console.log(`Creating offer for ${username}`);
            const offer = await peer.createOffer();
            console.log(`Sending offer to ${username}:`, offer);
            socket.emit(SocketEvent.MEDIA_SIGNAL, {
                signal: offer,
                to: user.socketId,
                username: currentUser.username,
                type: 'offer'
            });
        } catch (error) {
            console.error(`Error creating offer for ${username}:`, error);
            setConnections(prev => {
                const newConnections = { ...prev };
                delete newConnections[username];
                return newConnections;
            });
            toast.error(`Failed to connect to ${username}`);
        }
    }, [localStream, users, socket, currentUser.username])

    // Toggle microphone
    const toggleMic = useCallback(async () => {
        if (!localStream) return

        const audioTracks = localStream.getAudioTracks()
        if (audioTracks.length > 0) {
            const enabled = !isMicOn
            audioTracks.forEach(track => {
                track.enabled = enabled
            })
            setIsMicOn(enabled)

            // Notify other users about the status change
            socket.emit(SocketEvent.MEDIA_STATUS_CHANGE, {
                isMicOn: enabled,
                isCameraOn,
                activeChannelId: activeChannel?.id || null,
            })
        }
    }, [localStream, isMicOn, socket, isCameraOn, activeChannel])

    // Toggle camera
    const toggleCamera = useCallback(async () => {
        if (!localStream) return

        const videoTracks = localStream.getVideoTracks()
        if (videoTracks.length > 0) {
            const enabled = !isCameraOn
            videoTracks.forEach(track => {
                track.enabled = enabled
            })
            setIsCameraOn(enabled)

            // Notify other users about the status change
            socket.emit(SocketEvent.MEDIA_STATUS_CHANGE, {
                isMicOn,
                isCameraOn: enabled,
                activeChannelId: activeChannel?.id || null,
            })
        }
    }, [localStream, isCameraOn, socket, isMicOn, activeChannel])

    // Leave the current channel
    const leaveChannel = useCallback(async () => {
        if (!activeChannel) return

        // Notify server that we're leaving the channel
        socket.emit(SocketEvent.CHANNEL_LEAVE, { channelId: activeChannel.id })

        // Close all peer connections
        Object.values(connections).forEach(connection => {
            connection.peer.close()
        })
        setConnections({})

        // Stop local stream
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop())
            setLocalStream(null)
        }

        // Stop screen sharing if active
        if (screenStream) {
            screenStream.getTracks().forEach(track => track.stop())
            setScreenStream(null)
            setIsScreenSharing(false)
        }

        // Reset state
        setActiveChannel(null)
        setIsMicOn(false)
        setIsCameraOn(false)

        // Notify other users about the status change
        socket.emit(SocketEvent.MEDIA_STATUS_CHANGE, {
            isMicOn: false,
            isCameraOn: false,
            activeChannelId: null,
        })

        toast.success(`Left ${activeChannel.name}`)
    }, [activeChannel, connections, localStream, screenStream, socket])

    // Update the ref
    useEffect(() => {
        leaveChannelRef.current = leaveChannel
    }, [leaveChannel])

    // Join a channel
    const joinChannel = useCallback(async (channelId: string) => {
        console.log(`Joining channel ${channelId}`);

        // Check if WebRTC is supported
        if (!isWebRTCSupported()) {
            toast.error("Your browser doesn't support WebRTC. Please use a modern browser like Chrome, Firefox, or Edge.");
            return;
        }

        // Find the channel
        const channel = channels.find(c => c.id === channelId)
        if (!channel) {
            toast.error("Channel not found")
            return
        }

        // Leave current channel if any
        if (activeChannel) {
            console.log(`Leaving current channel ${activeChannel.id} before joining new channel`);
            await leaveChannelRef.current()
        }

        // Clear any existing connections
        Object.keys(connections).forEach(username => {
            connections[username].peer.close();
        });
        setConnections({});

        // Initialize media stream with video for combined channels
        const stream = await initializeMediaStream(true) // Always enable video for combined channels
        if (!stream) return

        // Set initial device state
        setIsMicOn(true)
        setIsCameraOn(true) // Always enable camera for combined channels

        // Join the channel
        socket.emit(SocketEvent.CHANNEL_JOIN, { channelId })
        setActiveChannel(channel)

        // Notify other users about the status change
        socket.emit(SocketEvent.MEDIA_STATUS_CHANGE, {
            isMicOn: true,
            isCameraOn: true, // Always enable camera for combined channels
            activeChannelId: channelId,
        })

        // Initiate connections with other participants in the channel
        channel.participants.forEach(username => {
            if (username !== currentUser.username) {
                initiateConnection(username)
            }
        })

        toast.success(`Joined ${channel.name}`)
    }, [
        channels,
        activeChannel,
        initializeMediaStream,
        socket,
        currentUser.username,
        initiateConnection
    ])

    // Create a new channel
    const createChannel = useCallback(async (name: string, description: string = "") => {
        const newChannel: Channel = {
            id: uuidV4(),
            name,
            type: ChannelType.COMBINED, // Always use combined type
            participants: [],
            createdBy: currentUser.username,
            createdAt: Date.now(),
            description
        }

        socket.emit(SocketEvent.CHANNEL_CREATE, { channel: newChannel })
        setChannels(prev => [...prev, newChannel])
        toast.success(`Created channel ${name}`)
    }, [socket, currentUser.username])

    // Toggle screen sharing
    const toggleScreenShare = useCallback(async () => {
        if (!activeChannel) {
            toast.error("Join a channel first")
            return
        }

        try {
            if (isScreenSharing && screenStream) {
                // Stop screen sharing
                screenStream.getTracks().forEach(track => track.stop())
                setScreenStream(null)
                setIsScreenSharing(false)

                // Replace the screen stream with the camera stream in all connections
                if (localStream) {
                    Object.values(connections).forEach(connection => {
                        connection.peer.removeStream(screenStream)
                        connection.peer.addStream(localStream)
                    })
                }
            } else {
                // Start screen sharing
                const stream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true,
                })

                setScreenStream(stream)
                setIsScreenSharing(true)

                // Replace the camera stream with the screen stream in all connections
                Object.values(connections).forEach(connection => {
                    if (localStream) {
                        connection.peer.removeStream(localStream)
                    }
                    connection.peer.addStream(stream)
                })
            }
        } catch (error) {
            console.error("Error toggling screen share:", error)
            toast.error("Could not share screen")
        }
    }, [activeChannel, isScreenSharing, screenStream, localStream, connections])

    return (
        <MediaContext.Provider
            value={{
                localStream,
                connections,
                isMicOn,
                isCameraOn,
                activeChannel,
                channels,
                isScreenSharing,
                screenStream,
                toggleMic,
                toggleCamera,
                joinChannel,
                leaveChannel,
                createChannel,
                toggleScreenShare,
            }}
        >
            {children}
        </MediaContext.Provider>
    )
}

export { MediaContextProvider }
export default MediaContext
