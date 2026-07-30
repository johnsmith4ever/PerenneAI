import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const { productId, amount } = await req.json();

    if (!productId || !amount) {
      return NextResponse.json({ status: "error", message: "Missing productId or amount" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product: productId,
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/daily-poll?success=true`,
      cancel_url: `${req.headers.get("origin")}/daily-poll?canceled=true`,
    });

    return NextResponse.json({ status: "success", url: session.url });
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
