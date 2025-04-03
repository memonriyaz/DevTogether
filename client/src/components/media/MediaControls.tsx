import { useMedia } from "@/context/MediaContext"
import { BsCameraVideo, BsCameraVideoOff } from "react-icons/bs"
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa"
import { MdOutlineScreenShare, MdOutlineStopScreenShare } from "react-icons/md"
import { IoExitOutline } from "react-icons/io5"

function MediaControls() {
    const {
        isMicOn,
        isCameraOn,
        toggleMic,
        toggleCamera,
        leaveChannel,
        isScreenSharing,
        toggleScreenShare,
        activeChannel
    } = useMedia()

    return (
        <div className="flex items-center justify-center gap-4 p-4 bg-darkHover rounded-md">
            <button
                onClick={toggleMic}
                className={`p-3 rounded-full ${
                    isMicOn ? "bg-primary text-black" : "bg-red-500 text-white"
                }`}
                title={isMicOn ? "Mute microphone" : "Unmute microphone"}
            >
                {isMicOn ? <FaMicrophone size={20} /> : <FaMicrophoneSlash size={20} />}
            </button>

            <button
                onClick={toggleCamera}
                className={`p-3 rounded-full ${
                    isCameraOn ? "bg-primary text-black" : "bg-red-500 text-white"
                }`}
                title={isCameraOn ? "Turn off camera" : "Turn on camera"}
                disabled={!activeChannel}
            >
                {isCameraOn ? <BsCameraVideo size={20} /> : <BsCameraVideoOff size={20} />}
            </button>

            <button
                onClick={toggleScreenShare}
                className={`p-3 rounded-full ${
                    isScreenSharing ? "bg-primary text-black" : "bg-dark text-white"
                }`}
                title={isScreenSharing ? "Stop sharing screen" : "Share screen"}
            >
                {isScreenSharing ? (
                    <MdOutlineStopScreenShare size={20} />
                ) : (
                    <MdOutlineScreenShare size={20} />
                )}
            </button>

            <button
                onClick={leaveChannel}
                className="p-3 rounded-full bg-red-500 text-white"
                title="Leave channel"
            >
                <IoExitOutline size={20} />
            </button>
        </div>
    )
}

export default MediaControls
