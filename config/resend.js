const { Resend } = require("resend");

console.log(
  "RESEND_API_KEY loaded:",
  !!process.env.RESEND_API_KEY,
  process.env.RESEND_API_KEY
    ? process.env.RESEND_API_KEY.substring(0, 5) + "..."
    : "(missing)"
);

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY");
}

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = resend;
