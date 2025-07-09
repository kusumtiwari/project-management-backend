require("dotenv").config(); // Make sure this is at the top
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? process.env.EMAIL_PASS : "NOT SET ❌");


const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // replace with your Gmail
    pass: process.env.EMAIL_PASS, // replace with your 16-char app password (no spaces)
  },
});

const mailOptions = {
  from: "kusumtiwari024@gmail.com",
  to: "kusumtiwari024@gmail.com", // send to yourself
  subject: "Test Email from Node.js",
  text: "If you received this, your app password works!",
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    return console.error("❌ Failed to send:", error);
  }
  console.log("✅ Email sent successfully:", info.response);
});
