const express=require("express");
const projectRouter=express.Router();
const {isAuth}=require("../middlewares/auth.middleware");
const { getAllProjects, getProjectById, saveProject, deleteProject } = require("../controller/project.controller");

projectRouter.get("/", isAuth, getAllProjects);
projectRouter.get("/:id", isAuth, getProjectById);
projectRouter.post("/save", isAuth, saveProject);
projectRouter.delete("/:id", isAuth, deleteProject);


module.exports=projectRouter;