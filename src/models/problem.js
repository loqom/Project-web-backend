const mongoose = require("mongoose");

const problemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    sector: {
      type: String,
      enum: ["DevTools", "AI/ML", "Fintech", "Web3", "Healthtech", "E-Commerce", "Security"],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced", "Expert"],
      required: true,
    },
    description: { type: String, required: true },
    summary: { type: String },
    techStack: [{ type: String }],
    likes: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    buildersCount: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    sourceUrl: { type: String },
    impactScore: { type: Number, default: 0 },
    mvpRequirements: [{ type: String }],
    stretchGoals: [{ type: String }],
    roadmapWeeks: [
      {
        week: { type: Number, required: true },
        title: { type: String, required: true },
        description: { type: String },
        tasks: [{ type: String }],
      },
    ],
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isCommunitySubmission: { type: Boolean, default: false },
  },
  { timestamps: true }
);

problemSchema.index({ sector: 1, difficulty: 1 });
problemSchema.index({ techStack: 1 });
problemSchema.index({ impactScore: -1 });
problemSchema.index({ createdAt: -1 });
problemSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Problem", problemSchema);