import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = window.__firebase_config || {};
const initialAuthToken = window.__initial_auth_token;

let db = null;
let auth = null;
let storage = null;
let isMock = false;
let app = null;

try {
    if (Object.keys(firebaseConfig).length > 0) {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        storage = getStorage(app);

        if (initialAuthToken) {
            signInWithCustomToken(auth, initialAuthToken).catch(console.error);
        }
    } else {
        isMock = true;
        console.warn("Firebase config missing. Using MOCK MODE.");
    }
} catch (e) {
    console.error("Firebase init error:", e);
    isMock = true;
}

export { db, auth, storage, isMock, app };
