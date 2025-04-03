import { Socket } from "socket.io-client"

type SocketId = string

enum SocketEvent {
    JOIN_REQUEST = "join-request",
    JOIN_ACCEPTED = "join-accepted",
    USER_JOINED = "user-joined",
    USER_DISCONNECTED = "user-disconnected",
    SYNC_FILE_STRUCTURE = "sync-file-structure",
    DIRECTORY_CREATED = "directory-created",
    DIRECTORY_UPDATED = "directory-updated",
    DIRECTORY_RENAMED = "directory-renamed",
    DIRECTORY_DELETED = "directory-deleted",
    FILE_CREATED = "file-created",
    FILE_UPDATED = "file-updated",
    FILE_RENAMED = "file-renamed",
    FILE_DELETED = "file-deleted",
    USER_OFFLINE = "offline",
    USER_ONLINE = "online",
    SEND_MESSAGE = "send-message",
    RECEIVE_MESSAGE = "receive-message",
    TYPING_START = "typing-start",
    TYPING_PAUSE = "typing-pause",
    USERNAME_EXISTS = "username-exists",
    REQUEST_DRAWING = "request-drawing",
    SYNC_DRAWING = "sync-drawing",
    DRAWING_UPDATE = "drawing-update",

    // Media events
    MEDIA_SIGNAL = "media-signal",
    MEDIA_REQUEST = "media-request",
    MEDIA_READY = "media-ready",
    MEDIA_ERROR = "media-error",
    MEDIA_STATUS_CHANGE = "media-status-change",
    MEDIA_CONNECTION_FAILED = "media-connection-failed",

    // Channel events
    CHANNEL_CREATE = "channel-create",
    CHANNEL_JOIN = "channel-join",
    CHANNEL_LEAVE = "channel-leave",
    CHANNEL_LIST = "channel-list",
    CHANNEL_UPDATE = "channel-update",

    // Terminal events
    TERMINAL_CONNECTED = "terminal:connected",
    TERMINAL_COMMAND = "terminal:command",
    TERMINAL_OUTPUT = "terminal:output",
    TERMINAL_ERROR = "terminal:error",
    TERMINAL_RESIZE = "terminal:resize",
    TERMINAL_INPUT = "terminal:input",
}

interface SocketContext {
    socket: Socket
}

export { SocketEvent, SocketContext, SocketId }
