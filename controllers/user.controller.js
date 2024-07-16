const asyncHandler = require("../utils/asyncHandler");
const userModel = require("../models/user.model.js");
const apiError = require("../utils/apiError.js");
const uploadOnCloudinary = require("../utils/cloudinary.js");
const apiResponse = require("../utils/apiResponse.js");

module.exports.registerUser = asyncHandler(async (req, res) => {
  const { userName, email, fullName, password } = req.body;
  if (
    [fullName, userName, email, password].some((field) => field?.trim === "")
  ) {
    throw new apiError("All fields are required", 400);
  }

  const existedUser = await userModel.findOne({
    $or: [{ email }, { userName }],
  });
  if (existedUser) {
    throw new apiError("User already exists", 409);
  }

  console.log(req.files);
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new apiError("Avatar is required", 400);
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new apiError(400, "avatar is required");
  }

  const user = await userModel.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });

  const findUser = await userModel
    .findById(user._id)
    .select("-password -refreshToken");

  if (!findUser) {
    throw new apiError(500, "Internal Server Error!!");
  }

  return res
    .status(201)
    .json(new apiResponse(200, findUser, "User Registered Successfully!"));
});
