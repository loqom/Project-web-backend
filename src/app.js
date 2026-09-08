require('dotenv').config();
const express=require("express")
const cors = require("cors");
const app=express()
const connectDB = require("./config/database")
const cookieParser = require('cookie-parser');
const authRouter = require("./routes/auth.route");
const pipelineRouter = require("./routes/pipeline.route");
const projectRouter = require("./routes/project.route");
const problemRouter = require("./routes/problem.route");
const feedRouter = require("./routes/feed.route");
const teamRouter = require("./routes/team.route");

app.set("trust proxy", 1);

const envOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((url) => url.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:5000',
];

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/+$/, "");
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use(cookieParser());
app.use(express.json());

app.use('/api/auth',authRouter);
app.use('/api/pipeline',pipelineRouter);
app.use('/api/projects',projectRouter);
app.use('/api/problems',problemRouter);
app.use('/api/feed',feedRouter);
app.use('/api/teams',teamRouter);

connectDB().then(()=>{
    console.log("Database connected");
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server started at port ${PORT}`);
    });

}).catch(err=>{
    console.log("Database not connected"+err);
    process.exit(1);
})