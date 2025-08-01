// const jwt = require("jsonwebtoken");
// const UserService = require("../services/user.service");

// module.exports.ensureAuthenticated = async (req, res, next) => {
//   const token = req.headers.authorization;

//   if (!token) return res.fail("Unauthorized");

//   try {
//     const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);

//     const user = await UserService.readById(decoded.id);

//     if (!user) return res.fail("Unauthorized");

//     req.user = user;
//     return next();
//   } catch (err) {
//     console.log(err);
//     return res.fail("Unauthorized");
//   }
// };

const jwt = require("jsonwebtoken");

module.exports.ensureAuthenticated = async (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) return res.fail("Unauthorized");

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.ACCESS_TOKEN_SECRET);

    console.log("=== DEBUGGING ===");
    console.log("Full decoded token:", JSON.stringify(decoded, null, 2));
    console.log("decoded.user:", decoded.user);
    console.log("decoded.id:", decoded.id);
    console.log("==================");

    // Set req.user to the complete user object from token
    req.user = decoded.user; // This should contain all user fields including _id

    console.log("req.user after setting:", req.user);
    return next();
  } catch (err) {
    console.log("JWT verification error:", err);
    return res.fail("Unauthorized");
  }
};
