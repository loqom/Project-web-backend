const express=require("express");
const pipelineRouter=express.Router();
const {startPipeline, streamPipeline,handleCallback,  getPipelineStatus, getPipelineResult}=require("../controller/pipeline.controller");
const {isAuth}=require("../middlewares/auth.middleware");

pipelineRouter.post("/start",isAuth,startPipeline);
pipelineRouter.get("/stream/:sessionId",isAuth,streamPipeline);
pipelineRouter.post("/callback/:sessionId",handleCallback);
pipelineRouter.get("/status/:sessionId",isAuth,getPipelineStatus);
pipelineRouter.get("/results/:sessionId",isAuth,getPipelineResult);

module.exports=pipelineRouter;