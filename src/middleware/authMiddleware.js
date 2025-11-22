const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async(req,res,next) => {
    const authHeader = req.headers.authorization;
    let token = undefined;
    if (authHeader && authHeader.startsWith("Bearer")) {
      token = authHeader.split(" ")[1];
    } else if (req.headers.cookie) {
      // parse 'token' from cookie header without extra deps
      try {
        const cookiePairs = req.headers.cookie.split(';').map((c)=>c.trim().split('='));
        const cookieMap = Object.fromEntries(cookiePairs);
        token = cookieMap.token;
      } catch (e) {
        // ignore parse errors
      }
    }

    if(!token){
        return res.status(401).json({ message: "Not authorized, token missing" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded Token:", decoded); 

      const user = await User.findById(decoded.id).select("-password");

      console.log(user,'user from middleware')
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