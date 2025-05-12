// Guide Schema

const mongoose = require("mongoose")

const GuideSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String
})

const GuideModel = mongoose.model("guides",GuideSchema)  //here guide indicates that what name we want to create a table or collection in the mongoDB
module.exports = GuideModel
