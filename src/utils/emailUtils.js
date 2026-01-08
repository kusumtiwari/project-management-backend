const nodemailer = require("nodemailer");
require("dotenv").config(); // make sure this is at the top

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Verify Your Email Address",
    html: `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 10px; border: 1px solid #e0e0e0;">
    <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #ddd;">
      <h1 style="color: #007bff; margin: 0;">Planora</h1>
      <p style="color: #555; font-size: 16px; margin-top: 5px;">Project Management Made Easy</p>
    </div>

    <div style="padding: 20px 0; text-align: center;">
      <h2 style="color: #333;">Welcome, ${user.username}!</h2>
      <p style="color: #555; font-size: 16px;">
        Thank you for joining Planora. Please verify your email to get started with your projects.
      </p>

      <a href="${verificationUrl}" 
         style="display: inline-block; margin-top: 20px; background-color: #007bff; color: #fff; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold;">
        Verify Your Email
      </a>

      <p style="color: #888; font-size: 14px; margin-top: 20px;">
        If the button doesn’t work, copy and paste this link in your browser:
      </p>
      <p style="word-break: break-all; color: #555; background: #eee; padding: 10px; border-radius: 5px; font-size: 14px;">
        ${verificationUrl}
      </p>
    </div>

    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #aaa;">
      <p>If you didn’t create an account, please ignore this email.</p>
      <p>&copy; ${new Date().getFullYear()} Planora. All rights reserved.</p>
    </div>
  </div>
`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Verification email sent to:", user.email);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email");
  }
};

module.exports = { sendVerificationEmail };
