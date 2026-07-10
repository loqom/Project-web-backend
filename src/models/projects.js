const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    oneLiner: {
      type: String,
    },
    problemStatement: {
      type: String,
    },
    proposedSolution: {
      type: String,
    },
    techStack: [String],
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    complexity: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
    },
    estimatedTime: {
      type: String,
    },
    features: {
      mvp: [String],
      stretch: [String],
    },
    roadmap: [
      {
        week: Number,
        title: String,
        tasks: [String],
      },
    ],
    isSaved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);