const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const sendEmail = async (to, subject, htmlContent) => {
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        html: htmlContent,
    });
};

const sendOtpEmail = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const htmlContent = fs.readFileSync(path.join(__dirname, 'Templates', 'verificarOtp.html'), 'utf8').replace('${otp}', otp);

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Tu código de verificación OTP',
        html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
};

module.exports = { sendEmail, sendOtpEmail };
