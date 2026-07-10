const jwt=require("jsonwebtoken");
const User=require("../models/user");

const isAuth=async(req,res,next)=>{
   try{
        const {token}= req.cookies;
        const isVal=jwt.verify(token,"Bazooka@123");
        if(!isVal){
            return res.status(401).send("Please login");
        }
        const {_id}=isVal;
        const user=await User.findById(_id);
        if(!user){
            throw new Error("User not found");
        }
        req.user=user;
        next();
    }
    catch(err){
        res.status(400).send("Error "+err);
    }
};
module.exports={isAuth,};