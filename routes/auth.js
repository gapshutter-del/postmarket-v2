const express = require("express");
const resend = require("../config/resend");

const router = express.Router();

router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email required"
      });
    }

    console.log("Sending test email to:", email);

    const response = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "PostMarket Test Email",
      html: `
        <h2>Hello from PostMarket</h2>
        <p>Your backend is successfully connected to Resend.</p>
        <p>This is a test email.</p>
      `
    });

    console.log("Resend response:", response);

    return res.json({
      success: true,
      response
    });

  } catch (err) {
    console.error("Resend error:", err);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;
