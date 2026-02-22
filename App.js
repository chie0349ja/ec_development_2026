import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useStripe, StripeProvider } from '@stripe/stripe-react-native';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const CheckoutScreen = () => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  const initializePaymentSheet = async () => {
    try {
      const response = await axios.post(`${API_URL}/payment-sheet`);
      const { paymentIntent } = response.data;

      const { error } = await initPaymentSheet({
        merchantDisplayName: '美味しいお肉屋さん',
        paymentIntentClientSecret: paymentIntent,
        defaultBillingDetails: { name: 'テスト 太郎' },
        primaryButtonLabel: '購入する',
      });

      if (!error) {
        setLoading(true);
      }
    } catch (e) {
      console.log(e);
      Alert.alert('エラー', 'サーバーに接続できませんでした');
    }
  };

  useEffect(() => {
    initializePaymentSheet();
  }, []);

  const openPaymentSheet = async () => {
    const { error } = await presentPaymentSheet();

    if (error) {
      Alert.alert(`エラー: ${error.code}`, error.message);
    } else {
      Alert.alert('成功', '決済が完了しました！');
      setLoading(false);
      initializePaymentSheet();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>極上の和牛セット</Text>
      <Text style={styles.price}>¥1,000</Text>
      <TouchableOpacity
        style={[styles.button, !loading && styles.buttonDisabled]}
        onPress={openPaymentSheet}
        disabled={!loading}
      >
        <Text style={styles.buttonText}>今すぐ購入する</Text>
      </TouchableOpacity>
      <StatusBar style="auto" />
    </View>
  );
};

export default function App() {
  return (
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}
    >
      <CheckoutScreen />
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  price: {
    fontSize: 20,
    color: '#888',
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
