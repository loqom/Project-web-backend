const express = require("express");
const problemRouter = express.Router();
const {
  getProblems,
  getProblemById,
  createProblem,
  likeProblem,
  getTechStacks,
} = require("../controller/problem.controller");
const { isAuth } = require("../middlewares/auth.middleware");

problemRouter.get("/", getProblems);
problemRouter.get("/tech-stacks", getTechStacks);
problemRouter.get("/:id", getProblemById);
problemRouter.post("/", isAuth, createProblem);
problemRouter.post("/:id/like", isAuth, likeProblem);

module.exports = problemRouter;