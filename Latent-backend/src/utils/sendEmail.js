import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
    // 1. Create the transporter using your .env credentials
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    // 2. Define the email payload
    const mailOptions = {
        from: '"Latent Team" <noreply@latent.com>', // The professional address!
        to: options.email,                          // The user's email
        subject: options.subject,                  
        text: options.message,                     
    };

    // 3. Fire it off
    await transporter.sendMail(mailOptions);
};

export default sendEmail;