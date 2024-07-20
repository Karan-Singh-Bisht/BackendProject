const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
} = require("../controllers/user.controller.js");
const upload = require("../middlewares/multer.middleware.js");
const { verifyJWT } = require("../middlewares/auth.middleware.js");

router.post(
  "/register",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

router.post("/login", loginUser);
router.post("/logout", verifyJWT, logOutUser);
router.post("/refresh-token", refreshAccessToken);

module.exports = router;
