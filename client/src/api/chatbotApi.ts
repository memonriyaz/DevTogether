export const sendMessageToChatbot = async (message: string) => {
    try {
        const response = await fetch("http://localhost:3000/api/chatbot/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message }),
        });

        const data = await response.json();
        return data.reply || "Sorry, I couldn't understand that.";
    } catch (error) {
        console.error("Error:", error);
        return "Error connecting to chatbot.";
    }
};
