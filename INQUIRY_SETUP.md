# New World Apartment – inquiry delivery setup

The website has a server-side POST endpoint at `/api/inquiry`. Sending uses Resend only if BOTH Vercel environment variables are set: `RESEND_API_KEY` and `INQUIRY_FROM_EMAIL` (verified sending identity at Resend, e.g. `New World Apartment <bookings@your-verified-domain>`). Do not put keys in GitHub, HTML, or chat.

1. Verify the sender domain with the provider and set DNS records as instructed (SPF/DKIM).
2. Configure both variables for **Preview and Production** in Vercel project settings.
3. Redeploy the preview branch so the values are included.
4. From the preview website send a controlled test inquiry with a valid arrival/departure and a monitored reply-to address. Verify receipt in `ns.apartment9@gmail.com`, correct fields, reply-to and no duplicate mail.
5. Test invalid dates, no email client, timeout/provider error and responsive layouts in EN/DE/HR.
6. Only merge/deploy when those tests pass; otherwise the form falls back to a prefilled `mailto:` draft. This requires the guest to send the draft manually.
7. Keep email log retention minimal and review privacy notice if the mailing provider changes processing.

The endpoint deliberately reports `503 delivery_not_configured` when not configured. A Vercel READY build does not mean actual email delivery works.

Never send real guest details in a test.
