export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { toEmail, listingTitle, fromName, messageText } = await request.json();

    if (!toEmail) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no recipient email on file' }), {
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
