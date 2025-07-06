const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async(req,res,next) => {
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith("Bearer")){
        return res
          .status(401)
          .json({ message: "Not authorized, token missing" });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded Token:", decoded); 
      const user = await User.findById(decoded.id).select("-password");

      console.log(user,'user here')
      if (!user) {
        return res
          .status(401)
          .json({ message: "Not authorized, user not found" });
      }

      req.user = user; // attach user to request
      next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
}