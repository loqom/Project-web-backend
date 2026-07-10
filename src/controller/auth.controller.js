const User=require("../models/user")
const bcrypt=require("bcrypt")

const register=async (req,res)=>{
    try{
        const {firstName,lastName,email,password}=req.body;
        const passhash=await bcrypt.hash(password,10);
        const user=new User({
            firstName,
            lastName,
            password: passhash,
            email,
        });
        const saveUser=await user.save();
        const token=await saveUser.getJWT();
        res.cookie("token",token,{expires:new Date(Date.now()+8*36000000),});
        const userObj = saveUser.toObject();
        delete userObj.password;
        res.json({ success: true, data: userObj });
    }catch(err){
        res.status(400).json({ success: false, message: err.message });
    }
};

const login=async(req,res)=>{
    try{
        const{email,password}=req.body;
        const user=await User.findOne({email:email});
        if(!user){
            throw new Error("Invalid info");
        }
        const isPassTrue=await user.valPass(password);
        if(isPassTrue){
            const token=await user.getJWT();
            res.cookie("token",token,{expires:new Date(Date.now()+8*36000000),})
            res.json({ success: true, data: { ...user.toObject(), password: undefined } });
        }
        else{
            throw new Error("wrong credentials");
        }
    }catch(err){
        res.status(400).json({ success: false, message: err.message })
    }
};

const getMe = async (req, res) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const logout = async (req, res) => {
  try {
    res.cookie("token", "", { expires: new Date(0) });
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


module.exports={register,login,getMe,logout};