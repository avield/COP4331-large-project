import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Validates required environment variables for AWS SES configuration
 */
function validateEnvVariables(): void {
  const requiredVars = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

validateEnvVariables();

const sesClient = new SESv2Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const transporter: Transporter = nodemailer.createTransport({
  SES: { sesClient, SendEmailCommand },
});

export default transporter;