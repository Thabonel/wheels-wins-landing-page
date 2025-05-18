import twilio from 'twilio';
import { VercelRequest, VercelResponse } from '@vercel/node';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const fromPhone = process.env.TWILIO_PHONE_NUMBER!;

const client = twilio(accountSid, authToken);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, body } = req.body;

  if (!to || !body) {
    return res.status(400).json({ error: 'Missing "to" or "body"' });
  }

  try {
    const message = await client.messages.create({ body, from: fromPhone, to });

    res.status(200).json({ success: true, sid: message.sid });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
