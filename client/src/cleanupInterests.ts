// Run this once to clean up old interests with wrong buyer names
import { collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function cleanupAllInterests() {
  try {
    const querySnapshot = await getDocs(collection(db, 'interests'));
    console.log(`Found ${querySnapshot.size} interests to delete`);
    
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log('All interests deleted successfully');
    alert('All old requests cleared! Users can now send fresh requests.');
  } catch (error) {
    console.error('Error cleaning up interests:', error);
    alert('Failed to cleanup: ' + error);
  }
}
