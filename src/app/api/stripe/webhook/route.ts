import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error(`Webhook Error: ${error.message}`);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === "checkout.session.completed") {
    // Retrieve the subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    if (!session?.metadata?.userId) {
      return new NextResponse("User ID missing in metadata", { status: 400 });
    }

    const userId = session.metadata.userId;
    const tier = session.metadata.tier || "Free";

    // Update the user's tier in Clerk publicMetadata
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        tier: tier,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
      },
    });
  }

  if (event.type === "invoice.payment_succeeded") {
    // Optionally handle successful recurring payments
    // e.g., extending the subscription expiration date if you were tracking it
  }

  if (event.type === "customer.subscription.deleted") {
    // Handle cancellation
    const subscription = event.data.object as Stripe.Subscription;
    
    // Find the user with this stripeCustomerId
    // In a real app, you might want to query your DB or Clerk to find the user
    // For this example, we assume you store it in Clerk or can look it up
    try {
      const client = await clerkClient();
      const users = await client.users.getUserList();
      const user = users.data.find(
        (u) => u.publicMetadata.stripeSubscriptionId === subscription.id
      );

      if (user) {
        // Downgrade back to Free tier
        await client.users.updateUserMetadata(user.id, {
          publicMetadata: {
            tier: "Free",
            stripeSubscriptionId: null,
          },
        });
      }
    } catch (e) {
      console.error("Error handling subscription deletion", e);
    }
  }

  return new NextResponse(null, { status: 200 });
}
