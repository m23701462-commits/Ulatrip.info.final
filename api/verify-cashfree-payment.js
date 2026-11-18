import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId, userId, state, amount } = req.body || {};
    if (!orderId || !userId || !state) {
      return res.status(400).json({ error: 'orderId, userId, and state are required' });
    }

    const cfEnv = (process.env.CASHFREE_ENV || 'PROD').toUpperCase();
    const isProd = cfEnv === 'PROD' || cfEnv === 'PRODUCTION';
    const baseUrl = isProd
      ? `https://api.cashfree.com/pg/orders/${encodeURIComponent(orderId)}`
      : `https://sandbox.cashfree.com/pg/orders/${encodeURIComponent(orderId)}`;

    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
      },
    });

    const rawText = await response.text();
    let orderData = {};
    try {
      orderData = JSON.parse(rawText);
    } catch {
      return res.status(502).json({
        error: 'Unexpected non-JSON response from Cashfree verify API',
        details: rawText.slice(0, 300),
      });
    }

    if (orderData.order_status === 'PAID') {
      const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { data: passData, error } = await supabase
        .from('community_chat_passes')
        .upsert(
          {
            user_id: userId,
            unlocked_state: state,
            order_id: orderId,
            payment_id: String(orderData.cf_order_id || orderId),
            amount_paid: Number(orderData.order_amount || amount || 199),
            status: 'approved',
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,unlocked_state' }
        )
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({
        success: true,
        verified: true,
        expires_at: expiresAt.toISOString(),
        pass: passData,
      });
    }

    return res.status(400).json({
      success: false,
      verified: false,
      status: orderData.order_status || 'PENDING',
      error: `Payment not completed yet (status: ${orderData.order_status || 'PENDING'}).`,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
