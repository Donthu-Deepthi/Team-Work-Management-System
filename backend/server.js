require('dotenv').config(); 
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const UserModel = require("./models/UserSchema");
const GuideModel = require("./models/GuideSchema");
const Team = require("./models/TeamSchema");
const multer = require("multer");
const Task = require("./models/TasksSchema");
const path = require("path");
const Subtask = require("./models/SubTasksSchema");
const crypto = require("crypto");
const sendEmail = require("./utils/mailer");
const Chat = require("./models/ChatSchema");


const app = express();

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve uploaded files

// Multer Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Ensure this folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));


// Get chat messages for a team
app.get("/chat/:teamId", async (req, res) => {
  try {
    const { teamId } = req.params;

    // Validate teamId
    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ error: "Invalid teamId" });
    }

    // Verify that the team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Fetch chat messages for the team
    const messages = await Chat.find({ team: teamId })
      .sort({ timestamp: 1 })
      .populate("sender", "name"); // Populate sender's name

    res.json(messages);
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    res.status(500).json({ error: "Failed to fetch chat messages" });
  }
});

// Send a new chat message
app.post("/chat", async (req, res) => {
  try {
    const { teamId, senderId, senderName, message } = req.body;

    // Debugging: Log the request body
    console.log("Request Body:", req.body);

    // Validate request body
    if (!teamId || !senderId || !senderName || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate teamId and senderId
    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ error: "Invalid teamId" });
    }
    if (!mongoose.Types.ObjectId.isValid(senderId)) {
      return res.status(400).json({ error: "Invalid senderId" });
    }

    // Verify that the team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Verify that the sender is part of the team
    const isSenderInTeam = team.assignedTo.some(
      (member) => member._id.toString() === senderId
    );

    if (!isSenderInTeam) {
      return res.status(403).json({ error: "You are not part of this team" });
    }

    // Save the new message
    const newMessage = new Chat({
      team: teamId,
      sender: senderId,
      senderName,
      message,
    });

    await newMessage.save();
    console.log("Message saved to MongoDB:", newMessage);
    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// server.js for getting user name by user id
app.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    // Fetch user details from the database
    const user = await StudentModel.findById(userId); // Assuming you have a User model
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return the user's name
    res.json({ name: user.name });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ error: "Failed to fetch user details" });
  }
});



app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await UserModel.findOne({ email });
    let role = "student"; // Default role as student

    if (!user) {
      user = await GuideModel.findOne({ email });
      role = "guide"; // If found in guides, change role
    }

    if (!user) {
      return res.json({ success: false, message: "No record existed" }); // No user found
    }

    if (user.password === password) {
      return res.json({ user: user, success: true, role }); // Send role with success response
    } else {
      return res.json({ success: false, message: "Password is incorrect" });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ success: false, message: "An error occurred" });
  }
});

// Fetch user profile data
app.get("/profile/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    let user = await UserModel.findById(userId);
    if (!user) {
      user = await GuideModel.findById(userId);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Exclude password from the response
    const { password, ...userWithoutPassword } = user.toObject();
    return res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error("Fetch profile error:", error);
    return res.status(500).json({ success: false, message: "An error occurred" });
  }
});

// Update user profile data
app.put("/update-profile/:userId", async (req, res) => {
  const { userId } = req.params;
  const { name, email, password } = req.body;

  try {
    let user = await UserModel.findById(userId);
    if (!user) {
      user = await GuideModel.findById(userId);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Update user data
    user.name = name || user.name;
    user.email = email || user.email;
    user.password = password || user.password;

    await user.save();

    // Exclude password from the response
    const { password: _, ...updatedUser } = user.toObject();
    return res.json({ success: true, message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ success: false, message: "An error occurred" });
  }
});

app.put("/change-password/:userId", async (req, res) => {
  const { userId } = req.params;
  const { currentPassword, newPassword } = req.body;

  try {
    let user = await UserModel.findById(userId);
    if (!user) {
      user = await GuideModel.findById(userId);
    }
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    // Ensure both are strings and trim spaces
    if (user.password.trim() !== currentPassword.trim()) {
      return res.json({ success: false, message: "Current password is incorrect" });
    }

    // Update password in database
    user.password = newPassword.trim();
    await user.save();

    res.json({ success: true, message: "Password changed successfully!" });
  } catch (error) {
    res.json({ success: false, message: "Error changing password" });
  }
});

// Delete Account API
app.delete("/delete-account/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const deletedUser = await UserModel.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "Account deleted successfully!" });
  } catch (error) {
    res.json({ success: false, message: "Error deleting account" });
  }
});


app.get("/users/not-in-teams", async (req, res) => {
  try {
    console.log("Fetching teams..."); // Debugging log
    const teams = await Team.find({});
    console.log("Teams fetched:", teams); // Debugging log

    // Extract user IDs from the assignedTo array
    const assignedUserIds = teams.flatMap(team =>
      team.assignedTo ? team.assignedTo.map(user => user._id.toString()) : []
    );
    console.log("Assigned User IDs:", assignedUserIds); // Debugging log

    // Fetch users who are not in the assignedUserIds array
    const usersNotInTeams = await UserModel.find({
      _id: { $nin: assignedUserIds },
    });
    console.log("Users not in teams:", usersNotInTeams); // Debugging log

    res.status(200).json(usersNotInTeams);
  } catch (error) {
    console.error("Error in /users/not-in-teams:", error); // Debugging log
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

//assign users dropdown in edit form(present users + users not in any team)


// app.post("/login", async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     let user = await UserModel.findOne({ email });
//     let role = "student"; // Default role

//     if (!user) {
//       user = await GuideModel.findOne({ email });
//       role = "guide"; // If found in guides, change role
//     }

//     if (!user) {
//       return res.status(404).json({ success: false, message: "No record exists" }); // No user found
//     }

//     // Verify the hashed password
//     const isPasswordValid = await bcrypt.compare(password, user.password);

//     if (!isPasswordValid) {
//       return res.status(400).json({ success: false, message: "Password is incorrect" });
//     }

//     // Send user details (without password)
//     const { password: _, ...userWithoutPassword } = user.toObject();

//     return res.json({ success: true, user: userWithoutPassword, role });

//   } catch (error) {
//     console.error("Login error:", error);
//     return res.status(500).json({ success: false, message: "An error occurred" });
//   }
// });

const otpStorage = new Map();

// Send OTP Route for signup
app.post("/send-otp", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: "Email already exists" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit OTP
    otpStorage.set(email, { otp, name, password });

    // Send OTP via Email
    // await transporter.sendMail({
    //   from: process.env.EMAIL_USER,
    //   to: email,
    //   subject: "Your OTP Code",
    //   text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
    // });

    // Send OTP via Email
    const subject = "Signup OTP";
    const text = `Your OTP for Signup is: ${otp}`;

    await sendEmail(email, subject, text);

    res.json({ success: true, message: "OTP sent to email" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ success: false, message: "Error sending OTP" });
  }
});

app.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    // Check if the email exists in otpStorage
    const existingOtpData = otpStorage.get(email);
    if (!existingOtpData) {
      return res.json({ success: false, message: "Email not found or OTP expired." });
    }

    // Generate a new 6-digit OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000);

    // Update the OTP in otpStorage
    otpStorage.set(email, { ...existingOtpData, otp: newOtp });

    // Send the new OTP via Email
    const subject = "Resend OTP";
    const text = `Your new OTP is: ${newOtp}`;

    await sendEmail(email, subject, text);

    // Return success response
    res.json({ success: true, message: "New OTP sent to email" });
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(500).json({ success: false, message: "Error resending OTP" });
  }
});

// Verify OTP and Register User
app.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const storedData = otpStorage.get(email);
    if (!storedData) {
      return res.json({ success: false, message: "Invalid or expired OTP" });
    }

    if (parseInt(storedData.otp) !== parseInt(otp)) {
      return res.json({ success: false, message: "Incorrect OTP" });
    }

    // Store user in MongoDB
    const newUser = await UserModel.create({
      name: storedData.name,
      email,
      password: storedData.password,
    });

    otpStorage.delete(email);
    res.json({ success: true, message: "Signup successful!" });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ success: false, message: "Error verifying OTP" });
  }
});

// Fetch all teams with their members' progress
app.get("/teams-progress", async (req, res) => {
  try {
    // Fetch all teams with their assigned members and progress
    const teams = await Team.find({})
      .populate("assignedTo._id", "name email") // Populate student details
      .exec();

    // Format the data for the frontend
    const formattedTeams = teams.map((team) => ({
      teamName: team.teamName,
      teamID: team.teamID,
      overallProgress: team.overallProgress,
      progressStatus: team.progress,
      deadline: team.deadline,
      members: team.assignedTo.map((member) => ({
        studentId: member._id._id,
        studentName: member._id.name,
        studentEmail: member._id.email,
        totalSubtasks: member.totalSubtasks,
        completedSubtasks: member.completedSubtasks,
        progress: member.progress,
      })),
    }));

    res.status(200).json({ success: true, data: formattedTeams });
  } catch (error) {
    console.error("Error fetching team progress:", error);
    res.status(500).json({ success: false, message: "Failed to fetch team progress." });
  }
});


app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  console.log(email);
  console.log(req.body);

  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(200).json({ status: false, message: "Email not found" });
    }

    // Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Store OTP and expiry (valid for 10 minutes)
    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
    await user.save();

    // Send the OTP (Example: Here it's just logged)
    console.log(`OTP for ${email}: ${otp}`);
    console.log(`USER: ${user}`);

    // Send OTP to user's email
    const subject = "Password Reset OTP";
    const text = `Your OTP for password reset is: ${otp}`;

    await sendEmail(user.email, subject, text);

    return res.json({
      status: true,
      username: user.name,
      email: user.email,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Error in forgot-password:", error);
    return res.status(500).json({ status: false, message: "Server error" });
  }
});

app.post("/reset-password", async (req, res) => {
  const { email, otp, new_password } = req.body;

  try {
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(400).json({ status: false, message: "Invalid email" });
    }

    // Check OTP and expiry
    if (user.otp !== otp) {
      return res.status(400).json({ status: false, message: "Invalid OTP" });
    }

    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({ status: false, message: "OTP expired" });
    }

    // Hash the new password
    // const hashedPassword = await bcrypt.hash(new_password, 10);
    user.password = new_password;

    // Clear OTP and expiry after successful reset
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    return res.json({
      status: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error in reset-password:", error);
    return res.status(500).json({ status: false, message: "Server error" });
  }
});


// // ✅ Log collections in the database (Debugging)
const db = mongoose.connection;
db.once("open", async () => {
  console.log("Connected to database:", db.name);
  const collections = await db.db.listCollections().toArray();
  console.log(
    "Collections:",
    collections.map((col) => col.name)
  );
});

// ✅ Define Student Schema (Ensure correct collection mapping)
const studentSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
});

// ✅ Ensure correct collection name
const StudentModel = mongoose.model("Student", studentSchema, "students");

// ✅ Route to fetch all students
app.get("/students", async (req, res) => {
  try {
    const students = await UserModel.find(); // Fetch students
    res.json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch students" });
  }
});

// Add Team
app.post("/add-team", async (req, res) => {
  try {
    const { teamID, teamName, assignedTo, deadline } = req.body;

    // Validate required fields
    if (!teamID || !teamName || !Array.isArray(assignedTo)) {
      return res.status(400).json({
        success: false,
        message: "teamID, teamName, and assignedTo are required",
      });
    }

    // Validate user IDs in assignedTo
    for (const user of assignedTo) {
      if (!user._id) {
        return res.status(400).json({
          success: false,
          message: "Each user in assignedTo must have an _id field",
        });
      }

      const userExists = await StudentModel.findById(user._id);
      if (!userExists) {
        return res.status(404).json({
          success: false,
          message: `User ${user._id} not found`,
        });
      }
    }

    // Create and save the new team
    const newTeam = await Team.create({
      teamID,
      teamName,
      assignedTo,
      tasks: [], // Initialize empty tasks array
      createdDate: new Date(), // Default to current date
      deadline: deadline || new Date(new Date().setDate(new Date().getDate() + 7)), // Default to 7 days later
      overallProgress: 0, // Initialize overall progress
      progress: "To Do", // Initialize progress status
    });

    res.status(201).json({
      success: true,
      message: "Team created successfully!",
      data: newTeam,
    });
  } catch (error) {
    console.error("Error creating team:", error);
    res.status(500).json({
      success: false,
      message: "Error while creating the team",
      error: error.message,
    });
  }
});

// Get Teams
app.get("/teams", async (req, res) => {
  try {
    const teams = await Team.find().populate({
      path: "assignedTo._id",
      select: "email", // Only fetch the email field from the students collection
    });
    res.status(200).json(teams);
  } catch (error) {
    console.error("Error fetching teams:", error.message); // Debugging
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});

// Fetch all tasks for a team
app.get("/team/tasks/:teamId", async (req, res) => {
  try {
    const teamId = req.params.teamId;

    // Find the team by ID
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Find all tasks assigned to the team
    const tasks = await Task.find({ assignedTo: teamId });

    res.status(200).json({ team, tasks });
  } catch (error) {
    console.error("Error fetching team tasks:", error.message);
    res.status(500).json({ error: "Failed to fetch team tasks" });
  }
});

// Get a specific team by ID
app.get("/teams/:id", async (req, res) => {
  try {
    const team = await Team.findById(req.params.id).populate({
      path: "assignedTo._id",
      select: "name email", // Only fetch the email field from the students collection
    });
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: "Error fetching team", error });
  }
});

// Update a team
app.put("/teamsProgressUpdate/:id", async (req, res) => {
  try {
    const team = await Team.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: "Error updating team", error });
  }
});

// Update a team by ID
app.put("/teams/:id", async (req, res) => {
  try {
    const { teamName, assignedTo, deadline } = req.body;

    // Validate required fields
    if (!teamName || !Array.isArray(assignedTo)) {
      return res.status(400).json({
        success: false,
        message: "teamName and assignedTo are required",
      });
    }

    // Validate user IDs in assignedTo
    for (const user of assignedTo) {
      if (!user._id) {
        return res.status(400).json({
          success: false,
          message: "Each user in assignedTo must have an _id field",
        });
      }

      const userExists = await StudentModel.findById(user._id);
      if (!userExists) {
        return res.status(404).json({
          success: false,
          message: `User ${user._id} not found`,
        });
      }
    }

    // Update the team
    const updatedTeam = await Team.findByIdAndUpdate(
      req.params.id,
      { teamName, assignedTo, deadline },
      { new: true }
    );

    if (!updatedTeam) {
      return res.status(404).json({ success: false, message: "Team not found" });
    }

    res.status(200).json({
      success: true,
      message: "Team updated successfully!",
      data: updatedTeam,
    });
  } catch (error) {
    console.error("Error updating team:", error);
    res.status(500).json({
      success: false,
      message: "Error while updating the team",
      error: error.message,
    });
  }
});


// API Endpoint to Get Task Statistics
app.get("/team-stats", async (req, res) => {
  try {
    const totalTeams = await Team.countDocuments();
    const completedCount = await Team.countDocuments({ progress: "Completed" });
    const inProgressCount = await Team.countDocuments({
      progress: "In Progress",
    });
    const todoCount = await Team.countDocuments({ progress: "To Do" });

    const getPercentage = (count) =>
      totalTeams === 0 ? 0 : Math.round((count / totalTeams) * 100);

    res.status(200).json({
      completed: completedCount,
      completedPercentage: getPercentage(completedCount),
      inProgress: inProgressCount,
      inProgressPercentage: getPercentage(inProgressCount),
      todo: todoCount,
      todoPercentage: getPercentage(todoCount),
    });
  } catch (error) {
    console.error("Error fetching team stats:", error);
    res.status(500).json({ error: "Failed to fetch team stats" });
  }
});

// Delete Team
app.delete("/delete-team/:teamID", async (req, res) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.teamID); // Use teamID instead of id
    if (!team) return res.status(404).json({ message: "Team not found" });

    res.json({ message: "Team deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting team", error });
  }
});

//tasks

// Add Task
// API to Add Task (Ensuring frontend sends 'taskAssets' field)
app.post("/add-task", upload.single("taskAssets"), async (req, res) => {
  try {

    if (
      !req.body.taskId ||
      !req.body.taskTitle ||
      !req.body.deadline ||
      !req.body.assignedTo
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const { taskId, taskTitle, deadline, assignedTo } = req.body;
    const newTask = new Task({
      taskId,
      taskTitle,
      deadline,
      assignedTo,
      assets: req.file ? req.file.filename : "", // Store only filename
    });

    await newTask.save();
    res.json({ message: "Task added successfully", task: newTask });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add task" });
  }
});

// Get Tasks
app.get("/get-tasks", async (req, res) => {
  try {
    const tasks = await Task.find();
    if (!tasks.length) {
      return res.status(404).json({ message: "No tasks found" });
    }
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// Get Single Task API
app.get("/get-task/:id", async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id });
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

app.put("/update-task/:id", upload.single("taskAssets"), async (req, res) => {
  try {
    const { id } = req.params;
    const { taskTitle, deadline, assignedTo } = req.body;

    const updateData = {
      taskTitle,
      deadline,
      assignedTo,
    };

    if (req.file) {
      updateData.assets = req.file.filename;
    }

    const updatedTask = await Task.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ message: "Task updated successfully", task: updatedTask });
  } catch (error) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

app.delete("/delete-task/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedTask = await Task.findByIdAndDelete(id);

    if (!deletedTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

app.get("/getTeamByUser/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find teams where the assignedTo array contains an object with _id matching userId
    const teams = await Team.find({ "assignedTo._id": userId }, "teamID teamName overallProgress");

    if (teams.length === 0) {
      return res.status(404).json({ message: "No teams found for this user." });
    }

    res.status(200).json(teams);
  } catch (error) {
    console.error("Error fetching team by user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/getGuideDetails/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const guide = await GuideModel.findOne({
      _id: new mongoose.Types.ObjectId(userId),
    });

    if (!guide) {
      return res.status(404).json({ error: "Guide not found" });
    }

    res.json(guide);
  } catch (error) {
    console.error("Error fetching guide:", error);
    res.status(500).json({ error: "Failed to fetch guide" });
  }
});

// to fetch all guides
app.get('/getAllGuides', async (req, res) => {
  try {
    const guides = await GuideModel.find({}); // Fetch all guides from the collection
    res.status(200).json({ success: true, guides });
  } catch (error) {
    console.error('Error fetching guides:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch guides' });
  }
});

app.get("/team/details/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Find teams where the user is assigned
    const teams = await Team.find({ "assignedTo._id": userId }).populate({
      path: "assignedTo._id",
      select: "name email", // Fetch only name and email from UserSchema;
    });
    if (!teams || teams.length === 0) {
      return res.status(200).json({ message: "No teams found for this user" });
    }

    // Prepare the response
    const teamDetails = teams.map((team) => {
      // Find the user's data in the team
      const userData = team.assignedTo.find((user) => user._id.equals(userId));

      return {
        teamID: team.teamID,
        teamName: team.teamName,
        createdDate: team.createdDate,
        deadline: team.deadline,
        progress: team.progress,
        overallProgress: team.overallProgress,
        members: team.assignedTo.map((user) => ({
          _id: user._id._id,
          name: user._id.name, // Assuming 'name' is part of the assignedTo object
          email: user._id.email, // Assuming 'email' is part of the assignedTo object
          progress: user.progress
        })),
        tasks: team.tasks || [], // Assuming tasks are stored in the team document
      };
    });

    res.json(teamDetails);
  } catch (error) {
    console.error("Error fetching team details:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Route to fetch subtasks for a specific user within a team
// app.get("/tasks/:taskId/:teamId/subtasks/:userId", async (req, res) => {
//   try {
//     const {  taskId, teamId, userId } = req.params;

//     console.log("Received teamId:", teamId);
//     console.log("Received userId:", userId);
//     console.log("Received taskId:", taskId);

//     if (!mongoose.Types.ObjectId.isValid(teamId) || !mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(taskId)) {
//       return res.status(400).json({ success: false, message: "Invalid ID format" });
//     }

//     const task = await Team.findById(taskId);

//     if (!task) {
//       return res.status(404).json({ success: false, message: "Task not found" });
//     }

//     const team = await Team.findById(teamId);

//     if (!team) {
//       return res.status(404).json({ success: false, message: "Team not found" });
//     }

//     console.log("Fetched Team:", team);

//     if (!Array.isArray(team.assignedTo) || team.assignedTo.length === 0) {
//       return res.status(404).json({ success: false, message: "No assignments found for this team" });
//     }

//     console.log("Assigned To:", team.assignedTo);

//     const userAssignment = team.assignedTo.find((assignment) => {
//       console.log("Checking assignment:", assignment);
//       return assignment?._id?.toString() === userId;
//     });

//     if (!userAssignment) {
//       return res.status(404).json({ success: false, message: "User not found in the team" });
//     }

//     const subtasks = userAssignment.subtasks || [];

//     // Calculate total and completed subtasks
//     const totalSubtasks = subtasks.length;
//     const completedSubtasks = subtasks.filter(subtask => subtask.status === "completed").length;
//     const progress = totalSubtasks > 0 ? ((completedSubtasks / totalSubtasks) * 100).toFixed(2) : 0;

//     // Fetch tasks separately since they are not embedded in the Team document
//     const tasks = await Task.find({ assignedTo: teamId });

//     console.log("Fetched Tasks:", tasks); // Debugging to verify the tasks are retrieved

//     let teamDetails = {
//       teamID: team.teamID,
//       teamName: team.teamName,
//       createdDate: team.createdDate,
//       deadline: team.deadline,
//       progress: team.progress,
//       overallProgress: team.overallProgress,
//       members: team.assignedTo.map((user) => ({
//         _id: user._id._id,
//         name: user._id.name,
//         email: user._id.email,
//         progress: user.progress
//       })),
//       subtasks: subtasks,
//       completedSubtasks: completedSubtasks,
//       totalSubtasks: totalSubtasks,
//       progress: `${progress}%`, // Display progress as a percentage
//       tasks: tasks,
//     };

//     res.json({ success: true, message: "Successfully retrieved subtasks", teamDetails });
//   } catch (error) {
//     console.error("Error fetching subtasks:", error);
//     res.status(500).json({ success: false, message: "Failed to load subtasks" });
//   }
// });

app.get("/tasks/:taskId/:teamId/subtasks/:userId", async (req, res) => {
  try {
    const { taskId, teamId, userId } = req.params;

    console.log("Received teamId:", teamId);
    console.log("Received userId:", userId);
    console.log("Received taskId:", taskId);

    if (
      !mongoose.Types.ObjectId.isValid(teamId) ||
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(taskId)
    ) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: "Team not found" });
    }

    console.log("Fetched Team:", team);

    if (!Array.isArray(team.assignedTo) || team.assignedTo.length === 0) {
      return res.status(404).json({ success: false, message: "No assignments found for this team" });
    }

    console.log("Assigned To:", team.assignedTo);

    const userAssignment = team.assignedTo.find(
      (assignment) => assignment?._id?.toString() === userId
    );

    if (!userAssignment) {
      return res.status(404).json({ success: false, message: "User not found in the team" });
    }

    // Filter subtasks based on taskId
    const subtasks = userAssignment.subtasks.filter(
      (subtask) => subtask.taskId?.toString() === taskId
    );

    if (subtasks.length === 0) {
      return res.status(404).json({ success: false, message: "No subtasks found for the given taskId" });
    }

    // Calculate total and completed subtasks
    const totalSubtasks = subtasks.length;
    const completedSubtasks = subtasks.filter((subtask) => subtask.status === "completed").length;
    const progress = totalSubtasks > 0 ? ((completedSubtasks / totalSubtasks) * 100).toFixed(2) : 0;

    let teamDetails = {
      teamID: team.teamID,
      teamName: team.teamName,
      createdDate: team.createdDate,
      deadline: team.deadline,
      progress: team.progress,
      overallProgress: team.overallProgress,
      members: team.assignedTo.map((user) => ({
        _id: user._id._id,
        name: user._id.name,
        email: user._id.email,
        progress: user.progress,
      })),
      subtasks: subtasks,
      completedSubtasks: completedSubtasks,
      totalSubtasks: totalSubtasks,
      progress: `${progress}%`, // Display progress as a percentage
    };

    res.json({ success: true, message: "Successfully retrieved subtasks", teamDetails });
  } catch (error) {
    console.error("Error fetching subtasks:", error);
    res.status(500).json({ success: false, message: "Failed to load subtasks" });
  }
});



app.get("/dashboard/team/details/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Convert userId to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Find teams where the user is assigned
    const teams = await Team.find({ "assignedTo._id": userObjectId });

    // If no teams are found for the user
    if (!teams || teams.length === 0) {
      return res.status(200).json({
        message: "No team & task is assigned",
        teamDetails: null, // Indicate no team is assigned
      });
    }

    // Get the first team (assuming one user belongs to only one team)
    const team = teams[0];

    // Fetch tasks assigned to this team
    const tasks = await Task.find({ assignedTo: team._id });

    // Prepare the response
    const teamDetails = {
      _id: team._id,
      teamName: team.teamName,
      assignedTo: team.assignedTo,
      tasks: tasks, // Include tasks assigned to the team
      overallProgress: team.overallProgress,
      progress: team.progress,
      createdDate: team.createdDate,
      deadline: team.deadline,
    };

    res.status(200).json([teamDetails]); // Return as an array for consistency
  } catch (error) {
    console.error("Error fetching team details:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/addSubtask", async (req, res) => {
  try {
    const { teamId, userId, title, taskId } = req.body;

    // Find the team
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Find the user in the team
    const user = team.assignedTo.find((user) => user._id.equals(userId));
    if (!user) {
      return res.status(404).json({ message: "User not found in the team" });
    }

    // Add the subtask
    const newSubtask = {
      subtaskId: new mongoose.Types.ObjectId(),
      title,
      status: "pending",
      taskId: taskId
    };

    user.subtasks.push(newSubtask);
    user.totalSubtasks = user.subtasks.length; // Update total subtasks
    user.completedSubtasks = user.subtasks.filter(
      (subtask) => subtask.status === "completed"
    ).length; // Update completed subtasks
    user.progress = (user.completedSubtasks / user.totalSubtasks) * 100 || 0; // Update progress

    // Update team's overall progress
    const totalUsers = team.assignedTo.length;
    const totalProgress = team.assignedTo.reduce(
      (sum, user) => sum + user.progress,
      0
    );
    team.overallProgress = totalProgress / totalUsers || 0;

    // Update team progress status
    if (team.overallProgress === 0) {
      team.progress = "To Do";
    } else if (team.overallProgress === 100) {
      team.progress = "Completed";
    } else {
      team.progress = "In Progress";
    }

    await team.save();

    res.status(201).json({ message: "Subtask added successfully", newSubtask });
  } catch (error) {
    console.error("Error adding subtask:", error);
    res.status(500).json({ message: "Error adding subtask", error });
  }
});

app.put("/updateSubtask/:subtaskId", async (req, res) => {
  try {
    const { subtaskId } = req.params;
    const { status } = req.body;

    // Convert subtaskId to ObjectId
    const subtaskObjectId = new mongoose.Types.ObjectId(subtaskId);

    // Find the team containing the subtask
    const team = await Team.findOne({ "assignedTo.subtasks._id": subtaskObjectId });
    if (!team) {
      return res.status(404).json({ message: "Team not found for this subtask" });
    }

    // Find the user and subtask
    const user = team.assignedTo.find((user) =>
      user.subtasks.some((subtask) => subtask._id.equals(subtaskObjectId))
    );
    if (!user) {
      return res.status(404).json({ message: "User not found for this subtask" });
    }

    const subtask = user.subtasks.find((subtask) =>
      subtask._id.equals(subtaskObjectId)
    );
    if (!subtask) {
      return res.status(404).json({ message: "Subtask not found" });
    }

    // Update subtask status
    subtask.status = status;

    // Update user's progress
    user.completedSubtasks = user.subtasks.filter(
      (subtask) => subtask.status === "completed"
    ).length;
    user.progress = (user.completedSubtasks / user.totalSubtasks) * 100 || 0;

    // Update team's overall progress
    const totalUsers = team.assignedTo.length;
    const totalProgress = team.assignedTo.reduce(
      (sum, user) => sum + user.progress,
      0
    );
    team.overallProgress = totalProgress / totalUsers || 0;

    // Update team progress status
    if (team.overallProgress === 0) {
      team.progress = "To Do";
    } else if (team.overallProgress === 100) {
      team.progress = "Completed";
    } else {
      team.progress = "In Progress";
    }

    await team.save();

    res.status(200).json({ message: "Subtask updated successfully", subtask });
  } catch (error) {
    console.error("Error updating subtask:", error);
    res.status(500).json({ message: "Error updating subtask", error });
  }
});

app.delete("/deleteSubtask/:subtaskId", async (req, res) => {
  try {
    const { subtaskId } = req.params;

    // Convert subtaskId to ObjectId
    const subtaskObjectId = new mongoose.Types.ObjectId(subtaskId);

    // Find the team containing the subtask
    const team = await Team.findOne({ "assignedTo.subtasks._id": subtaskObjectId });
    if (!team) {
      return res.status(404).json({ message: "Team not found for this subtask" });
    }

    // Find the user and subtask
    const user = team.assignedTo.find((user) =>
      user.subtasks.some((subtask) => subtask._id.equals(subtaskObjectId))
    );
    if (!user) {
      return res.status(404).json({ message: "User not found for this subtask" });
    }

    // Remove the subtask
    user.subtasks = user.subtasks.filter(
      (subtask) => !subtask._id.equals(subtaskObjectId)
    );

    // Update user's progress
    user.totalSubtasks = user.subtasks.length;
    user.completedSubtasks = user.subtasks.filter(
      (subtask) => subtask.status === "completed"
    ).length;
    user.progress = (user.completedSubtasks / user.totalSubtasks) * 100 || 0;

    // Update team's overall progress
    const totalUsers = team.assignedTo.length;
    const totalProgress = team.assignedTo.reduce(
      (sum, user) => sum + user.progress,
      0
    );
    team.overallProgress = totalProgress / totalUsers || 0;

    // Update team progress status
    if (team.overallProgress === 0) {
      team.progress = "To Do";
    } else if (team.overallProgress === 100) {
      team.progress = "Completed";
    } else {
      team.progress = "In Progress";
    }

    await team.save();

    res.status(200).json({ message: "Subtask deleted successfully" });
  } catch (error) {
    console.error("Error deleting subtask:", error);
    res.status(500).json({ message: "Error deleting subtask", error });
  }
});



// app.put("/edit/:subtaskId", async (req, res) => {
//   try {
//     const { subtaskId } = req.params;
//     const { title, status } = req.body;
//     console.log(req.params);
//     console.log(req.body);

//     const updatedSubtask = await Subtask.findByIdAndUpdate(
//       subtaskId,
//       { title, status },
//       { new: true }
//     );

//     if (!updatedSubtask) {
//       return res.status(404).json({ message: "Subtask not found" });
//     }

//     res.json({ message: "Subtask updated successfully", updatedSubtask });
//   } catch (error) {
//     res.status(500).json({ message: "Error updating subtask", error });
//   }
// });

app.put("/edit/:subtaskId", async (req, res) => {
  try {
    const { subtaskId } = req.params;
    const { title, status } = req.body;

    // Step 1: Update the subtask
    const updatedSubtask = await Subtask.findByIdAndUpdate(
      subtaskId,
      { title, status },
      { new: true }
    );

    if (!updatedSubtask) {
      return res.status(404).json({ message: "Subtask not found" });
    }

    // Step 2: Check if all subtasks of the same task are completed
    const taskId = updatedSubtask.task;
    const allSubtasks = await Subtask.find({ task: taskId });

    const allSubtasksCompleted = allSubtasks.every(
      (subtask) => subtask.status === "completed"
    );

    if (allSubtasksCompleted) {
      // Step 3: Update the task status to "Completed"
      const updatedTask = await Task.findOne(
        taskId
      );

      if (updatedTask) {
        const teamId = updatedTask.assignedTo; // Assuming assignTo is the field for team ID

        // Step 4: Check if all tasks assigned to this team are completed
        const allTasks = await Task.find({ assignTo: teamId });
        const allTasksCompleted = allTasks.every(
          (task) => task.status === "Completed"
        );

        if (allTasksCompleted) {
          // Step 5: Update the team progress to "Completed"
          await Team.findByIdAndUpdate(teamId, { progress: "Completed" });
        }
      }
    } else {
      // Step 3: Update the task status to "Completed"
      const updatedTask = await Task.findOne(
        taskId
      );
      console.log(updatedTask);

      if (updatedTask) {
        const teamId = updatedTask.assignedTo; // Assuming assignTo is the field for team ID

        console.log(teamId);

        await Team.findByIdAndUpdate(teamId, { progress: "In Progress" });
      }
    }

    res.json({ message: "Subtask updated successfully", updatedSubtask });
  } catch (error) {
    res.status(500).json({ message: "Error updating subtask", error });
  }
});

app.delete("/delete/:subtaskId", async (req, res) => {
  try {
    const { subtaskId } = req.params;

    const deletedSubtask = await Subtask.findByIdAndDelete(subtaskId);
    if (!deletedSubtask) {
      return res.status(404).json({ message: "Subtask not found" });
    }

    res.json({ message: "Subtask deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting subtask", error });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed");
  process.exit(0);
});
