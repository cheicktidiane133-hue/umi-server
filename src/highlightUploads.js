import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

const tasks = new Map(), listeners = new Set();
let opening;
const emit = () => listeners.forEach((listener) => listener(Array.from(tasks.values()).map(({ blob, ...task }) => task)));
function database() {
  if (!opening) opening = new Promise((resolve, reject) => {
    const request = indexedDB.open("umi-highlight-uploads", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("uploads", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch((error) => { opening = null; throw error; });
  return opening;
}
async function store(mode, operation) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("uploads", mode);
    const request = operation(transaction.objectStore("uploads"));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("Sauvegarde interrompue."));
  });
}
async function upload(task) {
  if (task.status === "sending" || auth.currentUser?.uid !== task.uid) return;
  task.status = "sending"; task.error = ""; emit();
  try {
    const token = await auth.currentUser.getIdToken();
    const response = await fetch(task.url, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": task.blob.type.split(";")[0] || "video/webm" }, body: task.blob,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.error || "Envoi du temps fort impossible.");
    await store("readwrite", (storage) => storage.delete(task.id));
    tasks.delete(task.id);
  } catch (error) {
    task.status = "error";
    task.error = error.message || "Envoi interrompu.";
  }
  emit();
}
export async function queueHighlight({ id, blob, url, uid }) {
  if (!blob?.size || !uid) throw new Error("Temps fort ou compte manquant.");
  const task = { id, blob, url, uid, status: "waiting", error: "" };
  // Enregistrer la vidéo avant d'autoriser le départ de la page.
  await store("readwrite", (storage) => storage.put(task));
  tasks.set(id, task); emit();
  void upload(task);
}
export function watchHighlightUploads(listener) {
  listeners.add(listener); emit();
  return () => listeners.delete(listener);
}
export async function resumeHighlightUploads() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const saved = await store("readonly", (storage) => storage.getAll());
  for (const task of saved) {
    if (task.uid !== uid) continue;
    if (!tasks.has(task.id)) tasks.set(task.id, { ...task, status: "waiting" });
    void upload(tasks.get(task.id));
  }
  emit();
}
export function retryHighlight(id) {
  const task = tasks.get(id);
  if (task) void upload(task);
}
export function startHighlightQueue() {
  const resume = () => { resumeHighlightUploads().catch(console.error); };
  const stopAuth = onAuthStateChanged(auth, resume);
  window.addEventListener("online", resume);
  return () => { stopAuth(); window.removeEventListener("online", resume); };
}
