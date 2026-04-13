#!/usr/bin/env node
/**
 * stripe-setup.js
 * Run ONCE to create all Stripe products and prices for CinematicBoard.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/stripe-setup.js
 *
 * It prints the price IDs at the end — paste them into your .env file.
 */

const Stripe = require("stripe");

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("❌  STRIPE_SECRET_KEY is not set.");
  process.exit(1);
}

const stripe = Stripe(key);

const SUBSCRIPTIONS = [
  {
    name: "CinematicBoard Indie",
    description: "900 credits/month — ideal for solo filmmakers",
    envKey: "STRIPE_PRICE_INDIE",
    unitAmount: 1900, // $19.00
  },
  {
    name: "CinematicBoard Pro",
    description: "2500 credits/month — professional workflow",
    envKey: "STRIPE_PRICE_PRO",
    unitAmount: 4900, // $49.00
  },
  {
    name: "CinematicBoard Studio",
    description: "6000 credits/month — studio & team use",
    envKey: "STRIPE_PRICE_STUDIO",
    unitAmount: 9900, // $99.00
  },
];

const TOPUPS = [
  {
    name: "CinematicBoard Top-up 500 credits",
    description: "One-time purchase of 500 additional credits",
    envKey: "STRIPE_PRICE_TOPUP_500",
    unitAmount: 500, // $5.00
  },
  {
    name: "CinematicBoard Top-up 1500 credits",
    description: "One-time purchase of 1500 additional credits",
    envKey: "STRIPE_PRICE_TOPUP_1500",
    unitAmount: 1300, // $13.00
  },
  {
    name: "CinematicBoard Top-up 4000 credits",
    description: "One-time purchase of 4000 additional credits",
    envKey: "STRIPE_PRICE_TOPUP_4000",
    unitAmount: 2900, // $29.00
  },
];

async function createSubscription({ name, description, envKey, unitAmount }) {
  console.log(`\n🔧  Creating subscription: ${name}`);

  const product = await stripe.products.create({
    name,
    description,
    metadata: { app: "cinematicboard" },
  });
  console.log(`   ✓ Product: ${product.id}`);

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: unitAmount,
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { app: "cinematicboard" },
  });
  console.log(`   ✓ Price:   ${price.id}  ($${unitAmount / 100}/mo)`);

  return { envKey, priceId: price.id };
}

async function createTopup({ name, description, envKey, unitAmount }) {
  console.log(`\n🔧  Creating top-up: ${name}`);

  const product = await stripe.products.create({
    name,
    description,
    metadata: { app: "cinematicboard" },
  });
  console.log(`   ✓ Product: ${product.id}`);

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: unitAmount,
    currency: "usd",
    metadata: { app: "cinematicboard" },
  });
  console.log(`   ✓ Price:   ${price.id}  ($${unitAmount / 100} one-time)`);

  return { envKey, priceId: price.id };
}

async function main() {
  console.log("🚀  CinematicBoard Stripe Setup");
  console.log("================================");

  const results = [];

  for (const sub of SUBSCRIPTIONS) {
    results.push(await createSubscription(sub));
  }

  for (const topup of TOPUPS) {
    results.push(await createTopup(topup));
  }

  console.log("\n\n✅  Done! Add these to your .env file:\n");
  console.log("# ── Stripe Price IDs ──────────────────────────");
  for (const { envKey, priceId } of results) {
    console.log(`${envKey}=${priceId}`);
  }
  console.log("# ───────────────────────────────────────────────\n");
  console.log("Next steps:");
  console.log("  1. Paste the lines above into your .env");
  console.log("  2. Set up your Stripe webhook → /api/stripe/webhook");
  console.log("     Events: checkout.session.completed,");
  console.log("             customer.subscription.created,");
  console.log("             customer.subscription.updated,");
  console.log("             customer.subscription.deleted");
  console.log("  3. Add STRIPE_WEBHOOK_SECRET=whsec_... to .env");
}

main().catch((err) => {
  console.error("❌  Error:", err.message);
  process.exit(1);
});
