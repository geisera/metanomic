# Starter billing activation

1. In Metanomic's Stripe account, create a recurring **USD 5.00/month** price. Enable payment management and subscription cancellation in the Stripe Customer Portal. Use test mode in a non-production environment first.
2. Add the endpoint `https://metanomic.ai/api/theia-studio/billing/webhook` in Stripe and subscribe to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.
3. Configure `STUDIO_STRIPE_SECRET_KEY`, `STUDIO_STRIPE_STARTER_PRICE_ID`, and `STUDIO_STRIPE_WEBHOOK_SECRET` in Vercel. Keep the API key and webhook secret server-side.
4. For launch, set `ASSISTANT_STUDIO_TERMS_VERSION=starter-subscription-v1` and `STUDIO_STARTER_BILLING_ENABLED=true` together, then redeploy. The database migration must be applied first. Keep the flag enabled after launch to enforce entitlements for enrolled accounts.

Test signup without a card, a completed Preview reply, expiration, successful Checkout, webhook-driven activation, and cancellation. Use Stripe test credentials and a disposable test workspace for the payment and cancellation checks. Existing accounts without a billing enrollment remain grandfathered.
