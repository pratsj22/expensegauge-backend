import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email using Resend
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} [options.text] - Plain text content
 * @param {string} [options.html] - HTML content
 * @param {Array} [options.attachments] - Email attachments
 * @returns {Promise}
 */
export const sendEmail = async ({ to, subject, text, html, attachments }) => {
    try {
        const data = await resend.emails.send({
            from: 'ExpenseGauge <' + process.env.EMAIL_USER + '>', // You might want to change this later
            to: [to],
            subject: subject,
            text: text,
            html: html,
            attachments: attachments?.map(att => ({
                filename: att.filename,
                content: att.content,
            })),
        });

        return data;
    } catch (error) {
        console.error('Error sending email via Resend:', error);
        throw error;
    }
};
