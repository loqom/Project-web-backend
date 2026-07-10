const mongoose=require("mongoose")
const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed"],
      default: "pending",
    },

    input: {
      techStack: {
        type: [String],
        required: true,
      },

      skillLevel: {
        type: String,
        required: true,
      },

      timeAvailable: {
        type: String,
        required: true,
      },

      goal: {
        type: String,
        required: true,
      },
    },

    agentLogs: [
      {
        agentName: {
          type: String,
          required: true,
        },

        status: {
          type: String,
          enum: ["pending", "running", "completed", "failed"],
          default: "pending",
        },

        message: {
          type: String,
        },

        output: {
          type: String,
        },

        startedAt: {
          type: Date,
        },

        finishedAt: {
          type: Date,
        },
      },
    ],

    results: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports=mongoose.model('Session',sessionSchema)