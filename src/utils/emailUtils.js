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

const sendTaskNotificationEmail = async (admin, task, originalStatus, updatedBy) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: admin.email,
    subject: `Task Status Updated - ${task.title}`,
    html: `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 10px; border: 1px solid #e0e0e0;">
    <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #ddd;">
      <h1 style="color: #007bff; margin: 0;">Planora</h1>
      <p style="color: #555; font-size: 16px; margin-top: 5px;">Task Update Notification</p>
    </div>

    <div style="padding: 20px 0;">
      <h2 style="color: #333;">Task Status Changed</h2>
      <p style="color: #555; font-size: 16px;">
        Hi ${admin.username},
      </p>
      <p style="color: #555; font-size: 16px;">
        A task has been updated by a team member:
      </p>

      <div style="background: #fff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
        <h3 style="margin: 0 0 10px 0; color: #333;">${task.title}</h3>
        <p style="margin: 5px 0; color: #666;"><strong>Project:</strong> ${task.project.name}</p>
        <p style="margin: 5px 0; color: #666;"><strong>Updated by:</strong> ${updatedBy.username} (${updatedBy.email})</p>
        <p style="margin: 5px 0; color: #666;"><strong>Status changed from:</strong> 
          <span style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px;">${originalStatus}</span> 
          to 
          <span style="background: #007bff; color: white; padding: 2px 6px; border-radius: 3px;">${task.status}</span>
        </p>
        ${task.description ? `<p style="margin: 10px 0 0 0; color: #666;"><strong>Description:</strong> ${task.description}</p>` : ''}
      </div>

      <p style="color: #555; font-size: 14px;">
        You can view this task and project details in your dashboard.
      </p>
    </div>

    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #aaa;">
      <p>&copy; ${new Date().getFullYear()} Planora. All rights reserved.</p>
    </div>
  </div>
`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Task notification email sent to:", admin.email);
  } catch (error) {
    console.error("Error sending task notification email:", error);
    throw new Error("Failed to send task notification email");
  }
};

const sendAdminCreatedEmail = async (admin, createdBy, tempPassword = null) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: admin.email,
    subject: "Welcome to Planora - Admin Account Created",
    html: `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 10px; border: 1px solid #e0e0e0;">
    <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #ddd;">
      <h1 style="color: #007bff; margin: 0;">Planora</h1>
      <p style="color: #555; font-size: 16px; margin-top: 5px;">Project Management Platform</p>
    </div>

    <div style="padding: 20px 0; text-align: center;">
      <h2 style="color: #333;">Welcome to Planora!</h2>
      <p style="color: #555; font-size: 16px;">
        Hi ${admin.username},
      </p>
      <p style="color: #555; font-size: 16px;">
        Your administrator account has been created by ${createdBy.username}. You can now access the Planora platform with admin privileges.
      </p>

      <div style="background: #fff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
        <h3 style="margin: 0 0 10px 0; color: #333;">Your Account Details</h3>
        <p style="margin: 5px 0; color: #666;"><strong>Email:</strong> ${admin.email}</p>
        <p style="margin: 5px 0; color: #666;"><strong>Role:</strong> Administrator</p>
        <p style="margin: 5px 0; color: #666;"><strong>Account Status:</strong> Active</p>
      </div>

      <a href="${process.env.CLIENT_URL}/login" 
         style="display: inline-block; margin-top: 20px; background-color: #007bff; color: #fff; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold;">
        Access Your Dashboard
      </a>

      <p style="color: #555; font-size: 14px; margin-top: 20px;">
        As an administrator, you can create projects, manage teams, and invite team members.
      </p>
    </div>

    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #aaa;">
      <p>&copy; ${new Date().getFullYear()} Planora. All rights reserved.</p>
    </div>
  </div>
`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Admin created notification email sent to:", admin.email);
  } catch (error) {
    console.error("Error sending admin created email:", error);
    throw new Error("Failed to send admin created notification email");
  }
};

module.exports = { 
  sendVerificationEmail, 
  sendTaskNotificationEmail,
  sendAdminCreatedEmail 
};
