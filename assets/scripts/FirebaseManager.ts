const firebaseConfig = {
    apiKey: "AIzaSyCEIjNStNNLplhBurgoRAYET7ap86zMkmg",
    authDomain: "web-mario-cb309.firebaseapp.com",
    databaseURL: "https://web-mario-cb309-default-rtdb.firebaseio.com",
    projectId: "web-mario-cb309",
    storageBucket: "web-mario-cb309.firebasestorage.app",
    messagingSenderId: "462295967028",
    appId: "1:462295967028:web:c10b6d1b1c8851ff3db161",
};

let firebaseApp: any = null;
let firebaseReadyPromise: Promise<any> = null;

const firebaseScriptUrls = [
    "https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth-compat.js",
    "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore-compat.js",
];

export interface BestRecord {
    levelName: string;
    bestScore: number;
    bestClearTime: number;
}

export interface LeaderboardEntry extends BestRecord {
    uid: string;
    playerName: string;
    email: string;
}

export function ensureFirebaseReady(): Promise<any> {
    if (getFirebaseGlobal()) {
        return Promise.resolve(initializeFirebase());
    }

    if (firebaseReadyPromise) {
        return firebaseReadyPromise;
    }

    firebaseReadyPromise = loadScriptsInOrder(firebaseScriptUrls)
        .then(() => initializeFirebase());
    return firebaseReadyPromise;
}

export function initializeFirebase(): any {
    const firebase = getFirebaseGlobal();
    if (!firebase) {
        throw new Error("Firebase SDK not loaded. Add firebase-app-compat.js, firebase-auth-compat.js, and firebase-firestore-compat.js to the web page.");
    }

    if (!firebaseApp) {
        firebaseApp = firebase.apps && firebase.apps.length > 0
            ? firebase.app()
            : firebase.initializeApp(firebaseConfig);
    }

    return firebaseApp;
}

export function getFirebaseAuth(): any {
    initializeFirebase();
    return getFirebaseGlobal().auth();
}

export function getFirebaseDb(): any {
    initializeFirebase();
    const firebase = getFirebaseGlobal();
    return firebase.firestore ? firebase.firestore() : null;
}

export function getCurrentUser(): any {
    const firebase = getFirebaseGlobal();
    if (!firebase || !firebase.auth) {
        return null;
    }

    return firebase.auth().currentUser;
}

export function onFirebaseAuthStateChanged(callback: (user: any) => void): Promise<() => void> {
    return ensureFirebaseReady().then(() => getFirebaseAuth().onAuthStateChanged(callback));
}

export function signInFirebase(email: string, password: string): Promise<any> {
    return ensureFirebaseReady().then(() => getFirebaseAuth().signInWithEmailAndPassword(email, password));
}

export function createFirebaseUser(email: string, password: string): Promise<any> {
    return ensureFirebaseReady().then(() => getFirebaseAuth().createUserWithEmailAndPassword(email, password));
}

export function signOutFirebase(): Promise<any> {
    return ensureFirebaseReady().then(() => getFirebaseAuth().signOut());
}

export function syncBestRecordToFirebase(levelName: string, score: number, clearTime: number): Promise<BestRecord | null> {
    return ensureFirebaseReady().then(() => {
        const user = getCurrentUser();
        const db = getFirebaseDb();
        if (!user || !db || !levelName) {
            return null;
        }

        const safeScore = Math.max(0, Math.floor(score));
        const safeClearTime = Math.max(0, Math.floor(clearTime));
        const userRef = db.collection("users").doc(user.uid);
        const recordRef = userRef.collection("records").doc(levelName);
        const leaderboardRef = db.collection("leaderboard").doc(`${levelName}_${user.uid}`);

        return recordRef.get().then((snapshot: any) => {
            const oldData = snapshot.exists ? snapshot.data() : {};
            const oldScore = toNumber(oldData.bestScore, 0);
            const oldClearTime = toNumber(oldData.bestClearTime, -1);
            const bestScore = Math.max(oldScore, safeScore);
            const bestClearTime = oldClearTime < 0 ? safeClearTime : Math.min(oldClearTime, safeClearTime);
            const playerName = getUserDisplayName(user);
            const record: BestRecord = {
                levelName,
                bestScore,
                bestClearTime,
            };
            const userData = {
                displayName: playerName,
                email: user.email || "",
                updatedAt: getServerTimestamp(),
            };
            const recordData = {
                levelName,
                bestScore,
                bestClearTime,
                updatedAt: getServerTimestamp(),
            };
            const leaderboardData = {
                uid: user.uid,
                playerName,
                email: user.email || "",
                levelName,
                bestScore,
                bestClearTime,
                updatedAt: getServerTimestamp(),
            };

            return Promise.all([
                userRef.set(userData, { merge: true }),
                recordRef.set(recordData, { merge: true }),
                leaderboardRef.set(leaderboardData, { merge: true }),
            ]).then(() => record);
        });
    });
}

export function fetchUserBestRecord(levelName: string): Promise<BestRecord | null> {
    return ensureFirebaseReady().then(() => {
        const user = getCurrentUser();
        const db = getFirebaseDb();
        if (!user || !db || !levelName) {
            return null;
        }

        return db.collection("users").doc(user.uid).collection("records").doc(levelName).get()
            .then((snapshot: any) => {
                if (!snapshot.exists) {
                    return null;
                }

                const data = snapshot.data();
                return {
                    levelName,
                    bestScore: toNumber(data.bestScore, 0),
                    bestClearTime: toNumber(data.bestClearTime, -1),
                };
            });
    });
}

export function fetchLeaderboard(levelName: string, limitCount: number = 5): Promise<LeaderboardEntry[]> {
    return ensureFirebaseReady().then(() => {
        const db = getFirebaseDb();
        if (!db || !levelName) {
            return [];
        }

        return db.collection("leaderboard").where("levelName", "==", levelName).get()
            .then((snapshot: any) => {
                const entries: LeaderboardEntry[] = [];
                snapshot.forEach((doc: any) => {
                    const data = doc.data();
                    entries.push({
                        uid: data.uid || doc.id,
                        playerName: data.playerName || data.email || "Player",
                        email: data.email || "",
                        levelName,
                        bestScore: toNumber(data.bestScore, 0),
                        bestClearTime: toNumber(data.bestClearTime, -1),
                    });
                });

                entries.sort((a, b) => {
                    if (b.bestScore !== a.bestScore) {
                        return b.bestScore - a.bestScore;
                    }

                    const aTime = a.bestClearTime < 0 ? 9007199254740991 : a.bestClearTime;
                    const bTime = b.bestClearTime < 0 ? 9007199254740991 : b.bestClearTime;
                    return aTime - bTime;
                });

                return entries.slice(0, Math.max(1, Math.floor(limitCount)));
            });
    });
}

export function getFirebaseErrorMessage(error: any): string {
    if (!error) {
        return "Firebase error.";
    }

    if (error.code) {
        return error.code.replace("auth/", "").replace(/-/g, " ");
    }

    return error.message || "Firebase error.";
}

function getFirebaseGlobal(): any {
    return (window as any).firebase;
}

function getServerTimestamp(): any {
    const firebase = getFirebaseGlobal();
    return firebase && firebase.firestore && firebase.firestore.FieldValue
        ? firebase.firestore.FieldValue.serverTimestamp()
        : new Date().toISOString();
}

function getUserDisplayName(user: any): string {
    if (!user) {
        return "Player";
    }

    if (user.displayName) {
        return user.displayName;
    }

    if (user.email) {
        return user.email.split("@")[0];
    }

    return user.uid || "Player";
}

function toNumber(value: any, fallback: number): number {
    const numberValue = Number(value);
    return isNaN(numberValue) ? fallback : numberValue;
}

function loadScriptsInOrder(urls: string[]): Promise<void> {
    let chain = Promise.resolve();
    for (let i = 0; i < urls.length; i++) {
        chain = chain.then(() => loadScript(urls[i]));
    }
    return chain;
}

function loadScript(url: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const existingScript = document.querySelector(`script[src="${url}"]`) as HTMLScriptElement;
        if (existingScript) {
            if ((existingScript as any).__firebaseLoaded) {
                resolve();
                return;
            }

            existingScript.addEventListener("load", () => resolve());
            existingScript.addEventListener("error", () => reject(new Error(`Failed to load ${url}`)));
            return;
        }

        const script = document.createElement("script");
        script.src = url;
        script.async = false;
        script.onload = () => {
            (script as any).__firebaseLoaded = true;
            resolve();
        };
        script.onerror = () => reject(new Error(`Failed to load ${url}`));
        document.head.appendChild(script);
    });
}
