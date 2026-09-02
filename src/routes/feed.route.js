const express = require("express");
const feedRouter = express.Router();
const {
  getFeedPosts,
  createFeedPost,
  toggleLike,
  addComment,
  getTrending,
  getTopBuilders,
} = require("../controller/feed.controller");
const { isAuth } = require("../middlewares/auth.middleware");

const optionalAuth = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    if (token) {
      const jwt = require("jsonwebtoken");
      const User = require("../models/user");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded._id);
    }
  } catch {}
  next();
};

feedRouter.get("/", optionalAuth, getFeedPosts);
feedRouter.get("/trending", getTrending);
feedRouter.get("/top-builders", getTopBuilders);
feedRouter.post("/", isAuth, createFeedPost);
feedRouter.post("/:id/like", isAuth, toggleLike);
feedRouter.post("/:id/comments", isAuth, addComment);

module.exports = feedRouter;