
from celery import current_app
from app.workers.celery import celery_app
from app.core.logging import get_logger
from app.core.database import get_supabase_client
import httpx
import os

logger = get_logger(__name__)

@celery_app.task(bind=True, max_retries=3)
def send_welcome_email(self, user_email: str, user_name: str):
    """Send welcome email to new users"""
    import asyncio
    try:
        logger.info(f"Sending welcome email to {user_email}")

        # Email content
        subject = "Welcome to PAM - Your AI Travel Companion!"
        html_content = f"""
        <h2>G'day {user_name}!</h2>
        <p>Welcome to PAM - Personal AI Manager for Grey Nomads!</p>
        <p>I'm excited to help you plan amazing adventures while managing your budget and connecting with fellow travelers.</p>
        <p>Ready to get started? Visit your dashboard to begin planning your next journey!</p>
        <p>Safe travels,<br>PAM 🤖</p>
        """

        # Send via Resend API (async)
        return asyncio.run(_send_email(user_email, subject, html_content))

    except Exception as exc:
        logger.error(f"Failed to send welcome email: {exc}")
        raise self.retry(exc=exc, countdown=60)

@celery_app.task(bind=True, max_retries=3)
def send_maintenance_reminder(self, user_email: str, maintenance_item: str, due_date: str):
    """Send maintenance reminder email"""
    import asyncio
    try:
        logger.info(f"Sending maintenance reminder to {user_email}")

        subject = f"Maintenance Reminder: {maintenance_item}"
        html_content = f"""
        <h2>Maintenance Reminder</h2>
        <p>Your {maintenance_item} is due on {due_date}.</p>
        <p>Don't forget to take care of your vehicle to ensure safe travels!</p>
        <p>Log into PAM to update your maintenance records.</p>
        <p>Safe travels,<br>PAM 🔧</p>
        """

        return asyncio.run(_send_email(user_email, subject, html_content))

    except Exception as exc:
        logger.error(f"Failed to send maintenance reminder: {exc}")
        raise self.retry(exc=exc, countdown=60)

@celery_app.task(bind=True, max_retries=3)
def send_budget_alert(self, user_email: str, category: str, percentage_used: float):
    """Send budget alert email"""
    import asyncio
    try:
        logger.info(f"Sending budget alert to {user_email}")

        subject = f"Budget Alert: {category}"
        html_content = f"""
        <h2>Budget Alert</h2>
        <p>You've used {percentage_used:.1f}% of your {category} budget this month.</p>
        <p>Check your PAM dashboard to review your spending and adjust if needed.</p>
        <p>Happy budgeting,<br>PAM 💰</p>
        """

        return asyncio.run(_send_email(user_email, subject, html_content))

    except Exception as exc:
        logger.error(f"Failed to send budget alert: {exc}")
        raise self.retry(exc=exc, countdown=60)

@celery_app.task(bind=True, max_retries=3)
def send_digest_email(self, user_email: str, user_name: str, digest_data: dict):
    """Send daily digest email"""
    import asyncio
    try:
        logger.info(f"Sending daily digest to {user_email}")

        subject = "Your Daily PAM Digest"
        html_content = f"""
        <h2>G'day {user_name}!</h2>
        <p>Here's your daily travel summary:</p>
        <ul>
            <li><strong>Budget Status:</strong> {digest_data.get('budget_summary', 'No data')}</li>
            <li><strong>Upcoming Maintenance:</strong> {digest_data.get('maintenance_summary', 'All up to date')}</li>
            <li><strong>Travel Tips:</strong> {digest_data.get('tips', 'Plan your next adventure!')}</li>
        </ul>
        <p>Happy travels,<br>PAM 🚐</p>
        """

        return asyncio.run(_send_email(user_email, subject, html_content))

    except Exception as exc:
        logger.error(f"Failed to send digest email: {exc}")
        raise self.retry(exc=exc, countdown=60)

async def _send_email(to_email: str, subject: str, html_content: str):
    """Send email via Resend API"""
    import os

    api_key = os.getenv("RESEND_API_KEY")

    if not api_key:
        logger.warning(f"RESEND_API_KEY not configured - email not sent to {to_email}")
        logger.info(f"EMAIL (mock) - To: {to_email}, Subject: {subject}")
        return {"status": "mock_sent", "to": to_email, "subject": subject}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": "PAM <noreply@wheelsandwins.com>",
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content
                }
            )

            if response.status_code == 200:
                logger.info(f"✅ Email sent successfully to {to_email}")
                return {"status": "sent", "to": to_email, "subject": subject, "id": response.json().get("id")}
            else:
                logger.error(f"❌ Email failed to {to_email}: {response.status_code} - {response.text}")
                raise Exception(f"Email send failed: {response.text}")

    except Exception as e:
        logger.error(f"❌ Email sending error to {to_email}: {str(e)}")
        raise
