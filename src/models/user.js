const mongoose=require("mongoose")
const validator=require("validator");
const jwt=require("jsonwebtoken");
const bcrypt=require("bcrypt");

const userSchema=new mongoose.Schema({
    firstName:{
        type:String,
        minLength:4,
        required:true,
    },
    lastName:{
        type:String,
        trim:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        validate(value){
            if(!validator.isEmail(value)){
                throw new Error("Invalid email")
            }
        }
    },
    password:{
        type:String,
        required:true,
    },
    techStack:{
        type:[String],
        required:true,
    },
    skillLevel: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
    },
    goal: {
        type: String,
        enum: ['placement', 'freelance', 'startup', 'learning'],
    },

},
{
    timestamps:true,

});

userSchema.methods.getJWT=async function(){
    const user=this;
    const token=await jwt.sign({_id:user._id},"Bazooka@123",{expiresIn:"1d"});
    return token;
}

userSchema.methods.valPass=async function (pass){
    const user=this;
    const passVal =bcrypt.compare(pass,user.password);
    return passVal;
}

module.exports=mongoose.model("User",userSchema)