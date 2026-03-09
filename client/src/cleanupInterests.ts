// Run this once to clean up duplicate products and old interests
import { collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function cleanupDuplicateProducts() {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    console.log(`Found ${querySnapshot.size} total products`);
    
    const productMap = new Map();
    const toDelete: any[] = [];
    
    // Group by description (case-insensitive)
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const key = data.description.toLowerCase().trim();
      
      if (productMap.has(key)) {
        // Duplicate found - mark for deletion
        toDelete.push(doc.ref);
      } else {
        // First occurrence - keep it
        productMap.set(key, doc.id);
      }
    });
    
    console.log(`Found ${toDelete.length} duplicates to delete`);
    
    if (toDelete.length > 0) {
      const deletePromises = toDelete.map(ref => deleteDoc(ref));
      await Promise.all(deletePromises);
      alert(`Deleted ${toDelete.length} duplicate products. Kept ${productMap.size} unique products.`);
    } else {
      alert('No duplicate products found!');
    }
  } catch (error) {
    console.error('Error cleaning up products:', error);
    alert('Failed to cleanup: ' + error);
  }
}

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
