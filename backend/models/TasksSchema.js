// Define Task Schema

const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  taskId: String,
  taskTitle: String,
  deadline: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "teams" }, // Fixed
  assets: String, // Store file path if any
});

const Task = mongoose.model("Task", taskSchema);
module.exports = Task;

// const mongoose = require("mongoose");

// const taskSchema = new mongoose.Schema({
//   taskId: String,
//   taskTitle: String,
//   deadline: String,
//   // assignedTo: String,
//   assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "teams" }, 
//   assets: String, // Store file path if any
// });

// const Task = mongoose.model("Task", taskSchema);
// module.exports = Task;
