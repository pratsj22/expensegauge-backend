import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

let resendInstance = null;

const getResendInstance = () => {
    if (!resendInstance) {
        if (!process.env.RESEND_API_KEY) {
            console.warn('RESEND_API_KEY is not defined. Email functionality will be disabled.');
            return null;
        }
        resendInstance = new Resend(process.env.RESEND_API_KEY);
    }
    return resendInstance;
};

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
        const resend = getResendInstance();
        if (!resend) {
            throw new Error('Resend client not initialized. Check RESEND_API_KEY.');
        }

        const data = await resend.emails.send({
            from: 'ExpenseGauge <onboarding@resend.dev>',
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
