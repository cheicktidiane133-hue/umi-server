import AgoraRTC from "agora-rtc-sdk-ng";
import { auth } from "./firebase";

// Transport Agora derrière les opérations utilisées par les écrans UMI.
export const RoomEvent = {
  TrackSubscribed: "track-subscribed", TrackUnsubscribed: "track-unsubscribed",
  ParticipantConnected: "participant-connected", ParticipantDisconnected: "participant-disconnected",
  Disconnected: "disconnected",
};
export const Track = { Source: { Camera: "camera", Microphone: "microphone" } };
export const VideoQuality = { HIGH: 2 };

export async function requestAgoraToken(apiUrl, liveId, role, signal, observer = false, sessionId = crypto.randomUUID()) {
  const user = auth.currentUser;
  if (!user) throw new Error("Reconnectez-vous pour accéder au direct.");
  const endpoint = `${String(apiUrl).replace(/\/$/, "")}/agora-token`;
  let response;
  try { response = await fetch(endpoint, {
    method: "POST", signal,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify({ liveId, role, observer, sessionId }),
  }); } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error(`Le serveur du live est inaccessible (${endpoint}). Vérifiez le serveur et le lien de connexion.`);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || (response.status === 404
    ? "La route /agora-token est absente. Redémarrez le serveur avec le server.js et le agoraRoutes.js corrigés."
    : `Le serveur du live répond avec une erreur HTTP ${response.status}.`));
  if (!data.appId || !data.channelName || !data.token || !data.uid) throw new Error("Réponse Agora incomplète.");
  return { ...data, apiUrl, liveId, role, observer, sessionId };
}

class MediaTrack {
  constructor(raw, sdk = null) {
    this.raw = raw; this.sdk = sdk; this.kind = raw.kind;
    this.elements = new Set(); this.processor = null; this.processedTrack = null;
  }
  get mediaStreamTrack() { return this.raw; }
  get outputTrack() { return this.processedTrack || this.raw; }
  attach(element) {
    const target = element || document.createElement(this.kind === "audio" ? "audio" : "video");
    target.srcObject = new MediaStream([this.outputTrack]);
    target.autoplay = true; target.playsInline = true;
    this.elements.add(target);
    target.play().catch(() => {});
    return target;
  }
  detach(element) {
    const targets = element ? [element] : [...this.elements];
    targets.forEach((target) => { target.srcObject = null; this.elements.delete(target); });
    return targets;
  }
  refresh() { this.elements.forEach((element) => this.attach(element)); }
  async waitForDimensions(timeout = 10000) {
    const video = [...this.elements].find((element) => element.tagName === "VIDEO");
    if (!video || video.videoWidth) return;
    await new Promise((resolve, reject) => {
      const finish = (error) => { clearTimeout(timer); video.removeEventListener("loadedmetadata", loaded); error ? reject(error) : resolve(); };
      const loaded = () => finish();
      const timer = setTimeout(() => finish(new Error("La caméra ne fournit pas d’image.")), timeout);
      video.addEventListener("loadedmetadata", loaded, { once: true });
    });
  }
  async setProcessor(processor) {
    await this.stopProcessor();
    try {
      await processor.init({ track: this.raw });
      if (!processor.processedTrack) throw new Error("Fond virtuel indisponible.");
      if (this.sdk) await this.sdk.replaceTrack(processor.processedTrack, false);
      this.processor = processor; this.processedTrack = processor.processedTrack;
      this.refresh();
    } catch (error) { await processor.destroy(); throw error; }
  }
  async stopProcessor() {
    if (!this.processor) return;
    const processor = this.processor;
    if (this.sdk) await this.sdk.replaceTrack(this.raw, false);
    this.processor = null; this.processedTrack = null;
    this.refresh(); await processor.destroy();
  }
  async restartTrack(options) {
    const processor = this.processor;
    await this.stopProcessor();
    const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints(options), audio: false });
    const next = stream.getVideoTracks()[0];
    try { if (this.sdk) await this.sdk.replaceTrack(next, false); }
    catch (error) { next.stop(); throw error; }
    const previous = this.raw; this.raw = next; previous.stop(); this.refresh();
    if (processor) await this.setProcessor(processor);
  }
  stop() {
    this.detach(); this.processor?.destroy().catch(console.error);
    this.processor = null; this.processedTrack = null;
    this.sdk?.close(); this.raw.stop();
  }
}

function videoConstraints(options = {}) {
  return { facingMode: options.facingMode || "user" };
}
export async function createLocalTracks(options) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: options.video ? videoConstraints(options.video) : false,
    audio: options.audio || false,
  });
  return stream.getTracks().map((raw) => new MediaTrack(raw));
}

export class Room {
  constructor() {
    this.client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
    this.state = "disconnected"; this.closed = false; this.handlers = new Map();
    this.remoteParticipants = new Map(); this.renewing = null; this.subscriptions = new Map();
    this.localParticipant = {
      identity: "", trackPublications: new Map(),
      publishTrack: (track) => this.publishTrack(track),
      setMicrophoneEnabled: (enabled) => this.setEnabled("audio", enabled),
      setCameraEnabled: (enabled) => this.setEnabled("video", enabled),
    };
    this.client.on("user-published", (user, kind) => { this.subscribe(user, kind).catch((error) => this.fail(error)); });
    this.client.on("user-unpublished", (user, kind) => {
      const participant = this.remoteParticipants.get(String(user.uid));
      const publication = participant?.trackPublications.get(kind);
      if (publication) { publication.track.detach(); participant.trackPublications.delete(kind); this.emit(RoomEvent.TrackUnsubscribed, publication.track); }
    });
    this.client.on("user-joined", (user) => this.participant(user));
    this.client.on("user-left", (user) => {
      const participant = this.remoteParticipants.get(String(user.uid));
      participant?.trackPublications.forEach(({ track }) => { track.detach(); this.emit(RoomEvent.TrackUnsubscribed, track); });
      this.remoteParticipants.delete(String(user.uid));
      this.emit(RoomEvent.ParticipantDisconnected, participant);
    });
    this.client.on("token-privilege-will-expire", () => { this.renewToken().catch((error) => this.fail(error)); });
    this.client.on("token-privilege-did-expire", () => { this.renewToken().catch((error) => this.fail(error)); });
    this.client.on("connection-state-change", (state, previous) => {
      this.state = state.toLowerCase();
      if (state === "DISCONNECTED" && previous !== "DISCONNECTED") this.emit(RoomEvent.Disconnected);
    });
  }
  on(event, callback) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event).add(callback); return this;
  }
  emit(event, ...args) { this.handlers.get(event)?.forEach((callback) => callback(...args)); }
  participant(user) {
    const key = String(user.uid);
    if (!this.remoteParticipants.has(key)) {
      const participant = { identity: `host-${key}`, trackPublications: new Map() };
      this.remoteParticipants.set(key, participant); this.emit(RoomEvent.ParticipantConnected, participant);
    }
    return this.remoteParticipants.get(key);
  }
  async subscribe(user, kind) {
    if (this.closed || !["video", "audio"].includes(kind)) return;
    if (String(user.uid) !== String(this.config?.hostUid)) return;
    const key = `${user.uid}:${kind}`;
    if (this.subscriptions.has(key)) return this.subscriptions.get(key);
    const pending = this.subscribeTrack(user, kind).finally(() => this.subscriptions.delete(key));
    this.subscriptions.set(key, pending);
    return pending;
  }
  async subscribeTrack(user, kind) {
    await this.client.subscribe(user, kind);
    if (this.closed) return;
    const sdk = kind === "video" ? user.videoTrack : user.audioTrack;
    if (!sdk) return;
    const participant = this.participant(user);
    const old = participant.trackPublications.get(kind);
    old?.track.detach();
    const track = new MediaTrack(sdk.getMediaStreamTrack());
    const publication = { kind, track, setVideoQuality: () => this.client.setRemoteVideoStreamType(user.uid, 0).catch(console.error) };
    participant.trackPublications.set(kind, publication);
    if (kind === "video") publication.setVideoQuality();
    this.emit(RoomEvent.TrackSubscribed, track, publication);
  }
  async connect(config) {
    this.config = config;
    await this.client.setClientRole(config.role === "host" ? "host" : "audience");
    if (this.closed) throw new Error("Connexion annulée.");
    await this.client.join(config.appId, config.channelName, config.token, config.uid);
    if (this.closed) { await this.client.leave(); throw new Error("Connexion annulée."); }
    this.state = "connected";
    this.localParticipant.identity = config.role === "host" ? `host-${config.uid}` : `spectateur-${config.uid}`;
    this.client.remoteUsers.forEach((user) => this.participant(user));
    // Un présentateur peut déjà publier avant l'entrée du spectateur.
    // Les événements et cette liste peuvent arriver ensemble : subscribe déduplique.
    await Promise.all(this.client.remoteUsers.flatMap((user) => [
      ...(user.hasVideo ? [this.subscribe(user, "video")] : []),
      ...(user.hasAudio ? [this.subscribe(user, "audio")] : []),
    ]));
    this.presenceTimer = setInterval(() => this.presence(), 20000);
    this.presence();
  }
  async publishTrack(track) {
    if (this.config.role !== "host") throw new Error("Diffusion non autorisée.");
    if (!track.sdk) {
      track.sdk = track.kind === "video"
        ? AgoraRTC.createCustomVideoTrack({ mediaStreamTrack: track.outputTrack, encoderConfig: { ...(track.outputTrack.getSettings?.().width ? { width: track.outputTrack.getSettings().width } : {}), ...(track.outputTrack.getSettings?.().height ? { height: track.outputTrack.getSettings().height } : {}), frameRate: 30, bitrateMax: 2500 }, optimizationMode: "detail" })
        : AgoraRTC.createCustomAudioTrack({ mediaStreamTrack: track.raw });
    }
    await this.client.publish(track.sdk);
    this.localParticipant.trackPublications.set(track.kind, { track });
  }
  async setEnabled(kind, enabled) {
    const track = this.localParticipant.trackPublications.get(kind)?.track;
    if (track?.sdk) {
      await track.sdk.setMuted(!enabled);
      track.raw.enabled = enabled;
      if (track.processedTrack) track.processedTrack.enabled = enabled;
    }
  }
  async renewToken() {
    if (this.closed) return;
    if (!this.renewing) this.renewing = (async () => {
      const config = this.config;
      const fresh = await requestAgoraToken(config.apiUrl, config.liveId, config.role, undefined, config.observer, config.sessionId);
      if (!this.closed) await this.client.renewToken(fresh.token);
    })().finally(() => { this.renewing = null; });
    return this.renewing;
  }
  async presence(leave = false) {
    if (!this.config || this.config.observer || (!leave && (this.closed || this.state !== "connected"))) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      await fetch(`${this.config.apiUrl}/agora-presence`, {
        method: "POST", keepalive: leave,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ liveId: this.config.liveId, role: this.config.role, sessionId: this.config.sessionId, leave }),
      });
    } catch (error) { console.info("Présence spectateur indisponible", error); }
  }
  async fail(error) { console.error("Connexion Agora :", error); await this.disconnect(); }
  async disconnect() {
    this.closed = true; clearInterval(this.presenceTimer);
    await this.presence(true);
    this.remoteParticipants.forEach((participant) => participant.trackPublications.forEach(({ track }) => track.detach()));
    this.remoteParticipants.clear();
    await this.client.leave(); this.state = "disconnected";
    this.client.removeAllListeners();
  }
}
