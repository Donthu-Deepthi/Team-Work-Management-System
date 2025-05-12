const nodemailer = require("nodemailer");
const dotenv = require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendEmail = async (to, subject, text) => {
    try {
        const info = await transporter.sendMail({
            from: `"TeamWork" <${process.env.SMTP_USER}>`, // Sender address
            to, // Receiver's email
            subject, // Email subject
            text, // Email body
        });

        console.log("Email sent: " + info.messageId);
    } catch (error) {
        console.error("Error sending email: ", error);
    }
};

module.exports = sendEmail;