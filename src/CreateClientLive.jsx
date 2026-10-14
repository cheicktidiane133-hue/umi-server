import CreateLive from "./CreateLive";
export default function CreateClientLive({ onBack, onOpenSpectatorPreview }) {
  let user = null;
  try { user = JSON.parse(localStorage.getItem("umiCurrentUser") || "null"); } catch { /* No session. */ }
  return <CreateLive clientMode onBack={onBack} onOpenSpectatorPreview={onOpenSpectatorPreview} userPhoto={user?.photoURL || ""} />;
}
