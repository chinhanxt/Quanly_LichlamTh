import { db } from '../lib/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

async function clearCollections() {
  const cols = ['schedules_thanhhuong', 'schedules_chinhan', 'schedule'];
  for (const colName of cols) {
    try {
      const snap = await getDocs(collection(db, colName));
      console.log(`Clearing ${snap.docs.length} docs from ${colName}...`);
      for (const d of snap.docs) {
        await deleteDoc(doc(db, colName, d.id));
      }
    } catch (e: any) {
      console.warn(`Could not clear ${colName}:`, e.message);
    }
  }
  console.log('Firestore schedule collections cleared successfully!');
}

clearCollections();
