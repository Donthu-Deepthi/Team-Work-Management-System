import express from 'express'
import { register, VerifyEmail } from '../controllers/Auth.js'

const AuthRoutes=express.Router()

AuthRoutes.post('/register',register)
AuthRoutes.post("/verifyemail",VerifyEmail)
export default AuthRoutes