import { db } from "../firebase";
import { collection, addDoc, getDocs, query, orderBy, Timestamp, DocumentData } from "firebase/firestore";
import { User } from "firebase/auth";

export type Task = {
  id?: string;
  title: string;
  duration: number; // in minutes
  deadline: Timestamp;
  priority: "high" | "medium" | "low";
};

export const saveTask = async (user: User, task: Omit<Task, "id">) => {
  const ref = collection(db, "users", user.uid, "tasks");
  await addDoc(ref, task);
};

export const loadTasks = async (user: User): Promise<Task[]> => {
  const ref = collection(db, "users", user.uid, "tasks");
  const q = query(ref, orderBy("deadline", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as DocumentData),
  })) as Task[];
}; 