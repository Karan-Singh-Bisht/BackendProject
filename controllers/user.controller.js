const asyncHandler = require("../utils/asyncHandler.js");
const userModel = require("../models/user.model.js");
const apiError = require("../utils/apiError.js");
const uploadOnCloudinary = require("../utils/cloudinary.js");
const apiResponse = require("../utils/apiResponse.js");
const jwt = require("jsonwebtoken");

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    console.log(userId);
    const user = await userModel.findById(userId);
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

  const { email, userName, password } = req.body;
  console.log(email);
  console.log(userName);
  console.log(password);
  if (!userName && !email) {
    //agar dono hi nhi hai tab ye execute hoga
    throw new apiError("Email or username are required", 401);
  }

  const user = await userModel.findOne({ $or: [{ email }, { userName }] });
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

  return res
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

module.exports.refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
      throw new apiError(401, "Unauthorized Request");
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await userModel.findById(decodedToken?._id);
    if (!user) {
      throw new apiError(401, "Invlaid Refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new apiError(401, "Invalid Refresh token");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookies("accessToken", accessToken, options)
      .cookies("refreshToken", newRefreshToken, options)
      .json({
        success: true,
        message: "Access token refreshed successfully",
      });
  } catch (err) {
    throw new apiError(500, "Internal Server Error!");
  }
});

// Routes to be made

module.exports.changeUserPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user?._id;
  const user = await userModel.findById(userId);
  console.log(user);
  if (!user) {
    throw new apiError(401, "User does not exist");
  }
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new apiError(401, "Unauthorized access!");
  } else {
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    return res.status(200).json({ success: true, message: "Password changed" });
  }
});

module.exports.getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(200, req.user, "Current User");
});

module.exports.updateUserInfo = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new apiError("All fields are required", 400);
  }
  const userId = req.user?._id;
  const updatedUser = userModel
    .findByIdAndUpdate(userId, { $set: { fullName, email } }, { new: true })
    .select("-password");
  res
    .status(200)
    .json(new apiResponse(200, updatedUser, "User Info Updated Successfully!"));
});

module.exports.updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.avatar[0]?.path; //yha sirf ek file hai isliye file and not files
  if (!avatarLocalPath) {
    throw new apiError("Avatar is required", 400);
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new apiError(400, "Error while uploading Avatar");
  }

  const userId = req.user?._id;
  const updatedUser = await userModel
    .findByIdAndUpdate(userId, { $set: { avatar: avatar.url } }, { new: true })
    .select("-password");

  res
    .status(200)
    .json(
      new apiResponse(200, updatedUser, "User Avatar Updated Successfully!")
    );
});

module.exports.updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.coverImage[0]?.path;
  if (!coverImageLocalPath) {
    throw new apiError(401, "Cover Image Required");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new apiError(500, "Internal Server Error");
  }
  const userId = req.user?._id;
  const updatedUser = await userModel
    .findByIdAndUpdate(
      userId,
      { $set: { coverImage: coverImage.url } },
      { new: true }
    )
    .select("-password");

  return res
    .status(200)
    .json(new apiResponse(200, updatedUser, "CoverImage Updated Successfully"));
});

module.exports.getUserChannelInfo = asyncHandler(async (req, res) => {
  const { userName } = req.params;
  console.log(userName);
  if (!userName?.trim()) {
    throw new apiError(400, "User does not exist!");
  }

  const channel = await userModel.aggregate([
    { $match: { userName: userName?.toLowerCase() } },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        susbscriberCount: {
          $size: "$subscribers",
        },
        channelsSubscribedTo: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        email: 1,
        userName: 1,
        avatar: 1,
        coverImage: 1,
        susbscriberCount: 1,
        channelsSubscribedTo: 1,
        isSubscribed: 1,
      },
    },
  ]);
  console.log(channel);
  if (!channel?.length) {
    throw new apiError(404, "Channel not found");
  }
  return res
    .status(200)
    .json(new apiResponse(200, channel[0], "user channel found!"));
});
