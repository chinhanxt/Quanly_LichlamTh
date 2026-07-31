import { db } from '../lib/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

async function purgeAllScheduleDocs() {
  const collections = ['schedules_thanhhuong', 'schedules_chinhan', 'schedule', 'schedules'];
  for (const colName of collections) {
    try {
      const snap = await getDocs(collection(db, colName));
      console.log(`Deleting ${snap.docs.length} items from ${colName}...`);
      for (const d of snap.docs) {
        console.log(`Deleting doc ${d.id}...`);
        await deleteDoc(doc(db, colName, d.id));
      }
    } catch (e: any) {
      console.error(`Error purging ${colName}:`, e.message);
    }
  }
  console.log('✅ ALL FIRESTORE SCHEDULE DOCS DELETED SUCCESSFULLY!');
}

purgeAllScheduleDocs().catch(console.error);
