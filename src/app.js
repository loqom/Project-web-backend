require('dotenv').config();
const express=require("express")
const app=express()
const connectDB = require("./config/database")
const cookieParser = require('cookie-parser');
const authRouter = require("./routes/auth.route");
const pipelineRouter = require("./routes/pipeline.route");
const projectRouter = require("./routes/project.route");


app.use(cookieParser());
app.use(express.json());

app.use('/api/auth',authRouter);
app.use('/api/pipeline',pipelineRouter);
app.use('/api/projects',projectRouter);

connectDB().then(()=>{
    console.log("Database connected");
    app.listen(process.env.PORT || 5000,()=>{
        console.log("Server started at port 5000")
    });

}).catch(err=>{
    console.log("Database not connected"+err);
})