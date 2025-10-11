
const nodemailer = require("nodemailer");

const sendVerificationEmail = async (user, token) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  console.log(process.env.EMAIL_PASS, "email pass", process.env.EMAIL_USER);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Verify Your Email Address",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Welcome to Our Platform, ${user.username}!</h2>
        <p>Thank you for registering. Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>If the button doesn't work, copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666; background: #f5f5f5; padding: 10px; border-radius: 4px;">
          ${verificationUrl}
        </p>
        <p>If you didn't create an account, please ignore this email.</p>
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



const sendInvitationForTeamMember = async ({
  to,
  token,
  role,
  invitedByUsername,
}) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  const invitationUrl = `${process.env.CLIENT_URL}/invite?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: "Invitation to Join Planora",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">You've Been Invited to Join Planora</h2>
        <p><strong>${invitedByUsername}</strong> has invited you to join Planora.</p>
        <p>Click the button below to accept the invitation:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationUrl}" 
             style="background-color: #28a745; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">
          ${invitationUrl}
        </p>
        <p>This invitation will expire in 24 hours.</p>
        <p>If you did not expect this invitation, please ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Invitation email sent to:", to);
  } catch (error) {
    console.error("Error sending invitation email:", error);
    throw new Error("Failed to send invitation email");
  }
};

module.exports = {
  sendVerificationEmail,
  sendInvitationForTeamMember,
};
