import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

async function printSettings() {
  const d1 = await getDoc(doc(db, 'settings', 'thanhhuong'));
  console.log('--- settings/thanhhuong ---');
  console.log(JSON.stringify(d1.data(), null, 2));

  const d2 = await getDoc(doc(db, 'settings', 'config'));
  console.log('--- settings/config ---');
  console.log(JSON.stringify(d2.data(), null, 2));
}

printSettings().catch(console.error);
