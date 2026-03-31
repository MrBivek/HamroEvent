import nodemailer from "nodemailer";
import { env } from "../configurations/env.js";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
    if (transporter) return transporter;

    if (!env.SMTP_HOST) return null;

    transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ?? 587,
        secure: env.SMTP_SECURE ?? false,
        auth: env.SMTP_USER
            ? {
                  user: env.SMTP_USER,
                  pass: env.SMTP_PASS,
              }
            : undefined,
    });

    return transporter;
}

export async function sendEmail(input: {
    to: string;
    subject: string;
    text: string;
    html?: string;
}) {
    const mailer = getTransporter();
    if (!mailer) {
        console.log("[MockEmail] To:", input.to);
        console.log("[MockEmail] Subject:", input.subject);
        console.log("[MockEmail] Text:", input.text);
        return;
    }

    await mailer.sendMail({
        from: env.EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
    });
}
