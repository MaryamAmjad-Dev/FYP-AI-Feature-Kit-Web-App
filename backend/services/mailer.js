const nodemailer = require('nodemailer');
const { config } = require('../config/config');
const logger = require('../lib/logger');

let transporter = null;

function getTransporter() {
  if (!config.smtp.enabled) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  }
  return transporter;
}

/**
 * Sends a password-reset email. Returns true when the email was handed to SMTP.
 * When SMTP is not configured the code is logged to the server console instead
 * (development convenience only — production must have SMTP configured).
 */
async function sendPasswordResetEmail(toEmail, token) {
  const resetUrl = `${config.appUrl}/reset-password?token=${encodeURIComponent(token)}`;

  if (!config.smtp.enabled) {
    if (config.isProduction) {
      logger.error('SMTP is not configured — cannot deliver password reset emails');
      return false;
    }
    // Development only: hand the code to whoever can read the server console.
    logger.warn('password reset code (dev, SMTP not configured)', { email: toEmail, token, resetUrl });
    return 'console';
  }

  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: config.smtp.from,
      to: toEmail,
      subject: 'Reset your AI Feature Kit password',
      text:
        `Use this code to reset your password (valid for a short time):\n\n${token}\n\n` +
        `Or open: ${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      html: `
        <p>Use the code below to reset your password (valid for a short time):</p>
        <p style="font-size:22px;letter-spacing:4px"><b>${token}</b></p>
        <p><a href="${resetUrl}">Click here to reset your password</a></p>
        <p>If you did not request this, you can ignore this email.</p>`,
    });
    return true;
  } catch (error) {
    logger.error('failed to send password reset email', { message: error.message });
    return false;
  }
}

/**
 * Sends the signup verification link. Returns true when handed to SMTP,
 * 'console' in development without SMTP (link printed to the server console),
 * or false when delivery failed / SMTP is not configured in production.
 */
async function sendVerificationEmail(toEmail, token) {
  const verifyUrl = `${config.appUrl}/verify-email?token=${encodeURIComponent(token)}`;

  if (!config.smtp.enabled) {
    if (config.isProduction) {
      logger.error('SMTP is not configured — cannot deliver verification emails');
      return false;
    }
    logger.warn('email verification link (dev, SMTP not configured)', { email: toEmail, verifyUrl });
    return 'console';
  }

  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: config.smtp.from,
      to: toEmail,
      subject: 'Verify your AI Feature Kit email',
      text:
        `Welcome! Please verify your email address by opening this link:\n\n${verifyUrl}\n\n` +
        `The link expires in a short while. If you did not sign up, you can ignore this email.`,
      html: `
        <p>Welcome to AI Feature Kit!</p>
        <p>Verify your email address to activate your account:</p>
        <p><a href="${verifyUrl}"><b>Verify my email</b></a></p>
        <p>Or paste this URL into your browser:</p>
        <p style="word-break:break-all">${verifyUrl}</p>
        <p>The link expires in a short while. If you did not sign up, you can ignore this email.</p>`,
    });
    return true;
  } catch (error) {
    logger.error('failed to send verification email', { message: error.message });
    return false;
  }
}

module.exports = { sendPasswordResetEmail, sendVerificationEmail };
