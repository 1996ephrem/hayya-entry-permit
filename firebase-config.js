// ============================================================
// FIREBASE CONFIGURATION
// ============================================================
// Replace these with your Firebase project credentials
// Get them from: https://console.firebase.google.com

const firebaseConfig = {
  apiKey: "AIzaSyD8RenzWLJZF3BipubiURZ7Td4Ppgy4D2o",
  authDomain: "hayya-entry-permit.firebaseapp.com",
  databaseURL: "https://hayya-entry-permit-default-rtdb.firebaseio.com",
  projectId: "hayya-entry-permit",
  storageBucket: "hayya-entry-permit.firebasestorage.app",
  messagingSenderId: "510676565272",
  appId: "1:510676565272:web:2420666930648b57a3b26d",
  measurementId: "G-43L3LRT1RR"
};

// Initialize Firebase
let app, database;

try {
  app = firebase.initializeApp(firebaseConfig);
  database = firebase.database();
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
}

// ============================================================
// DATABASE OPERATIONS
// ============================================================

// Save permit to Firebase
async function savePermitToFirebase(permit) {
  try {
    const ref = database.ref('permits/' + permit.referenceNo);
    await ref.set(permit);
    return { success: true };
  } catch (error) {
    console.error('Error saving permit:', error);
    return { success: false, error: error.message };
  }
}

// Get all permits from Firebase
async function getAllPermitsFromFirebase() {
  try {
    const snapshot = await database.ref('permits').once('value');
    const data = snapshot.val();
    if (!data) return [];
    return Object.values(data);
  } catch (error) {
    console.error('Error getting permits:', error);
    return [];
  }
}

// Get single permit by reference number
async function getPermitByRef(referenceNo) {
  try {
    const snapshot = await database.ref('permits/' + referenceNo).once('value');
    return snapshot.val();
  } catch (error) {
    console.error('Error getting permit:', error);
    return null;
  }
}

// Delete permit from Firebase
async function deletePermitFromFirebase(referenceNo) {
  try {
    await database.ref('permits/' + referenceNo).remove();
    return { success: true };
  } catch (error) {
    console.error('Error deleting permit:', error);
    return { success: false, error: error.message };
  }
}

// Update permit in Firebase
async function updatePermitInFirebase(referenceNo, updates) {
  try {
    await database.ref('permits/' + referenceNo).update(updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating permit:', error);
    return { success: false, error: error.message };
  }
}

// Check if Firebase is connected
function isFirebaseConnected() {
  return typeof firebase !== 'undefined' && database;
}
