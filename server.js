require("dotenv").config();
const supabase = require("./config/supabase");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const app = express();

app.use(helmet());

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        success: true,
        service: "PostMarket API",
        version: "2.0.0"
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`PostMarket API running on ${PORT}`);
});
