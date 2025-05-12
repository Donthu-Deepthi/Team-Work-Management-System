import { SendVerificationCode, WelcomeEmail } from "../middleware/Email.js"
import Usermodel from "../models/UserSchema.js"
import bcryptjs from 'bcryptjs'

const register = async(req,res)=>{
    try {
        const {email,password,name}=req.body
        if (!email || !password || !name) {
            return res.status(400).json({success:false,message:"All fields are required"})
        }
        const ExistsUser = await Usermodel.findOne({email})
        if (ExistsUser) {
            return res.status(400).json({success:false,message:"User Already Exists Please Login"})
            
        }
        const hasePassword= await bcryptjs.hashSync(password,10)
        const verificationCode= Math.floor(100000 + Math.random() * 900000).toString()
        const user= new Usermodel({
            email,
            password:hasePassword,
            name,
            verificationCode
        })
        await user.save()
        SendVerificationCode(user.email,verificationCode)
        return res.status(200).json({success:true,message:"User Register Successfully",user})
    } catch (error) {
        console.log(error)
        return res.status(500).json({success:false,message:"internal server error"})
    }
}

const VerifyEmail = async(req,res) => {
    try {
        const {code} = req.body
        const user = await Usermodel.findOne({
            verificationCode:code
        })
        if(!user) {
            return res.status(400).json({success:false,message:"Inavlid or Expired Code"})
        }

        user.isVerified=true,
        user.verificationCode=undefined;
        await user.save()
        await WelcomeEmail(user.email,user.name)
        return res.status(200).json({success:true,message:"Email Verified Successfully"})
    }
    catch(error) {
        console.log(error)
        return res.status(500).json({success:false,message:"internal server error"})
    }
}

export {register,VerifyEmail}