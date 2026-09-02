const express=require("express");
const authRouter=express.Router();
const { register, googleAuth, login, getMe ,logout, updateProfile, setPassword, deleteAccount} = require("../controller/auth.controller");
const {isAuth}=require("../middlewares/auth.middleware")

authRouter.post("/login",login);
authRouter.post("/register",register);
authRouter.post("/google",googleAuth);
authRouter.get("/me",isAuth,getMe)
authRouter.post("/logout", isAuth, logout);
authRouter.put("/profile", isAuth, updateProfile);
authRouter.post("/password", isAuth, setPassword);
authRouter.delete("/account", isAuth, deleteAccount);

module.exports=authRouter;