const User=require("../models/user")
const bcrypt=require("bcrypt")
const { OAuth2Client } = require("google-auth-library")
const { sendWelcomeEmail } = require("../services/email.service")

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

const CLEAR_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
    maxAge: 0,
};

const register=async (req,res)=>{
    try{
        const { firstName, lastName, email, password, techStack, skillLevel, goal, } = req.body;
        const passhash = await bcrypt.hash(password, 10);
        const user = new User({
            firstName,
            lastName,
            password: passhash,
            email,
            techStack,
            skillLevel,
            goal,
        });
        const saveUser=await user.save();
        const token=await saveUser.getJWT();
        const userObj = saveUser.toObject();
        delete userObj.password;
        // Fire-and-forget greeting; never blocks signup on email failure.
        sendWelcomeEmail({ to: email, firstName, githubHandle: undefined });
        res.cookie("token", token, COOKIE_OPTIONS);
        res.json({ success: true, data: userObj });
    }catch(err){
        res.status(400).json({ success: false, message: err.message });
    }
};

const googleAuth = async (req, res) => {
  try {
    const { credential, clientId } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: "Missing Google credential" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId || process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      return res.status(400).json({ success: false, message: "Invalid Google token" });
    }

    const gid = payload.sub;
    const email = (payload.email || "").toLowerCase();
    const nameParts = (payload.name || "").split(" ");

    let user = await User.findOne({
      $or: [{ googleId: gid }, email ? { email } : {}],
    });

    if (!user) {
      user = new User({
        googleId: gid,
        firstName: payload.given_name || nameParts[0] || "Google",
        lastName: payload.family_name || nameParts.slice(1).join(" "),
        email,
        password: require("crypto").randomBytes(24).toString("hex"),
        techStack: [],
        githubHandle: email.split("@")[0],
        avatar: payload.picture,
        skillLevel: "beginner",
        goal: "learning",
      });
      await user.save();
      sendWelcomeEmail({ to: email, firstName: payload.given_name || nameParts[0], githubHandle: user.githubHandle });
    } else if (!user.googleId && gid) {
      // Link Google identity to an existing email/password account.
      user.googleId = gid;
      if (payload.picture && !user.avatar) user.avatar = payload.picture;
      await user.save();
    }

    const token = await user.getJWT();
    res.cookie("token", token, COOKIE_OPTIONS);

    const userObj = user.toObject();
    delete userObj.password;
    res.json({ success: true, data: userObj });
  } catch (err) {
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
            res.cookie("token", token, COOKIE_OPTIONS);
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
    res.cookie("token", "", CLEAR_COOKIE_OPTIONS);
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, githubHandle, linkedin, bio, techStack, skillLevel, goal, avatar } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (githubHandle !== undefined) user.githubHandle = githubHandle;
    if (linkedin !== undefined) user.linkedin = linkedin;
    if (bio !== undefined) user.bio = bio;
    if (techStack !== undefined) user.techStack = techStack;
    if (skillLevel !== undefined) user.skillLevel = skillLevel;
    if (goal !== undefined) user.goal = goal;
    if (avatar !== undefined) user.avatar = avatar;
    await user.save();
    const userObj = user.toObject();
    delete userObj.password;
    res.json({ success: true, data: userObj });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const setPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, data: { message: "Password set successfully" } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const { confirmation } = req.body;
    if (confirmation !== "DELETE") {
      return res.status(400).json({ success: false, message: "Please type DELETE to confirm" });
    }
    const userId = req.user._id;
    const Session = require("../models/session");
    const Project = require("../models/projects");
    const FeedPost = require("../models/feedPost");
    const TeamMember = require("../models/teamMember");
    await Promise.all([
      Session.deleteMany({ userId }),
      Project.deleteMany({ userId }),
      FeedPost.deleteMany({ author: userId }),
      TeamMember.deleteMany({ user: userId }),
    ]);
    await User.findByIdAndDelete(userId);
    res.cookie("token", "", CLEAR_COOKIE_OPTIONS);
    res.json({ success: true, message: "Account deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports={register,googleAuth,login,getMe,logout,updateProfile,setPassword,deleteAccount};