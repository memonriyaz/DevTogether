import { useMedia } from "@/context/MediaContext"
import { Channel } from "@/types/media"
import { useState } from "react"
import { BsCameraVideo } from "react-icons/bs"
import { FaMicrophone } from "react-icons/fa"
import { IoAdd } from "react-icons/io5"

function ChannelList() {
    const { channels, joinChannel, createChannel, activeChannel } = useMedia()
    const [isCreatingChannel, setIsCreatingChannel] = useState(false)
    const [newChannelName, setNewChannelName] = useState("")
    const [newChannelDescription, setNewChannelDescription] = useState("")

    const handleCreateChannel = () => {
        if (newChannelName.trim()) {
            createChannel(newChannelName.trim(), newChannelDescription.trim())
            setNewChannelName("")
            setNewChannelDescription("")
            setIsCreatingChannel(false)
        }
    }

    const handleJoinChannel = (channel: Channel) => {
        joinChannel(channel.id)
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Channels</h2>
                <button
                    onClick={() => setIsCreatingChannel(!isCreatingChannel)}
                    className="p-2 rounded-full bg-primary text-black"
                    title="Create new channel"
                >
                    <IoAdd size={20} />
                </button>
            </div>

            {isCreatingChannel && (
                <div className="mb-4 p-3 bg-darkHover rounded-md">
                    <h3 className="text-sm font-semibold mb-2">Create New Channel</h3>
                    <input
                        type="text"
                        value={newChannelName}
                        onChange={(e) => setNewChannelName(e.target.value)}
                        placeholder="Channel name"
                        className="w-full p-2 mb-2 bg-dark rounded border border-gray-700"
                    />
                    <textarea
                        value={newChannelDescription}
                        onChange={(e) => setNewChannelDescription(e.target.value)}
                        placeholder="Channel description (optional)"
                        className="w-full p-2 mb-2 bg-dark rounded border border-gray-700 resize-none"
                        rows={3}
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setIsCreatingChannel(false)}
                            className="px-3 py-1 bg-dark rounded"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreateChannel}
                            className="px-3 py-1 bg-primary text-black rounded"
                            disabled={!newChannelName.trim()}
                        >
                            Create
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-grow overflow-auto">
                <div className="space-y-2">
                    {channels.map((channel) => (
                        <div
                            key={channel.id}
                            className={`p-3 rounded-md cursor-pointer flex items-center justify-between ${
                                activeChannel?.id === channel.id
                                    ? "bg-primary bg-opacity-20 border border-primary"
                                    : "bg-darkHover hover:bg-dark"
                            }`}
                            onClick={() => handleJoinChannel(channel)}
                        >
                            <div className="flex items-center">
                                <div className="flex mr-2">
                                    <FaMicrophone className="text-primary mr-1" />
                                    <BsCameraVideo className="text-primary" />
                                </div>
                                <span>{channel.name}</span>
                            </div>
                            <div className="text-xs text-gray-400">
                                {channel.participants.length} users
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default ChannelList
