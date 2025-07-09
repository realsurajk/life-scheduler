import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { auth } from "../firebase";

const db = getFirestore();

export async function loadSchedule(userId) {
  const ref = doc(db, "schedules", userId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data();
  } else {
    return null;
  }
}

export async function saveSchedule(userId, data) {
  const ref = doc(db, "schedules", userId);
  await setDoc(ref, data, { merge: true });
} 