const mongoose = require("mongoose");

const SubtaskSchema = new mongoose.Schema({
  subtaskId: { type: String, required: true },
  title: { type: String, required: true },
  status: { type: String, default: "Pending" }, // Example: "Pending", "In Progress", "Completed"
  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" }, // Reference to parent Task
  deadline: { type: Date, required: true }
});

const Subtask = mongoose.model("subtasks", SubtaskSchema);
module.exports = Subtask;
