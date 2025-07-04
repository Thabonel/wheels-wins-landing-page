const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  // Initialize Supabase client
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Create email transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Find users whose trial ends tomorrow
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('trial_end_date', tomorrowStr)
      .eq('trial_notification_sent', false)
      .eq('subscription_cancelled', false);

    if (error) throw error;

    // Send emails to each user
    for (const user of users) {
      // Generate cancellation token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

      // Update user with token
      await supabase
        .from('profiles')
        .update({ cancellation_token: token })
        .eq('id', user.id);

      // Send email
      const mailOptions = {
        from: '"Wheels and Wins" <noreply@wheelsandwins.com>',
        to: user.email,
        subject: 'Your Wheels and Wins trial ends tomorrow',
        html: `
          <h2>Hi ${user.full_name || 'there'},</h2>
          <p>Your 30-day free trial of Wheels and Wins ends tomorrow.</p>
          <p>If you're enjoying our service, you don't need to do anything - your subscription will automatically continue and you'll be charged for your first month.</p>
          <p>If you'd like to cancel before being charged, simply click the button below:</p>
          <p style="margin: 30px 0;">
            <a href="https://wheelsandwins.com/cancel-trial?token=${token}"
               style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Cancel My Subscription
            </a>
          </p>
          <p>Thank you for trying Wheels and Wins!</p>
        `
      };

      await transporter.sendMail(mailOptions);

      // Mark as sent
      await supabase
        .from('profiles')
        .update({ trial_notification_sent: true })
        .eq('id', user.id);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Sent ${users.length} reminder emails` })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
