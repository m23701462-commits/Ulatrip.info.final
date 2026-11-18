export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, state, amount, userName, userEmail, userPhone } = req.body || {};
    if (!userId || !state) {
      return res.status(400).json({ error: 'userId and state are required' });
    }

    const orderId = `ULA_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const cfEnv = (process.env.CASHFREE_ENV || 'PROD').toUpperCase();
    const isProd = cfEnv === 'PROD' || cfEnv === 'PRODUCTION';
    const baseUrl = isProd
      ? 'https://api.cashfree.com/pg/orders'
      : 'https://sandbox.cashfree.com/pg/orders';

    const orderAmount = Number(amount) > 0 ? Number(amount) : 199;
    const cleanPhone =
      String(userPhone || '9999999999')
        .replace(/\D/g, '')
        .slice(-10) || '9999999999';

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
      },
      body: JSON.stringify({
        order_amount: orderAmount,
        order_currency: 'INR',
        order_id: orderId,
        customer_details: {
          customer_id: String(userId).replace(/[^a-zA-Z0-9_-]/g, '_'),
          customer_name: userName || 'UlaTrip Member',
          customer_email: userEmail || 'member@ulatrip.info',
          customer_phone: cleanPhone,
        },
        order_meta: {
          return_url: `https://ulatrip.info/?order_id={order_id}&state=${encodeURIComponent(state)}`,
        },
      }),
    });

    const rawText = await response.text();
    let data = {};
    try {
      data = JSON.parse(rawText);
    } catch {
      return res.status(502).json({
        error: 'Unexpected non-JSON response from Cashfree order API',
        details: rawText.slice(0, 300),
      });
    }

    if (!response.ok) {
      return res.status(400).json({
        error: data.message || 'Cashfree order failed',
        details: data,
      });
    }

    return res.status(200).json({
      order_id: data.order_id || orderId,
      payment_session_id: data.payment_session_id,
      amount: orderAmount,
      state,
      cashfree_env: isProd ? 'PRODUCTION' : 'SANDBOX',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
