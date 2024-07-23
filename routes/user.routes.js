const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changeUserPassword,
  getCurrentUser,
  updateUserInfo,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelInfo,
  getWatchHistory,
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
router.post("/changePassword", verifyJWT, changeUserPassword);
router.get("/current-user", verifyJWT, getCurrentUser);
router.patch("/update-user", verifyJWT, updateUserInfo);
router.patch(
  "/update-avatar",
  verifyJWT,
  upload.single("avatar"),
  updateUserAvatar
);
router.patch(
  "/update-coverImage",
  verifyJWT,
  upload.single("coverImage"),
  updateUserCoverImage
);
router.get("/c/:userName", verifyJWT, getUserChannelInfo);
router.get("/history", verifyJWT, getWatchHistory);

module.exports = router;
