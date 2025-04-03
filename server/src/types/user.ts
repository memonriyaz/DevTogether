enum USER_CONNECTION_STATUS {
	OFFLINE = "offline",
	ONLINE = "online",
}

interface User {
	username: string
	roomId: string
	status: USER_CONNECTION_STATUS
	cursorPosition: number
	typing: boolean
	currentFile: string | null
	socketId: string
	isMicOn?: boolean
	isCameraOn?: boolean
	activeChannelId?: string | null
}

export { USER_CONNECTION_STATUS, User }
