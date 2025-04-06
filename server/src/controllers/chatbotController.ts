import { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;


export const getChatbotResponse = async (req: Request, res: Response) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        if (!API_KEY) {
            console.error("❌ ERROR: Gemini API key is missing");
            return res.status(500).json({ error: "Gemini API key is missing" });
        }

        console.log("📤 Sending request to Gemini API with message:", message);

        // ✅ Correct request format for Gemini API
        const response = await axios.post(
            GEMINI_API_URL,
            {
                contents: [{ parts: [{ text: message }] }]
            },
            { headers: { "Content-Type": "application/json" } }
        );

        console.log("✅ Received response from Gemini API:", response.data);

        // ✅ Extract response
        const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't understand that.";

        res.json({ reply });
    } catch (error: any) {
        console.error("❌ Chatbot API Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to get response from Gemini API" });
    }
};
