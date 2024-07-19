const asyncHandler = require("../utils/asyncHandler");
const userModel = require("../models/user.model.js");
const apiError = require("../utils/apiError.js");
const uploadOnCloudinary = require("../utils/cloudinary.js");
const apiResponse = require("../utils/apiResponse.js");

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = userModel.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (err) {
    throw new Error("Error generating access and refresh tokens");
  }
};

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
  // const coverImageLocalPath = req.files?.coverImage?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
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

module.exports.loginUser = asyncHandler(async (req, res) => {
  //get login data email and password
  //cross check email and pass
  //generate access and refresh token
  //send tokens through cookies
  //login

  const { email, username, password } = req.body;
  if (!(username || email)) {
    throw new apiError("Email or username are required", 400);
  }

  const user = await userModel.findOne({ $or: [{ email }, { username }] });
  if (!user) {
    throw new apiError(404, "User does not exist!");
  }

  let isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new apiError(400, "Invalid Password");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await userModel
    .findById(user._id)
    .select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true,
  };

  return response
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in Successfully"
      )
    );
});

module.exports.logOutUser = asyncHandler(async (req, res) => {
  await userModel.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    { new: true }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User logged Out"));
});
