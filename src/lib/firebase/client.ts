import { getAnalytics, isSupported, logEvent, setAnalyticsCollectionEnabled, type Analytics } from "firebase/analytics";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

function envValue(value: string | undefined) {
  return value?.trim();
}

function analyticsMeasurementId(value: string | undefined) {
  return value?.match(/G-[A-Z0-9]+/)?.[0];
}

const firebaseConfig = {
  apiKey: envValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: envValue(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: envValue(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: envValue(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: envValue(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: envValue(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  measurementId: analyticsMeasurementId(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID),
};

function hasFirebaseAnalyticsConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId &&
      firebaseConfig.measurementId,
  );
}

function getFirebaseApp(): FirebaseApp | null {
  if (!hasFirebaseAnalyticsConfig()) return null;
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;

  const app = getFirebaseApp();
  if (!app) return null;

  const supported = await isSupported().catch(() => false);
  return supported ? getAnalytics(app) : null;
}

export async function setFirebaseAnalyticsEnabled(enabled: boolean) {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;
  setAnalyticsCollectionEnabled(analytics, enabled);
}

export async function trackFirebasePageView(pathname: string) {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;

  logEvent(analytics, "page_view", {
    page_location: window.location.href,
    page_path: pathname,
    page_title: document.title,
  });
}
