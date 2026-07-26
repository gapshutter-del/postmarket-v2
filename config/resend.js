const { Resend } = require("resend");

console.log("========== RESEND DEBUG ==========");
console.log("RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);

if (process.env.RESEND_API_KEY) {
  console.log(
    "RESEND_API_KEY prefix:",
    process.env.RESEND_API_KEY.substring(0, 5) + "..."
  );
}

console.log("FROM_EMAIL:", process.env.FROM_EMAIL);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("==================================");

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY");
}

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = resend;
