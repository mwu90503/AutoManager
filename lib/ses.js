import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const client = new SESv2Client({ region: process.env.AWS_REGION || 'us-east-2' });

// `to` defaults to EMAIL_TO for backward compatibility (the pre-
// multi-user setup), but every real caller now resolves and passes the
// actual recipient's own address.
export async function sendEmail({ to, subject, text, html }) {
  const from = process.env.EMAIL_FROM;
  const recipient = to || process.env.EMAIL_TO;
  if (!from || !recipient) {
    throw new Error('Missing EMAIL_FROM environment variable or a recipient address');
  }

  await client.send(
    new SendEmailCommand({
      FromEmailAddress: from,
      Destination: { ToAddresses: [recipient] },
      Content: {
        Simple: {
          Subject: { Data: subject },
          Body: {
            Text: { Data: text },
            ...(html ? { Html: { Data: html } } : {}),
          },
        },
      },
    })
  );
}
