import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStripe, StripeProvider } from '@stripe/stripe-react-native';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';
import { supabase } from './lib/supabase';
import AuthScreen from './screens/AuthScreen';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const SAVED_BILLING_KEY = 'savedBillingDetails';

const PRODUCTS = [
  { id: '1', name: '極上の和牛セット', price: 1000 },
  { id: '2', name: '国産豚ロース', price: 680 },
  { id: '3', name: '鶏もも肉', price: 450 },
  { id: '4', name: '合いびきミンチ', price: 380 },
  { id: '5', name: 'ラムチョップ', price: 1200 },
];

const CheckoutScreen = ({ onLogout }) => {
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
    const forceLoadingFalse = () => setLoading((prev) => (prev ? false : prev));
    const safetyTimer = setTimeout(forceLoadingFalse, 90000); // 90秒で強制的にボタン復帰
    try {
      const response = await axios.post(
        `${API_URL}/payment-sheet`,
        { amount: totalAmount },
        { timeout: 15000 }
      );
      const { paymentIntent, paymentIntentId } = response.data;

      let defaultBillingDetails = { name: 'テスト 太郎' };
      try {
        const saved = await AsyncStorage.getItem(SAVED_BILLING_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.name || parsed.address || parsed.phone)) {
            defaultBillingDetails = parsed;
          }
        }
      } catch (_) {}

      const { error } = await initPaymentSheet({
        merchantDisplayName: '美味しいお肉屋さん',
        paymentIntentClientSecret: paymentIntent,
        defaultBillingDetails,
        primaryButtonLabel: '購入する',
        billingDetailsCollectionConfiguration: {
          address: 'full',
          phone: 'always',
        },
      });

      if (error) {
        Alert.alert('エラー', error.message);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        Alert.alert(`エラー: ${presentError.code}`, presentError.message);
        return;
      }

      try {
        const detailsRes = await axios.get(
          `${API_URL}/payment-details/${paymentIntentId}`,
          { timeout: 10000 }
        );
        const billingDetails = detailsRes.data;
        if (billingDetails && (billingDetails.name || billingDetails.address || billingDetails.phone)) {
          await AsyncStorage.setItem(SAVED_BILLING_KEY, JSON.stringify(billingDetails));
        }
      } catch (e) {
        console.log('Failed to save billing details', e);
      }
      Alert.alert('成功', '決済が完了しました！');
      setCart([]);
    } catch (e) {
      console.log(e);
      if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
        Alert.alert('タイムアウト', 'サーバーに接続できませんでした。ネットワークとmeat-serverの起動を確認してください。');
      } else {
        Alert.alert('エラー', 'サーバーに接続できませんでした');
      }
    } finally {
      clearTimeout(safetyTimer);
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
      {onLogout && (
        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
            <Text style={styles.logoutText}>ログアウト</Text>
          </TouchableOpacity>
        </View>
      )}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
};

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      setAuthLoading(false);
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}
    >
      {authLoading ? null : session ? (
        <CheckoutScreen onLogout={handleLogout} />
      ) : (
        <AuthScreen />
      )}
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
  logoutContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  logoutButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#eee',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    color: '#333',
  },
});
