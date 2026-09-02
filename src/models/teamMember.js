const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
    message: { type: String, default: "" },
    appliedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const teamMemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    avatar: { type: String },
    bio: { type: String, default: "" },
    techStack: [{ type: String }],
    availability: { type: String },
    lookingFor: [{ type: String }],
    matchCompatibility: { type: Number, default: 0 },
    githubHandle: { type: String },
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: ["pending", "active", "rejected"], default: "pending" },
    applications: [applicationSchema],
  },
  { timestamps: true }
);

teamMemberSchema.index({ techStack: 1 });
teamMemberSchema.index({ role: 1 });
teamMemberSchema.index({ isActive: 1, matchCompatibility: -1 });
teamMemberSchema.index({ name: "text", bio: "text", role: "text" });

module.exports = mongoose.model("TeamMember", teamMemberSchema);