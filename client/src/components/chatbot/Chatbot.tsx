import { useState } from "react";
import ReactMarkdown from "react-markdown";

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false); // Sidebar state
    const [messages, setMessages] = useState([
        { text: "Hi 👋 How can I help you?", sender: "bot" },
    ]);
    const [loading, setLoading] = useState(false);

    const handleUserMessage = async (message: string) => {
        setMessages([...messages, { text: message, sender: "user" }]);
        setLoading(true); // Show loading indicator

        try {
            const response = await fetch("http://localhost:3000/api/chatbot/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message }),
            });

            const data = await response.json();
            let botReply = data.reply || "I couldn't understand that. 🤖";

            // Preserve markdown formatting for code blocks
            const match = botReply.match(/```([\w+#]*)\n([\s\S]*?)```/);
            if (match) {
                const language = match[1] || "code"; // Detect language (Java, Python, etc.)
                botReply = `Here is your **${language}** code:\n\n\`\`\`${language}\n${match[2].trim()}\n\`\`\``;
            }

            setMessages((prev) => [...prev, { text: botReply, sender: "bot" }]);
        } catch (error) {
            setMessages((prev) => [...prev, { text: "Error connecting to AI 🤖", sender: "bot" }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed top-0 right-0 h-full z-50 flex">
            {/* Expand/Collapse Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-gray-700 text-white p-3 rounded-l-md shadow-md mt-20"
            >
                {isOpen ? "«" : "»"} {/* Double Arrow Icon */}
            </button>

            {/* Sidebar Chat Window */}
            <div className={`bg-[#091540] text-white shadow-lg h-full flex flex-col transition-all duration-300 ${isOpen ? "w-96" : "w-0 overflow-hidden"}`}>
                {isOpen && (
                    <>
                        {/* Header */}
                        <div className="bg-gray-800 px-4 py-3 flex justify-center items-center relative">
                            <span className="font-semibold text-white">CodeGenie</span>
                            <button onClick={() => setIsOpen(false)} className="text-white text-lg absolute right-4">
                                ✖
                            </button>
                        </div>



                        {/* Chat Body */}
                        <div className="flex-1 p-3 overflow-y-auto space-y-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex ${msg.sender === "bot" ? "justify-start" : "justify-end"}`}>
                                    <div className={`px-4 py-2 rounded-xl max-w-[90%] break-words bg-gray-300 text-black ${msg.sender === "bot" ? "bg-gray-300" : "bg-gray-700 text-white"}`}>
                                        <ReactMarkdown
                                            components={{
                                                code({ className, children, ...props }) {
                                                    const match = /language-(\w+)/.exec(className || "");
                                                    return match ? (
                                                        <pre className="overflow-x-auto p-2 bg-black text-white rounded-md">
                                                            <code {...props} className={className}>
                                                                {children}
                                                            </code>
                                                        </pre>
                                                    ) : (
                                                        <code className="bg-gray-200 text-black px-1 rounded">{children}</code>
                                                    );
                                                }
                                            }}
                                        >
                                            {msg.text}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="px-4 py-2 rounded-xl bg-gray-300 text-black">Typing...</div>
                                </div>
                            )}
                        </div>

                        {/* Chat Footer */}
                        <div className="p-3 border-t border-gray-600 flex">
                            <input
                                type="text"
                                placeholder="Type a message..."
                                className="w-full p-2 border rounded-md focus:outline-none text-black"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && e.currentTarget.value.trim()) {
                                        handleUserMessage(e.currentTarget.value);
                                        e.currentTarget.value = "";
                                    }
                                }}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Chatbot;
