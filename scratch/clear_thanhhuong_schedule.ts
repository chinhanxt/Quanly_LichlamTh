import fs from 'fs';
import path from 'path';
import { db } from '../lib/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

async function clearThanhHuongSchedule() {
  console.log('1. Clearing local JSON schedule files...');
  const dataDir = path.join(process.cwd(), 'data');
  fs.writeFileSync(path.join(dataDir, 'schedule_thanhhuong.json'), '[]\n', 'utf-8');
  fs.writeFileSync(path.join(dataDir, 'schedule.json'), '[]\n', 'utf-8');
  console.log('Local JSON files cleared.');

  console.log('2. Clearing Firestore collections for thanhhuong...');
  const collectionsToClear = ['schedules_thanhhuong', 'schedule'];
  for (const colName of collectionsToClear) {
    try {
      const snap = await getDocs(collection(db, colName));
      console.log(`Clearing ${snap.docs.length} docs from Firestore collection "${colName}"...`);
      for (const d of snap.docs) {
        await deleteDoc(doc(db, colName, d.id));
      }
      console.log(`Cleared collection "${colName}".`);
    } catch (err: any) {
      console.warn(`Firestore clear failed for "${colName}":`, err.message);
    }
  }

  console.log('✅ Schedule for Thanh Hương cleared successfully!');
}

clearThanhHuongSchedule().catch(console.error);
