import { serve } from "https://deno.land/std@0.171.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  httpClient: Stripe.createFetchHttpClient(),
})

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response("Missing signature", { status: 400 })
  }

  let event
  try {
    const body = await req.text()
    
    // CHANGE IS HERE: Use constructEventAsync and await it
    event = await stripe.webhooks.constructEventAsync(
      body, 
      signature, 
      endpointSecret
    )
    
  } catch (err) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const { type, data } = event
  
  if (type === 'checkout.session.completed') {
    const session = data.object
    const userId = session.client_reference_id
    const customerId = session.customer

    if (userId && customerId) {
      try {
        await stripe.customers.update(customerId, {
          metadata: { "client-reference-id": userId }
        })
        console.log(`✅ Successfully linked User ${userId} to Customer ${customerId}`)
      } catch (updateErr) {
        console.error(`❌ Stripe Update Error: ${updateErr.message}`)
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
})