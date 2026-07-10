const express=require("express");
const authRouter=express.Router();
const { register, login, getMe } = require("../controller/auth.controller");
const {isAuth}=require("../middlewares/auth.middleware")

authRouter.post("/login",login);
authRouter.post("/register",register);
authRouter.get("/me",isAuth,getMe)
authRouter.post("/logout", isAuth, logout);

module.exports=authRouter;