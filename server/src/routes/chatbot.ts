import express from "express";
import { getChatbotResponse } from "../controllers/chatbotController"; // ✅ Ensure correct import

const router = express.Router();

// ✅ POST route for chatbot messages
router.post("/chat", async (req, res) => {
    try {
        await getChatbotResponse(req, res);
    } catch (error) {
        console.error("Chatbot Route Error:", error);
        res.status(500).json({ error: "Internal Server Error in chatbot route" });
    }
});

// ✅ Handle invalid routes under /api/chatbot
router.all("*", (req, res) => {
    res.status(404).json({ error: "Invalid chatbot route" });
});

export default router;
