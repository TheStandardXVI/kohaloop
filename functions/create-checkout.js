// Prix decides server-side, jamais fait confiance a ce que le navigateur envoie.
const PRICES = {
  boost: { 1: 3, 7: 8, 30: 20 },
  edit: { default: 2 }
};

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { itemId, kind, days, siteUrl } = await request.json();

    let price, label;
    if (kind === 'boost') {
      price = PRICES.boost[days];
      if (!price) {
        return new Response(JSON.stringify({ error: 'Invalid boost duration' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      label = `KohaLoop boost — ${days} day(s)`;
    } else if (kind === 'edit') {
      price = PRICES.edit.default;
      label = 'KohaLoop — extra listing edit';
    } else {
      return new Response(JSON.stringify({ error: 'Invalid checkout kind' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('line_items[0][price_data][currency]', 'nzd');
    params.append('line_items[0][price_data][product_data][name]', label);
    params.append('line_items[0][price_data][unit_amount]', String(Math.round(price * 100)));
    params.append('line_items[0][quantity]', '1');
    params.append('success_url', `${siteUrl}?${kind}_success=${itemId}${days ? `&days=${days}` : ''}`);
    params.append('cancel_url', `${siteUrl}?payment_cancelled=1`);

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await stripeRes.json();
    if (!stripeRes.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Stripe error' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ url: data.url }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
