require("dotenv").config();
const supabase = require("./config/supabase");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const authRoutes = require("./routes/auth");
const app = express();
const bookingRoutes = require("./routes/bookings");


app.use(helmet());

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);

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
app.get("/api/routes", (req, res) => {

    res.json({

       routes: [
    "/api/health",
    "/api/db/health",

    "POST /api/auth/send-otp",
    "POST /api/auth/verify-otp",
    "POST /api/auth/signup",
    "POST /api/auth/login",
    "GET /api/auth/me",

    "POST /api/bookings",
    "GET /api/bookings/my",
    "GET /api/bookings/incoming",
    "GET /api/bookings/:id",
    "PATCH /api/bookings/:id/accept"
] 

    });

});
app.get("/api/db/health", async (req, res) => {
  try {
    const { error } = await supabase
      .from("users")
      .select("ref")
      .limit(1);

    if (error) {
      return res.status(500).json({
        success: false,
        database: "error",
        message: error.message
      });
    }

    return res.json({
      success: true,
      database: "connected"
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      database: "offline",
      message: err.message
    });
  }
});
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`PostMarket API running on ${PORT}`);
});
