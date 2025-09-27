import { getDatabase, ref, get, set, push, update, remove, onValue, off } from 'firebase/database';
import { app } from './firebaseConfig';

const database = getDatabase(app);

// User operations
export const getUserByUid = async (uid) => {
  try {
    const userRef = ref(database, `users/${uid}`);
    const snapshot = await get(userRef);
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    // Re-throw with more specific error information
    if (error.code === 'PERMISSION_DENIED') {
      console.warn('Permission denied accessing user data, user may not exist in database');
      return null;
    }
    throw error;
  }
};

export const createUser = async (uid, userData) => {
  const userRef = ref(database, `users/${uid}`);
  await set(userRef, userData);
};

export const updateUser = async (uid, userData) => {
  const userRef = ref(database, `users/${uid}`);
  await update(userRef, userData);
};

// Generic database operations
export const getData = async (path) => {
  const dataRef = ref(database, path);
  const snapshot = await get(dataRef);
  return snapshot.exists() ? snapshot.val() : null;
};

export const setData = async (path, data) => {
  const dataRef = ref(database, path);
  await set(dataRef, data);
};

export const updateData = async (path, data) => {
  const dataRef = ref(database, path);
  try {
    await update(dataRef, data);
  } catch (error) {
    console.error(`Failed to update data at path ${path}:`, error);
    throw error;
  }
};

export const pushData = async (path, data) => {
  const dataRef = ref(database, path);
  const newRef = push(dataRef);
  try {
    await set(newRef, data);
  } catch (error) {
    console.error(`Failed to push data to path ${path}:`, error);
    throw error;
  }
  return newRef.key;
};

export const removeData = async (path) => {
  const dataRef = ref(database, path);
  try {
    await remove(dataRef);
  } catch (error) {
    console.error(`Failed to remove data at path ${path}:`, error);
    throw error;
  }
};

// Real-time listeners
export const subscribeToData = (path, callback) => {
  const dataRef = ref(database, path);
  const unsubscribe = onValue(dataRef, callback, (error) => {
    console.error(`Error in real-time listener for path ${path}:`, error);
  });
  return () => off(dataRef, 'value', callback);
};

export { database };