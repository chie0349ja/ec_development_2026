import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useStripe, StripeProvider } from '@stripe/stripe-react-native';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const PRODUCTS = [
  { id: '1', name: '極上の和牛セット', price: 1000 },
  { id: '2', name: '国産豚ロース', price: 680 },
  { id: '3', name: '鶏もも肉', price: 450 },
  { id: '4', name: '合いびきミンチ', price: 380 },
  { id: '5', name: 'ラムチョップ', price: 1200 },
];

const CheckoutScreen = () => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  const addToCart = (product) => {
    setCart((prev) => {
      const found = prev.find((p) => p.id === product.id);
      if (found) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart((prev) => {
      const item = prev.find((p) => p.id === id);
      if (!item) return prev;
      const next = item.quantity + delta;
      if (next <= 0) return prev.filter((p) => p.id !== id);
      return prev.map((p) =>
        p.id === id ? { ...p, quantity: next } : p
      );
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((p) => p.id !== id));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePurchase = async () => {
    if (cart.length === 0 || totalAmount < 100) return;
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/payment-sheet`, {
        amount: totalAmount,
      });
      const { paymentIntent } = response.data;

      const { error } = await initPaymentSheet({
        merchantDisplayName: '美味しいお肉屋さん',
        paymentIntentClientSecret: paymentIntent,
        defaultBillingDetails: { name: 'テスト 太郎' },
        primaryButtonLabel: '購入する',
      });

      if (error) {
        Alert.alert('エラー', error.message);
        setLoading(false);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        Alert.alert(`エラー: ${presentError.code}`, presentError.message);
      } else {
        Alert.alert('成功', '決済が完了しました！');
        setCart([]);
      }
    } catch (e) {
      console.log(e);
      Alert.alert('エラー', 'サーバーに接続できませんでした');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>商品一覧</Text>
        {PRODUCTS.map((product) => (
          <View key={product.id} style={styles.productRow}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productPrice}>¥{product.price.toLocaleString()}</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => addToCart(product)}
            >
              <Text style={styles.addButtonText}>カートに追加</Text>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={styles.sectionTitle}>カート</Text>
        {cart.length === 0 ? (
          <Text style={styles.emptyCart}>カートは空です</Text>
        ) : (
          <>
            {cart.map((item) => (
              <View key={item.id} style={styles.cartRow}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemDetail}>
                    ¥{item.price.toLocaleString()} × {item.quantity} = ¥
                    {(item.price * item.quantity).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.quantityRow}>
                  <TouchableOpacity
                    style={styles.quantityBtn}
                    onPress={() => updateQuantity(item.id, -1)}
                  >
                    <Text style={styles.quantityBtnText}>－</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityBtn}
                    onPress={() => updateQuantity(item.id, 1)}
                  >
                    <Text style={styles.quantityBtnText}>＋</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeFromCart(item.id)}
                  >
                    <Text style={styles.removeBtnText}>削除</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <Text style={styles.totalText}>合計: ¥{totalAmount.toLocaleString()}</Text>
            <TouchableOpacity
              style={[styles.purchaseButton, loading && styles.buttonDisabled]}
              onPress={handlePurchase}
              disabled={loading}
            >
              <Text style={styles.purchaseButtonText}>
                {loading ? '処理中...' : '購入する'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
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
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
  },
  productPrice: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCart: {
    fontSize: 16,
    color: '#888',
    paddingVertical: 16,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    marginBottom: 8,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  cartItemDetail: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  quantityText: {
    fontSize: 15,
    minWidth: 24,
    textAlign: 'center',
  },
  removeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  removeBtnText: {
    fontSize: 13,
    color: '#c00',
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
  },
  purchaseButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
