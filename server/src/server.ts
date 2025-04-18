import express, { Response, Request } from "express"
import dotenv from "dotenv"
import http from "http"
import cors from "cors"
import { SocketEvent, SocketId } from "./types/socket"
import { USER_CONNECTION_STATUS, User } from "./types/user"
import { Channel, ChannelType } from "./types/media"
import { Server } from "socket.io"
import path from "path"
import fs from "fs" // Import the filesystem module
// import setupTerminalHandler from "./handlers/terminalHandler"
// import setupPtyTerminalHandler from "./handlers/ptyTerminalHandler"
// import setupStreamTerminalHandler from "./handlers/streamTerminalHandler"
import setupStreamTerminalHandler from "./handlers/streamTerminalHandler";
import fileRoutes from "./routes/fileRoutes";
dotenv.config()

const app = express()

app.use(express.json())

app.use(cors())

app.use(express.static(path.join(__dirname, "public"))) // Serve static files

// Use file routes
app.use('/api/files', fileRoutes)

// ================================================================
// Updated API endpoint for saving files on the server using the file's original name
// ================================================================
app.post("/api/saveFile", (req: Request, res: Response) => {
  // Extract the file name and content from the request body.
  const { name, content } = req.body

  // Validate that the request contains a valid file name and content.
  if (!name || typeof content !== "string") {
    return res.status(400).json({ message: "Invalid request payload." })
  }

  try {
    // Define a directory to save files.
    const saveDir = path.join(__dirname, "savedFiles")

    // Create the directory if it doesn't exist.
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir)
    }

    // Define the file path using the provided file name.
    // Note: You might want to sanitize the file name in a production environment.
    const filePath = path.join(saveDir, name)

    // Write the file content to disk.
    fs.writeFileSync(filePath, content, "utf8")

    return res
      .status(200)
      .json({ message: "File saved successfully on the server!" })
  } catch (error) {
    console.error("Error saving file:", error)
    return res
      .status(500)
      .json({ message: "Failed to save file on the server." })
  }
})
// ================================================================

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  maxHttpBufferSize: 1e8,
  pingTimeout: 60000,
  // Allow transport methods that work well with terminal
  transports: ['websocket', 'polling']
})

// Set up terminal handlers
console.log('Setting up terminal handlers')
// Use the stream terminal handler for a more integrated experience
setupStreamTerminalHandler(io)

let userSocketMap: User[] = []

// Initialize default channels
let channels: Channel[] = [
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
]

// Function to get all users in a room
function getUsersInRoom(roomId: string): User[] {
  return userSocketMap.filter((user) => user.roomId == roomId)
}

// Function to get room id by socket id
function getRoomId(socketId: SocketId): string | null {
  const roomId = userSocketMap.find((user) => user.socketId === socketId)?.roomId

  if (!roomId) {
    console.error("Room ID is undefined for socket ID:", socketId)
    return null
  }
  return roomId
}

function getUserBySocketId(socketId: SocketId): User | null {
  const user = userSocketMap.find((user) => user.socketId === socketId)
  if (!user) {
    console.error("User not found for socket ID:", socketId)
    return null
  }
  return user
}

io.on("connection", (socket) => {
  console.log(`New socket connection: ${socket.id}`);

  // Handle socket errors
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });

  // Handle user actions
  socket.on(SocketEvent.JOIN_REQUEST, ({ roomId, username }) => {
    // Check if username exists in the room
    const isUsernameExist = getUsersInRoom(roomId).filter(
      (u) => u.username === username,
    )
    if (isUsernameExist.length > 0) {
      io.to(socket.id).emit(SocketEvent.USERNAME_EXISTS)
      return
    }

    const user: User = {
      username,
      roomId,
      status: USER_CONNECTION_STATUS.ONLINE,
      cursorPosition: 0,
      typing: false,
      socketId: socket.id,
      currentFile: null,
    }
    userSocketMap.push(user)
    socket.join(roomId)
    socket.broadcast.to(roomId).emit(SocketEvent.USER_JOINED, { user })
    const users = getUsersInRoom(roomId)
    io.to(socket.id).emit(SocketEvent.JOIN_ACCEPTED, { user, users })
  })

  socket.on("disconnecting", () => {
    const user = getUserBySocketId(socket.id)
    if (!user) return
    const roomId = user.roomId
    socket.broadcast.to(roomId).emit(SocketEvent.USER_DISCONNECTED, { user })
    userSocketMap = userSocketMap.filter((u) => u.socketId !== socket.id)
    socket.leave(roomId)
  })

  // Handle file actions
  socket.on(
    SocketEvent.SYNC_FILE_STRUCTURE,
    ({ fileStructure, openFiles, activeFile, socketId }) => {
      io.to(socketId).emit(SocketEvent.SYNC_FILE_STRUCTURE, {
        fileStructure,
        openFiles,
        activeFile,
      })
    },
  )

  socket.on(
    SocketEvent.DIRECTORY_CREATED,
    ({ parentDirId, newDirectory }) => {
      const roomId = getRoomId(socket.id)
      if (!roomId) return
      socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_CREATED, {
        parentDirId,
        newDirectory,
      })
    },
  )

  socket.on(SocketEvent.DIRECTORY_UPDATED, ({ dirId, children }) => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return
    socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_UPDATED, {
      dirId,
      children,
    })
  })

  socket.on(SocketEvent.DIRECTORY_RENAMED, ({ dirId, newName }) => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return
    socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_RENAMED, {
      dirId,
      newName,
    })
  })

  socket.on(SocketEvent.DIRECTORY_DELETED, ({ dirId }) => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return
    socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_DELETED, { dirId })
  })

  socket.on(SocketEvent.FILE_CREATED, ({ parentDirId, newFile }) => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return
    socket.broadcast.to(roomId).emit(SocketEvent.FILE_CREATED, { parentDirId, newFile })
  })

  socket.on(SocketEvent.FILE_UPDATED, ({ fileId, newContent }) => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return
    socket.broadcast.to(roomId).emit(SocketEvent.FILE_UPDATED, {
      fileId,
      newContent,
    })
  })

  socket.on(SocketEvent.FILE_RENAMED, ({ fileId, newName }) => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return
    socket.broadcast.to(roomId).emit(SocketEvent.FILE_RENAMED, {
      fileId,
      newName,
    })
  })

  socket.on(SocketEvent.FILE_DELETED, ({ fileId }) => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return
    socket.broadcast.to(roomId).emit(SocketEvent.FILE_DELETED, { fileId })
  })

  // Handle user status
  socket.on(SocketEvent.USER_OFFLINE, ({ socketId }) => {
    userSocketMap = userSocketMap.map((user) => {
      if (user.socketId === socketId) {
        return { ...user, status: USER_CONNECTION_STATUS.OFFLINE }
      }
      return user
    })
    const roomId = getRoomId(socketId)
    if (!roomId) return
    socket.broadcast.to(roomId).emit(SocketEvent.USER_OFFLINE, { socketId })
  })

  socket.on(SocketEvent.USER_ONLINE, ({ socketId }) => {
    userSocketMap = userSocketMap.map((user) => {
      if (user.socketId === socketId) {
        return { ...user, status: USER_CONNECTION_STATUS.ONLINE }
      }
      return user
    })
    const roomId = getRoomId(socketId)
    if (!roomId) return
    socket.broadcast.to(roomId).emit(SocketEvent.USER_ONLINE, { socketId })
  })

  // Handle chat actions
  socket.on(SocketEvent.SEND_MESSAGE, ({ message }) => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return
    socket.broadcast.to(roomId).emit(SocketEvent.RECEIVE_MESSAGE, { message })
  })

  // Handle cursor position
  socket.on(SocketEvent.TYPING_START, ({ cursorPosition }) => {
    userSocketMap = userSocketMap.map((user) => {
      if (user.socketId === socket.id) {
        return { ...user, typing: true, cursorPosition }
      }
      return user
    })
    const user = getUserBySocketId(socket.id)
    if (!user) return
    const roomId = user.roomId
    socket.broadcast.to(roomId).emit(SocketEvent.TYPING_START, { user })
  })

  socket.on(SocketEvent.TYPING_PAUSE, () => {
    userSocketMap = userSocketMap.map((user) => {
      if (user.socketId === socket.id) {
        return { ...user, typing: false }
      }
      return user
    })
    const user = getUserBySocketId(socket.id)
    if (!user) return
    const roomId = user.roomId
    socket.broadcast.to(roomId).emit(SocketEvent.TYPING_PAUSE, { user })
  })

  socket.on(SocketEvent.REQUEST_DRAWING, () => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return
    socket.broadcast.to(roomId).emit(SocketEvent.REQUEST_DRAWING, { socketId: socket.id })
  })

  socket.on(SocketEvent.SYNC_DRAWING, ({ drawingData, socketId }) => {
    socket.broadcast.to(socketId).emit(SocketEvent.SYNC_DRAWING, { drawingData })
  })

  socket.on(SocketEvent.DRAWING_UPDATE, ({ snapshot }) => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return
    socket.broadcast.to(roomId).emit(SocketEvent.DRAWING_UPDATE, { snapshot })
  })

  // Media event handlers
  socket.on(SocketEvent.MEDIA_SIGNAL, ({ signal, to, username, type }) => {
    console.log(`Received ${type} signal from ${username} to ${to}`);

    // Validate the target socket exists
    const targetSocket = io.sockets.sockets.get(to);
    if (!targetSocket) {
      console.error(`Target socket ${to} not found for ${username}'s ${type} signal`);
      // Notify sender that the target is not available
      socket.emit(SocketEvent.MEDIA_ERROR, {
        error: 'Target user not available',
        target: to,
        type: type
      });
      return;
    }

    // Forward the signal to the target
    io.to(to).emit(SocketEvent.MEDIA_SIGNAL, { signal, from: socket.id, username, type });

    // Log successful forwarding
    console.log(`Successfully forwarded ${type} signal from ${username} to ${to}`);
  })

  socket.on(SocketEvent.MEDIA_STATUS_CHANGE, ({ isMicOn, isCameraOn, activeChannelId }) => {
    const user = getUserBySocketId(socket.id)
    if (!user) return
    const roomId = user.roomId

    console.log(`User ${user.username} changed media status: mic=${isMicOn}, camera=${isCameraOn}, channel=${activeChannelId}`);

    // Update user's media status
    userSocketMap = userSocketMap.map(u => {
      if (u.socketId === socket.id) {
        return { ...u, isMicOn, isCameraOn, activeChannelId }
      }
      return u
    })

    // Broadcast the status change to all users in the room
    socket.broadcast.to(roomId).emit(SocketEvent.MEDIA_STATUS_CHANGE, {
      username: user.username,
      isMicOn,
      isCameraOn,
      activeChannelId,
    })
  })

  // Channel event handlers
  socket.on(SocketEvent.CHANNEL_CREATE, ({ channel }) => {
    const user = getUserBySocketId(socket.id)
    if (!user) return
    const roomId = user.roomId

    console.log(`User ${user.username} created channel: ${channel.name}`);

    // Add the new channel
    channels.push(channel)

    // Broadcast the new channel to all users in the room
    io.to(roomId).emit(SocketEvent.CHANNEL_CREATE, { channel })
  })

  socket.on(SocketEvent.CHANNEL_JOIN, ({ channelId }) => {
    const user = getUserBySocketId(socket.id)
    if (!user) return
    const roomId = user.roomId

    // Find the channel
    const channelIndex = channels.findIndex(c => c.id === channelId)
    if (channelIndex === -1) {
      console.error(`Channel ${channelId} not found`);
      return;
    }

    console.log(`User ${user.username} joined channel: ${channels[channelIndex].name}`);

    // Add the user to the channel participants if not already there
    if (!channels[channelIndex].participants.includes(user.username)) {
      channels[channelIndex].participants.push(user.username)
    }

    // Broadcast to all users in the room that this user joined the channel
    io.to(roomId).emit(SocketEvent.CHANNEL_JOIN, {
      channelId,
      username: user.username,
    })

    // Send the updated channel list to all users in the room
    io.to(roomId).emit(SocketEvent.CHANNEL_LIST, { channels })
  })

  socket.on(SocketEvent.CHANNEL_LEAVE, ({ channelId }) => {
    const user = getUserBySocketId(socket.id)
    if (!user) return
    const roomId = user.roomId

    // Find the channel
    const channelIndex = channels.findIndex(c => c.id === channelId)
    if (channelIndex === -1) {
      console.error(`Channel ${channelId} not found`);
      return;
    }

    console.log(`User ${user.username} left channel: ${channels[channelIndex].name}`);

    // Remove the user from the channel participants
    channels[channelIndex].participants = channels[channelIndex].participants.filter(
      username => username !== user.username
    )

    // Broadcast to all users in the room that this user left the channel
    io.to(roomId).emit(SocketEvent.CHANNEL_LEAVE, {
      channelId,
      username: user.username,
    })

    // Send the updated channel list to all users in the room
    io.to(roomId).emit(SocketEvent.CHANNEL_LIST, { channels })
  })

  // Send the channel list when a user joins a room
  socket.on(SocketEvent.JOIN_ACCEPTED, () => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return

    // Send the channel list to the user
    socket.emit(SocketEvent.CHANNEL_LIST, { channels })
  })
})

const PORT = process.env.PORT || 3000

app.get("/", (_req: Request, res: Response) => {
  // Send the index.html file
  res.sendFile(path.join(__dirname, "..", "public", "index.html"))
})

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})
