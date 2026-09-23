import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const client = new SESv2Client({ region: process.env.AWS_REGION || 'us-east-2' });

export async function sendEmail({ subject, text, html }) {
  const from = process.env.EMAIL_FROM;
  const to = process.env.EMAIL_TO;
  if (!from || !to) {
    throw new Error('Missing EMAIL_FROM or EMAIL_TO environment variables');
  }

  await client.send(
    new SendEmailCommand({
      FromEmailAddress: from,
      Destination: { ToAddresses: [to] },
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
