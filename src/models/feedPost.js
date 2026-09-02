const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const feedPostSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    authorHandle: { type: String },
    authorAvatar: { type: String },
    content: { type: String, required: true },
    codeSnippet: {
      language: { type: String },
      code: { type: String },
    },
    repoUrl: { type: String },
    badgeText: { type: String },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    likesCount: { type: Number, default: 0 },
    comments: [commentSchema],
    commentsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

feedPostSchema.index({ author: 1, createdAt: -1 });
feedPostSchema.index({ createdAt: -1 });
feedPostSchema.index({ "likesCount": -1 });

module.exports = mongoose.model("FeedPost", feedPostSchema);