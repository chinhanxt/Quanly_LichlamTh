import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, getDocs, collection, updateDoc, deleteField } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'testhuy-68af2.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'testhuy-68af2',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'testhuy-68af2.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

const TELEGRAM_FIELDS = [
  'telegramBotToken',
  'telegramChatId',
  'allowedChatIdsStr',
  'allowedChatIds',
  'telegramSessionState',
  'sentRemindersLog',
];

const SECRET_FIELDS = ['geminiApiKey', 'groqApiKey', 'expenseAppsScriptUrl'];

function mask(value: string): string {
  if (!value) return '';
  return value.length <= 8 ? '********' : value.slice(0, 4) + '...' + value.slice(-4);
}

async function main() {
  const docsToClean = ['config', 'thanhhuong', 'chinhan'];

  for (const username of docsToClean) {
    const ref = doc(db, 'settings', username);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      console.log(`[${username}] (không tồn tại)`);
      continue;
    }

    const data = snap.data();
    const telegramData = Object.fromEntries(
      TELEGRAM_FIELDS.filter((f) => f in data).map((f) => [f, deleteField()])
    );

    console.log(`[${username}] thấy các bí mật khác (KHÔNG XÓA, chỉ báo):`);
    for (const f of SECRET_FIELDS) {
      if (data[f]) console.log(`  - ${f}: ${mask(String(data[f]))}`);
    }

    if (Object.keys(telegramData).length === 0) {
      console.log(`  ...không có field Telegram nào để xóa`);
      continue;
    }

    await updateDoc(ref, telegramData);
    console.log(`  ✅ Đã xóa các field Telegram: ${Object.keys(telegramData).join(', ')}`);
  }

  console.log('\nHoàn tất. Phiên bản này chỉ xóa field Telegram — các key khác vẫn giữ nguyên!');
}

main().catch((err) => {
  console.error('LỖI:', err);
  process.exit(1);
});