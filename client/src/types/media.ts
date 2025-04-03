import { PeerConnection } from '@/utils/webrtc';
import { User } from './user';

export enum MediaStatus {
    CONNECTED = 'connected',
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting',
    ERROR = 'error'
}

export enum ChannelType {
    COMBINED = 'combined'
}

export interface Channel {
    id: string;
    name: string;
    type: ChannelType;
    participants: string[]; // usernames
    createdBy?: string; // username of creator
    createdAt?: number; // timestamp
    description?: string; // channel description
}

export interface MediaConnection {
    peer: PeerConnection;
    stream: MediaStream | null;
    user: User;
    status: MediaStatus;
    hasVideo: boolean;
    hasAudio: boolean;
}

export interface MediaState {
    localStream: MediaStream | null;
    connections: Record<string, MediaConnection>; // key is username
    isMicOn: boolean;
    isCameraOn: boolean;
    activeChannel: Channel | null;
    channels: Channel[];
    isScreenSharing: boolean;
    screenStream: MediaStream | null;
}

export interface MediaContextType extends MediaState {
    toggleMic: () => Promise<void>;
    toggleCamera: () => Promise<void>;
    joinChannel: (channelId: string) => Promise<void>;
    leaveChannel: () => Promise<void>;
    createChannel: (name: string, description?: string) => Promise<void>;
    toggleScreenShare: () => Promise<void>;
}
