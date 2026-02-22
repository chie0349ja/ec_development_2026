# MyMeatShop（肉のECアプリ）

Expo（React Native）と Stripe を使った、テスト環境で動く「肉のEC」デモアプリです。  
購入ボタンから Stripe の Payment Sheet でカード決済まで一通り体験できます。

## 構成

- **アプリ（Expo）**: フロントエンド。商品表示と「今すぐ購入する」ボタン、Stripe Payment Sheet の表示。
- **meat-server**: Node.js（Express）の簡易バックエンド。Stripe の PaymentIntent を作成し、Client Secret を返す API を提供。

## 必要な環境

- Node.js（推奨: LTS）
- npm
- Stripe アカウント（テストモードで利用）
- スマホに Expo Go アプリ（実機テスト時）

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/chie0349ja/ec_development_2026.git
cd ec_development_2026
```

### 2. アプリ（Expo）の準備

```bash
npm install
# または
npx expo install
```

ルートに `.env` を作成し、次を設定してください。

- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` … Stripe ダッシュボードの「公開可能キー」（`pk_test_...`）
- `EXPO_PUBLIC_API_URL` … バックエンドの URL（開発時は例: `http://あなたのPCのIP:3000`）

### 3. バックエンド（meat-server）の準備

```bash
cd meat-server
npm install
cp .env.example .env
```

`meat-server/.env` に Stripe の「シークレットキー」（`sk_test_...`）を設定します。

```env
STRIPE_SECRET_KEY=sk_test_あなたのシークレットキー
```

## 動かし方

### 1. バックエンドを起動

```bash
cd meat-server
node index.js
```

「サーバーがポート3000で起動しました！」と表示されればOKです。

### 2. アプリを起動

別のターミナルで、プロジェクトルートで実行します。

```bash
npx expo start
```

Expo Go で QR コードを読み取り、アプリを開きます。

### 3. テスト決済

- 画面の「今すぐ購入する」をタップ
- Stripe の決済シートが表示されたら、テストカード番号 `4242 4242 4242 4242` を入力
- 有効期限は未来の日付、CVC は任意の3桁で完了

**注意**: スマホとPCが同じ Wi-Fi に接続されていること、`.env` の `EXPO_PUBLIC_API_URL` が起動しているPCのIP（例: `192.168.1.5`）になっていることを確認してください。

## 主な技術スタック

- **フロント**: Expo 54, React Native, @stripe/stripe-react-native, axios
- **バックエンド**: Node.js, Express, Stripe API, cors, dotenv

## セキュリティ上の注意

- 秘密鍵（`sk_test_...`）は **meat-server の .env のみ**で使用し、アプリやリポジトリには含めません。
- `.env` は `.gitignore` に含まれており、Git にはコミットされません。
- 本番運用する場合は、API を HTTPS 化し、CORS や認証を適切に設定してください。

## ライセンス

ISC
