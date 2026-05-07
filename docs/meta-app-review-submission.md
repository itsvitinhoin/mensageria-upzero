# Meta App Review Submission

## Product Summary

Our app allows a business user to connect their Meta Business account and WhatsApp Business Account, select a WhatsApp phone number, manage message templates, send WhatsApp messages using approved templates, create campaigns based on segmented customer lists, trigger WhatsApp automations from e-commerce customer/order events, and receive customer replies in the app inbox.

The requested permissions are used only to let the authenticated business user manage their own WhatsApp Business assets and messaging workflow.

## Requested Permissions

- `public_profile`: identifies the connected Meta user during OAuth.
- `email`: displays the connected Meta user's email in the integration status.
- `business_management`: lists and selects the user's Business Manager assets.
- `whatsapp_business_management`: lists WABAs, phone numbers and templates owned by the business.
- `whatsapp_business_messaging`: sends WhatsApp messages using approved templates and receives messaging status through the WhatsApp workflow.

## Permissions Not Requested Now

We are not requesting `manage_app_solution` or `whatsapp_business_manage_events` in this submission. Those will be requested later only after the required Access Verification and advanced access requirements are completed.

## Screencast Flow

The screencast demonstrates the complete flow:

1. Meta Login and permission consent.
2. Selecting the Business Manager, WhatsApp Business Account, and WhatsApp phone number.
3. Listing and managing WhatsApp message templates.
4. Sending a WhatsApp message from the app to a real WhatsApp user.
5. Receiving the customer reply from WhatsApp through webhooks and displaying it inside the app inbox.
6. Showing campaign, automation, inbox and integration logs.

## Recording Script

1. Open `/mensageria`.
2. Connect with Meta.
3. Grant permissions.
4. Select Business.
5. Select WABA.
6. Select WhatsApp phone number.
7. Open Templates.
8. Select or create template.
9. Show template status.
10. Go to Envio de Teste.
11. Send message to a real WhatsApp number.
12. Open WhatsApp and show the received message.
13. Reply from WhatsApp.
14. Return to Inbox.
15. Show the received reply.
16. Open Logs.
17. Show send, automation and webhook events.

## Pre-Submission Checklist

- `/mensageria` is the only main product experience.
- `/privacy` is public and does not require login.
- Required Meta permissions are the only permissions requested.
- `manage_app_solution` and `whatsapp_business_manage_events` are not requested.
- Business Manager, WABA and phone number are selected.
- At least one template is loaded and an `APPROVED` template is selected.
- A real test message was sent through Meta.
- A real webhook reply appears in Inbox.
- Logs show OAuth, template sync, send and webhook events.
- No access token, app secret, client secret, bearer token or `.env` value is exposed in the UI or logs.

## Data and Security Notes

The app does not expose tokens. Server-only values such as `FACEBOOK_APP_SECRET`, `FACEBOOK_SYSTEM_USER_TOKEN` and `WHATSAPP_WEBHOOK_VERIFY_TOKEN` must remain in server environment variables and must never be rendered in the browser.

Operational logs store safe payloads and sanitized errors only. IDs may be displayed in masked form for support and App Review diagnostics.
