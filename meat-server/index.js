require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

app.post('/payment-sheet', async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000,
      currency: 'jpy',
      payment_method_types: ['card'],
    });

    res.json({
      paymentIntent: paymentIntent.client_secret,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => console.log('サーバーがポート3000で起動しました！'));
