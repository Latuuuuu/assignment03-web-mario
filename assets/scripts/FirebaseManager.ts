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
