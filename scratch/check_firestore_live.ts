import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function checkLiveFirestore() {
  const collections = ['schedules_thanhhuong', 'schedules_chinhan', 'schedule', 'settings', 'users'];
  for (const col of collections) {
    try {
      const snap = await getDocs(collection(db, col));
      console.log(`=== Collection: ${col} (${snap.docs.length} docs) ===`);
      snap.docs.forEach((d) => {
        console.log(`Doc ID: ${d.id} =>`, JSON.stringify(d.data()));
      });
    } catch (e: any) {
      console.error(`Error reading ${col}:`, e.message);
    }
  }
}

checkLiveFirestore().catch(console.error);
