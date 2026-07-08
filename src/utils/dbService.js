import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';

/**
 * Persists linked spreadsheet metadata layout specs securely to Firestore under the user's uid
 */
export const saveLinkedSheet = async (userId, config) => {
  if (!userId) return;

  const docId = `sheet_${config.subsheetName.trim().toLowerCase()}`;
  const docRef = doc(db, 'users', userId, 'linkedAccounts', docId);

  await setDoc(
    docRef,
    {
      id: docId,
      spreadsheetId: config.spreadsheetId.trim(),
      subsheetName: config.subsheetName.trim(),
      accountType: config.accountType,
      linkedAt: new Date().toISOString(),
    },
    { merge: true }
  );
};

/**
 * Ingests all active tracking document links bound to the verified profile session
 */
export const getLinkedSheets = async (userId) => {
  if (!userId) return [];
  const colRef = collection(db, 'users', userId, 'linkedAccounts');
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map((doc) => doc.data());
};

/**
 * Wipes out a sheet tracking integration trajectory map cleanly from the cloud database
 */
export const removeLinkedSheet = async (userId, docId) => {
  if (!userId) return;
  const docRef = doc(db, 'users', userId, 'linkedAccounts', docId);
  await deleteDoc(docRef);
};
