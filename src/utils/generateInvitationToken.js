const jwt = require("jsonwebtoken");

const generateInvitationToken = ({ email, invitedBy }) => {
  return jwt.sign(
    { email, invitedBy },
    process.env.INVITE_SECRET, // different secret
    { expiresIn: "24h" } // token expires in 24 hours
  );
};

module.exports = generateInvitationToken;
