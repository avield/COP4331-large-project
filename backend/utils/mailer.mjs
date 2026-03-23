import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { SESClient } from '@aws-sdk/client-ses';
import { SendRawEmailCommand } from '@aws-sdk/client-ses';

dotenv.config();

const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const transporter = nodemailer.createTransport({
  SES: { ses: sesClient, aws: { SendRawEmailCommand } }
});

export default transporter;