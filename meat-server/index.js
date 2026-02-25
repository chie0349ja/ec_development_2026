require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    console.log(`💰 決済成功(Webhook): ${paymentIntent.id}`);
    // TODO: 注文確定処理（DB 保存など）
  }

  res.json({ received: true });
});

app.use(express.json());

app.post('/payment-sheet', async (req, res) => {
  try {
    let amount = req.body.amount != null ? Number(req.body.amount) : 1000;
    amount = Math.floor(amount);
    if (!Number.isInteger(amount) || amount < 100 || amount > 500000) {
      return res.status(400).json({ error: 'amount must be between 100 and 500000' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'jpy',
      payment_method_types: ['card'],
    });

    res.json({
      paymentIntent: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/payment-details/:paymentIntentId', async (req, res) => {
  try {
    const pi = await stripe.paymentIntents.retrieve(req.params.paymentIntentId, {
      expand: ['payment_method'],
    });
    const pm = pi.payment_method;
    if (!pm || typeof pm !== 'object' || !pm.billing_details) {
      return res.status(404).json({ error: 'billing details not found' });
    }
    const { name, phone, address } = pm.billing_details;
    res.json({ name, phone, address });
  } catch (e) {
    if (e.code === 'resource_missing') {
      return res.status(404).json({ error: e.message });
    }
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => console.log('サーバーがポート3000で起動しました！'));
