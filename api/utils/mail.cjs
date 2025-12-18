/* Send mail using nodemailer
 *
 * Configure using NODEMAILER_* env variables.
 * See https://nodemailer.com/smtp/ for all options
 *
 * Send mail with:
 *
 *   import transport from "./src/utils/mail.js";
 *   await transport.sendMail({ from, to, subject, text });
 *
 * For all message options, see: https://nodemailer.com/message/
 */
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

const transporter = nodemailer.createTransport({
    service: process.env.SMTP_SERVICE,
    auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASS
    }
});

const mailOptions = {
    from: process.env.SMTP_MAIL,
    to: 'xebrake@gmail.com',
    subject: 'Test Email',
    text: 'Hello, this is a test email sent using Nodemailer and Gmail.'
};

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        return console.log('Error sending email: ', error);
    }
    console.log('Email sent: ', info.response);
});
// import nodemailer from 'nodemailer';
// import dotenv from 'dotenv';

// dotenv.config();

// const transporter = nodemailer.createTransport({
//     service: process.env.SMTP_SERVICE,
//     auth: {
//         user: process.env.SMTP_MAIL,
//         pass: process.env.SMTP_PASS
//     }
// });

// /**
//  * Sends an email using Nodemailer
//  * @param {string} to - Recipient email address
//  * @param {string} subject - Email subject
//  * @param {string} text - Plain text content
//  * @param {string} [html] - Optional HTML content
//  * @returns {Promise<Object>} - Resolves with email info if successful
//  */
// export async function sendEmail({ to, subject, text, html = null }) {
//     try {
//         const mailOptions = {
//             from: process.env.SMTP_MAIL,
//             to,
//             subject,
//             text,
//             ...(html && { html }) // Include HTML content if provided
//         };

//         const info = await transporter.sendMail(mailOptions);
//         console.log('Email sent:', info.response);
//         return info;
//     } catch (error) {
//         console.error('Error sending email:', error);
//         throw error;
//     }
// }

// node .\src\utils\mail.cjs