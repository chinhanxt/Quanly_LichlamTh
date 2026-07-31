import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function findShiftInFirestore() {
  const cols = ['schedules_thanhhuong', 'schedules_chinhan', 'schedule', 'settings', 'users', 'schedules'];
  for (const c of cols) {
    try {
      const snap = await getDocs(collection(db, c));
      console.log(`=== Collection: ${c} (${snap.docs.length} docs) ===`);
      snap.docs.forEach((doc) => {
        console.log(`ID: ${doc.id} =>`, JSON.stringify(doc.data()));
      });
    } catch (e: any) {
      console.log(`Col ${c}:`, e.message);
    }
  }
}

findShiftInFirestore().catch(console.error);
