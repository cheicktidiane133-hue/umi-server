import "./ClientProductImport.css";
import { useEffect, useRef, useState } from "react";
import { auth } from "./firebase";
import UmiModal from "./UmiModal";
import { numericPrice } from "./productModel";
function ImportedMediaPreview({ file, index }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const preview = URL.createObjectURL(file);
    setUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [file]);
  if (!url) return null;
  return file.type.startsWith("video/")
    ? <video className="import-media" src={url} controls playsInline preload="metadata" />
    : <img className="import-media" src={url} alt={`Machine ${index + 1}`} />;
}
export default function ClientProductImport({ multiple = false, onClose, onSave }) {
  const input = useRef(null);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { input.current?.click(); }, []);
  async function save() {
    if (busy || !items.length) return;
    if (!auth.currentUser) { setError("Reconnectez-vous avant l’importation."); return; }
    if (items.some((item) => item.price.trim() && numericPrice(item.price) === null)) { setError("Vérifiez les prix."); return; }
    setBusy(true); setError("");
    try {
      const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      if (!cloud || !preset) throw new Error("Les paramètres Cloudinary sont manquants.");
      const products = [];
      for (const [index, item] of items.entries()) {
        const video = item.file.type.startsWith("video/");
        const body = new FormData(); body.append("file", item.file); body.append("upload_preset", preset);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${video ? "video" : "image"}/upload`, { method: "POST", body });
        const result = await response.json();
        if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Importation impossible.");
        products.push({ id: `client-${auth.currentUser.uid}-${Date.now()}-${index}`, ownerId: auth.currentUser.uid, sellerId: auth.currentUser.uid, productType: "machine", liveType: "client", name: item.name.trim(), description: item.description.trim(), price: numericPrice(item.price), images: video ? [] : [result.secure_url], imageUrl: video ? "" : result.secure_url, videos: video ? [result.secure_url] : [], videoUrl: video ? result.secure_url : "", models: [] });
      }
      await onSave(products);
    } catch (err) { setError(err.message || "Importation impossible."); }
    finally { setBusy(false); }
  }
  return <UmiModal title="Importer vos machines" onClose={() => { if (!busy) onClose(); }}><div className="umi-product-import">
    <input ref={input} type="file" hidden multiple={multiple} accept="image/*,video/*" onChange={(event) => { const files = Array.from(event.target.files || []).filter((file) => /^(image|video)\//.test(file.type)).slice(0, multiple ? 6 : 1); setItems(files.map((file) => ({ file, name: "", price: "", description: "" }))); event.target.value = ""; }} />
    <button type="button" disabled={busy} onClick={() => input.current?.click()}>Choisir dans la galerie</button>
    {items.map((item, index) => <fieldset key={index}>
      <legend>Machine {index + 1}</legend>
      <ImportedMediaPreview file={item.file} index={index} />
      {["name", "price", "description"].map((field) => {
        const props = { disabled: busy, value: item[field], onChange: (event) => setItems((current) => current.map((entry, i) => index === i ? { ...entry, [field]: event.target.value } : entry)) };
        return <label key={field}>{field === "name" ? "Nom (facultatif)" : field === "price" ? "Prix en FCFA" : "Description"}
          {field === "description" ? <textarea {...props} rows={3} /> : <input {...props} type="text" inputMode={field === "price" ? "decimal" : "text"} />}
        </label>;
      })}
    </fieldset>)}
    {error && <p role="alert">{error}</p>}
    <button type="button" disabled={busy || !items.length} onClick={save}>{busy ? "Importation…" : "Utiliser les machines"}</button>
  </div></UmiModal>;
}
