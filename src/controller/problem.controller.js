const Problem = require("../models/problem");

const getProblems = async (req, res) => {
  try {
    const {
      search,
      sector,
      difficulty,
      tech,
      sortBy = "impactScore",
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (search) {
      filter.$text = { $search: search };
    }

    if (sector && sector !== "All") {
      filter.sector = sector;
    }

    if (difficulty && difficulty !== "All") {
      filter.difficulty = difficulty;
    }

    if (tech && tech !== "All") {
      filter.techStack = { $in: [tech] };
    }

    const sortOptions = {
      likes: { likes: -1 },
      impact: { impactScore: -1 },
      newest: { createdAt: -1 },
      impactScore: { impactScore: -1 },
    };

    const sort = sortOptions[sortBy] || sortOptions.impactScore;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const [problems, total] = await Promise.all([
      Problem.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
      Problem.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: problems,
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

const getProblemById = async (req, res) => {
  try {
    const { id } = req.params;
    const problem = await Problem.findById(id).lean();
    if (!problem) {
      return res.status(404).json({ success: false, message: "Problem not found" });
    }
    res.json({ success: true, data: problem });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createProblem = async (req, res) => {
  try {
    const {
      title,
      sector,
      difficulty,
      description,
      summary,
      techStack,
      mvpRequirements,
      stretchGoals,
      roadmapWeeks,
      impactScore,
      sourceUrl,
      isCommunitySubmission,
    } = req.body;

    const problem = new Problem({
      title,
      sector,
      difficulty,
      description,
      summary: summary || description?.slice(0, 100) + "...",
      techStack: techStack || [],
      mvpRequirements: mvpRequirements || [],
      stretchGoals: stretchGoals || [],
      roadmapWeeks: roadmapWeeks || [],
      impactScore: impactScore || 0,
      sourceUrl,
      submittedBy: req.user?._id,
      isCommunitySubmission: isCommunitySubmission ?? true,
      verified: !isCommunitySubmission,
    });

    await problem.save();
    res.status(201).json({ success: true, data: problem });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const likeProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const problem = await Problem.findById(id);

    if (!problem) {
      return res.status(404).json({ success: false, message: "Problem not found" });
    }

    const alreadyLiked = problem.likedBy.some(
      (uid) => uid.toString() === userId.toString()
    );

    if (alreadyLiked) {
      problem.likedBy.pull(userId);
      problem.likes = Math.max(0, problem.likes - 1);
    } else {
      problem.likedBy.push(userId);
      problem.likes += 1;
    }

    await problem.save();
    res.json({ success: true, data: { ...problem.toObject(), isLiked: !alreadyLiked } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTechStacks = async (req, res) => {
  try {
    const techStacks = await Problem.distinct("techStack");
    res.json({ success: true, data: techStacks.filter(Boolean).sort() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getProblems,
  getProblemById,
  createProblem,
  likeProblem,
  getTechStacks,
};