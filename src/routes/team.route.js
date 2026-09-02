const express = require("express");
const teamRouter = express.Router();
const {
  getTeamMembers,
  createOrUpdateTeamMember,
  getMyTeamProfile,
  deleteMyTeamProfile,
  getTeamTechStacks,
  getTeamRoles,
  acceptTeamMember,
  getMyTeamPosts,
  getMyApplications,
  applyToTeam,
  acceptApplication,
  rejectApplication,
} = require("../controller/team.controller");
const { isAuth } = require("../middlewares/auth.middleware");

// Optional auth - sets req.user if a valid cookie exists, otherwise continues as anonymous
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

teamRouter.get("/", optionalAuth, getTeamMembers);
teamRouter.get("/tech-stacks", getTeamTechStacks);
teamRouter.get("/roles", getTeamRoles);
teamRouter.get("/me", isAuth, getMyTeamProfile);
teamRouter.get("/myposts", isAuth, getMyTeamPosts);
teamRouter.get("/my-applications", isAuth, getMyApplications);
teamRouter.post("/", isAuth, createOrUpdateTeamMember);
teamRouter.post("/:teamId/apply", isAuth, applyToTeam);
teamRouter.put("/:teamId/applications/:applicationId/accept", isAuth, acceptApplication);
teamRouter.put("/:teamId/applications/:applicationId/reject", isAuth, rejectApplication);
teamRouter.post("/:memberId/accept", isAuth, acceptTeamMember);
teamRouter.delete("/me", isAuth, deleteMyTeamProfile);

module.exports = teamRouter;