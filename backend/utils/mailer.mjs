import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

const transporter = nodemailer.createTransport({
    service: 'gmail', // use an email service
    auth: {
        user: process.env.EMAIL_USER, // username for gmail (website's gmail account)
        pass: process.env.EMAIL_PASS // obviously the password for the gmail account
    }
});

module.exports = transporter;