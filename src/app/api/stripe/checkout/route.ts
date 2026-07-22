import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";

const getAppUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  return "http://localhost:3000";
};

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { priceId, tierName } = await req.json();

    if (!priceId) {
      return new NextResponse("Price ID is required", { status: 400 });
    }

    const appUrl = getAppUrl();

    // Create a Stripe Checkout session
    const stripeSession = await stripe.checkout.sessions.create({
      success_url: `${appUrl}/subscriptions?success=true&tier=${tierName}`,
      cancel_url: `${appUrl}/subscriptions?canceled=true`,
      payment_method_types: ["card"],
      // @ts-ignore - disabling managed payments to avoid missing tax_code errors on user's Stripe products
      managed_payments: { enabled: false },
      mode: "subscription",
      billing_address_collection: "auto",
      customer_email: user.emailAddresses?.[0]?.emailAddress || undefined,
      client_reference_id: userId,
      metadata: {
        userId,
        tier: tierName,
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
    });

    return NextResponse.json({ url: stripeSession.url });
  } catch (error: any) {
    console.error("[STRIPE_CHECKOUT_ERROR]", error);
    return NextResponse.json({ status: "error", message: error.message || "Internal Server Error" }, { status: 500 });
  }
}
