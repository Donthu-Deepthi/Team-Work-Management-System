const mongoose = require("mongoose");

const TeamSchema = new mongoose.Schema({
  teamName: { type: String, required: true }, // Name of the team
  teamID: { type: String, required: true, unique: true }, // Unique ID for the team
  assignedTo: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: "students" }, // Reference to the student
      subtasks: [
        {
          title: { type: String, required: true }, // Title of the subtask
          status: { type: String, enum: ["pending", "completed"], default: "pending" }, // Status of the subtask
          taskId: { type: mongoose.Schema.Types.ObjectId, ref: "tasks" }
        },
      ],
      totalSubtasks: { type: Number, default: 0 }, // Total subtasks for the user
      completedSubtasks: { type: Number, default: 0 }, // Completed subtasks for the user
      progress: { type: Number, default: 0 }, // Progress percentage for the user
    },
  ],
  overallProgress: { type: Number, default: 0 }, // Overall progress of the team
  progress: { type: String, enum: ["To Do", "In Progress", "Completed"], default: "To Do" }, // Team progress status
  createdDate: { type: Date, default: Date.now }, // Date the team was created
  deadline: { type: Date, required: true }, // Deadline for the team
});

const Team = mongoose.model("Team", TeamSchema);
module.exports = Team;