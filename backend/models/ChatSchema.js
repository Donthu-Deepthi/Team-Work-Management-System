const mongoose = require("mongoose");

// Chat Message Schema
const ChatSchema = new mongoose.Schema({
  team: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "teams", // Reference to the Team model
    required: true 
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "students", // Reference to the students model
    required: true 
  },
  senderName: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

// Chat Model
const Chat = mongoose.model("chat", ChatSchema);

module.exports = Chat;