const TeamMember = require("../models/teamMember");
const User = require("../models/user");

const getTeamMembers = async (req, res) => {
  try {
    const {
      search,
      role,
      tech,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { isActive: true };

    if (search) {
      filter.$text = { $search: search };
    }

    if (role && role !== "All") {
      filter.role = { $regex: role, $options: "i" };
    }

    if (tech && tech !== "All") {
      filter.techStack = { $in: [tech] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    let [members, total] = await Promise.all([
      TeamMember.find(filter)
        .sort({ matchCompatibility: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      TeamMember.countDocuments(filter),
    ]);

    // Separation: exclude the current user's own posts and teams they have already applied to
    if (req.user && Array.isArray(members)) {
      const myId = req.user._id.toString();
      members = members.filter((m) => {
        if (m.user && m.user.toString() === myId) return false;
        const hasApplied = (m.applications || []).some(
          (a) => a.user && a.user.toString() === myId
        );
        return !hasApplied;
      });
    }

    res.json({
      success: true,
      data: members,
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

const createOrUpdateTeamMember = async (req, res) => {
  try {
    const {
      role,
      bio,
      techStack,
      availability,
      lookingFor,
      githubHandle,
    } = req.body;

    let member = await TeamMember.findOne({ user: req.user._id });

    if (member) {
      member.role = role;
      member.bio = bio;
      member.techStack = techStack || [];
      member.availability = availability;
      member.lookingFor = lookingFor || [];
      member.githubHandle = githubHandle || req.user.githubHandle;
      member.isActive = true;
      await member.save();
    } else {
      member = new TeamMember({
        user: req.user._id,
        name: `${req.user.firstName} ${req.user.lastName || ""}`.trim(),
        role,
        bio,
        techStack: techStack || [],
        availability,
        lookingFor: lookingFor || [],
        githubHandle: githubHandle || req.user.githubHandle,
        avatar: req.user.avatar,
        isActive: true,
      });
      await member.save();
    }

    res.json({ success: true, data: member });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const getMyTeamProfile = async (req, res) => {
  try {
    const member = await TeamMember.findOne({ user: req.user._id }).lean();
    if (!member) {
      return res.status(404).json({ success: false, message: "Team profile not found" });
    }
    res.json({ success: true, data: member });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Teams posted by me, with applicant details populated
const getMyTeamPosts = async (req, res) => {
  try {
    const posts = await TeamMember.find({ user: req.user._id })
      .populate("applications.user", "firstName lastName avatar githubHandle techStack")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: posts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Teams I have applied to, with my application status attached
const getMyApplications = async (req, res) => {
  try {
    const teams = await TeamMember.find({ "applications.user": req.user._id })
      .populate("applications.user", "firstName lastName avatar githubHandle techStack")
      .sort({ createdAt: -1 })
      .lean();

    const myId = req.user._id.toString();
    const data = (teams || []).map((team) => {
      const myApp = (team.applications || []).find(
        (a) => a.user && a.user._id && a.user._id.toString() === myId
      );
      return {
        ...team,
        myStatus: myApp ? myApp.status : "none",
        myMessage: myApp ? myApp.message : "",
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Apply to join a team
const applyToTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { message } = req.body;
    const team = await TeamMember.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: "Team not found" });
    }
    if (team.user.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "You cannot apply to your own team" });
    }
    const alreadyApplied = (team.applications || []).some(
      (a) => a.user.toString() === req.user._id.toString()
    );
    if (alreadyApplied) {
      return res.status(400).json({ success: false, message: "You have already applied to this team" });
    }
    team.applications.push({
      user: req.user._id,
      status: "pending",
      message: message || "",
      appliedAt: new Date(),
    });
    await team.save();
    res.json({ success: true, message: "Application submitted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Shared handler for accept/reject application
const updateApplicationStatus = async (req, res, status) => {
  try {
    const { teamId, applicationId } = req.params;
    const team = await TeamMember.findOne({ _id: teamId, user: req.user._id });
    if (!team) {
      return res.status(404).json({ success: false, message: "Team not found or unauthorized" });
    }
    const app = team.applications.id(applicationId);
    if (!app) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }
    app.status = status;
    await team.save();
    const populated = await TeamMember.findById(teamId)
      .populate("applications.user", "firstName lastName avatar githubHandle techStack")
      .lean();
    res.json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const acceptApplication = async (req, res) => {
  await updateApplicationStatus(req, res, "accepted");
};

const rejectApplication = async (req, res) => {
  await updateApplicationStatus(req, res, "rejected");
};

// Legacy endpoint - kept for backward compatibility
const acceptTeamMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const member = await TeamMember.findById(memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: "Team member not found" });
    }
    if (member.status === 'active') {
      return res.status(400).json({ success: false, message: "Member already active" });
    }
    member.status = 'active';
    await member.save();
    res.json({ success: true, data: member });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteMyTeamProfile = async (req, res) => {
  try {
    await TeamMember.findOneAndDelete({ user: req.user._id });
    res.json({ success: true, message: "Team profile deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTeamTechStacks = async (req, res) => {
  try {
    const techStacks = await TeamMember.distinct("techStack", { isActive: true });
    res.json({ success: true, data: techStacks.filter(Boolean).sort() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTeamRoles = async (req, res) => {
  try {
    const roles = await TeamMember.distinct("role", { isActive: true });
    res.json({ success: true, data: roles.filter(Boolean).sort() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getTeamMembers,
  createOrUpdateTeamMember,
  getMyTeamProfile,
  deleteMyTeamProfile,
  getTeamTechStacks,
  getTeamRoles,
  getMyTeamPosts,
  getMyApplications,
  applyToTeam,
  acceptApplication,
  rejectApplication,
  acceptTeamMember,
};