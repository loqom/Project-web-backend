const FeedPost = require("../models/feedPost");

const getFeedPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const [posts, total] = await Promise.all([
      FeedPost.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("author", "firstName lastName email githubHandle avatar")
        .populate("comments.author", "firstName lastName githubHandle")
        .lean(),
      FeedPost.countDocuments(),
    ]);

    const userId = req.user?._id?.toString();
    const enrichedPosts = posts.map((post) => {
      const githubHandle = post.author?.githubHandle || '';
      const authorAvatar = post.author?.avatar || post.authorAvatar;
      return {
        ...post,
        authorHandle: githubHandle
          ? `@${githubHandle.replace(/^@/, '')}`
          : post.authorHandle || '@builder',
        authorAvatar,
        isLiked: userId ? post.likes?.some((id) => id.toString() === userId) : false,
      };
    });

    res.json({
      success: true,
      data: enrichedPosts,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createFeedPost = async (req, res) => {
  try {
    const { content, codeSnippet, repoUrl, badgeText } = req.body;

    const post = new FeedPost({
      author: req.user._id,
      authorName: `${req.user.firstName} ${req.user.lastName || ""}`.trim(),
      authorHandle: req.user.githubHandle ? `@${req.user.githubHandle.replace(/^@/, '')}` : '@builder',
      authorAvatar: req.user.avatar || (req.user.githubHandle ? `https://github.com/${req.user.githubHandle.replace(/^@/, '')}.png` : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'),
      content,
      codeSnippet,
      repoUrl,
      badgeText: badgeText || "MILESTONE 🚀",
    });

    await post.save();
    await post.populate("author", "firstName lastName email githubHandle avatar");

    res.status(201).json({ success: true, data: post });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await FeedPost.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const likeIndex = post.likes.findIndex(
      (id) => id.toString() === userId.toString()
    );

    let isLiked;
    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
      post.likesCount = Math.max(0, post.likesCount - 1);
      isLiked = false;
    } else {
      post.likes.push(userId);
      post.likesCount += 1;
      isLiked = true;
    }

    await post.save();

    res.json({ success: true, data: { likesCount: post.likesCount, isLiked } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: "Comment text required" });
    }

    const post = await FeedPost.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const comment = {
      author: req.user._id,
      authorName: `${req.user.firstName} ${req.user.lastName || ""}`.trim(),
      text: text.trim(),
    };

    post.comments.push(comment);
    post.commentsCount += 1;
    await post.save();

    await post.populate("comments.author", "firstName lastName githubHandle");

    const newComment = post.comments[post.comments.length - 1];

    res.status(201).json({ success: true, data: newComment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTrending = async (req, res) => {
  try {
    const posts = await FeedPost.find()
      .sort({ likesCount: -1, createdAt: -1 })
      .limit(10)
      .populate("author", "firstName lastName githubHandle avatar")
      .lean();

    const enrichedPosts = posts.map((post) => {
      const githubHandle = post.author?.githubHandle || '';
      return {
        ...post,
        authorHandle: githubHandle
          ? `@${githubHandle.replace(/^@/, '')}`
          : post.authorHandle || '@builder',
        authorAvatar: post.author?.avatar || post.authorAvatar,
      };
    });

    res.json({ success: true, data: enrichedPosts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTopBuilders = async (req, res) => {
  try {
    const User = require("../models/user");
    const builders = await User.aggregate([
      { $match: { githubHandle: { $exists: true, $ne: "" } } },
      { $sample: { size: 10 } },
      { $project: { firstName: 1, lastName: 1, githubHandle: 1, techStack: 1 } },
    ]);

    res.json({ success: true, data: builders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getFeedPosts,
  createFeedPost,
  toggleLike,
  addComment,
  getTrending,
  getTopBuilders,
};