const SUPABASE_URL = 'https://hyvlfpebkdqeutrdredk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_wGxofUWNRjzma7YOTpCC_g_ZHnotE7k';

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { itemId, listingTitle, fromName, messageText } = await request.json();

    if (!itemId) {
      return new Response(JSON.stringify({ error: 'Missing itemId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // On va chercher nous-memes le vrai proprietaire de l'annonce dans Supabase,
    // plutot que de faire confiance a une adresse envoyee par le navigateur.
    const lookupRes = await fetch(
      `${SUPABASE_URL}/rest/v1/items?id=eq.${encodeURIComponent(itemId)}&select=posted_by_email`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const rows = await lookupRes.json();
    const toEmail = rows?.[0]?.posted_by_email;

    if (!toEmail) {
      return new Response(JSON.stringify({ skipped: true, reason: 'listing or owner email not found' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'KohaLoop <onboarding@resend.dev>',
        to: [toEmail],
        subject: `New message about "${listingTitle}"`,
        html: `<p><strong>${fromName}</strong> sent you a message on KohaLoop about your listing "<strong>${listingTitle}</strong>":</p>
               <blockquote style="border-left:3px solid #189485;padding-left:12px;color:#333;">${messageText}</blockquote>
               <p>Log in to KohaLoop to reply.</p>`
      })
    });

    const data = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data.message || 'Resend error' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
