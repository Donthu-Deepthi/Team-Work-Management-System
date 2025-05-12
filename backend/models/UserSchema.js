//user schema model

const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  otp: String,
  otpExpiry: Date,
});

const UserModel = mongoose.model("students", UserSchema); //here guide indicates that what name we want to create a table or collection in the mongoDB
module.exports = UserModel;
