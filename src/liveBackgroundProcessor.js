const BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/";
let libraryPromise;

function loadSegmentation() {
  if (window.SelfieSegmentation) return Promise.resolve(window.SelfieSegmentation);
  if (!libraryPromise) libraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${BASE}selfie_segmentation.js`;
    script.crossOrigin = "anonymous";
    const timer = setTimeout(() => { script.remove(); reject(new Error("Le traitement du fond n’a pas pu être chargé. Vérifiez la connexion.")); }, 20000);
    script.onload = () => { clearTimeout(timer); window.SelfieSegmentation ? resolve(window.SelfieSegmentation) : reject(new Error("Traitement du fond indisponible.")); };
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error("Impossible de charger le traitement du fond.")); };
    document.head.appendChild(script);
  }).catch((error) => { libraryPromise = undefined; throw error; });
  return libraryPromise;
}

export function coverRect(sourceWidth, sourceHeight, width, height) {
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  return { x: (width - sourceWidth * scale) / 2, y: (height - sourceHeight * scale) / 2, width: sourceWidth * scale, height: sourceHeight * scale };
}

function ready(element, event, source) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => done(new Error("Le média du fond ne peut pas être chargé.")), 15000);
    const done = (error) => {
      clearTimeout(timer);
      element.removeEventListener(event, loaded);
      element.removeEventListener("error", failed);
      error ? reject(error) : resolve();
    };
    const loaded = () => done();
    const failed = () => done(new Error("Impossible de lire le média du fond."));
    element.addEventListener(event, loaded, { once: true });
    element.addEventListener("error", failed, { once: true });
    source();
  });
}

export class LiveBackgroundProcessor {
  name = "umi-background";
  constructor(media, onError) { this.media = media; this.onError = onError; }
  async init({ track }) {
    this.cancelled = false;
    const checkActive = () => {
      if (this.cancelled) throw new Error("Le traitement du fond a été arrêté.");
    };
    try {
      const SelfieSegmentation = await loadSegmentation();
      checkActive();
      this.background = document.createElement(this.media.type === "video" ? "video" : "img");
      this.background.crossOrigin = "anonymous";
      if (this.media.type === "video") {
        this.background.muted = true; this.background.loop = true; this.background.playsInline = true;
      }
      await ready(this.background, this.media.type === "video" ? "loadeddata" : "load", () => { this.background.src = this.media.url; });
      checkActive();
      if (this.media.type === "video") await this.background.play();
      checkActive();
      this.input = document.createElement("video");
      this.input.muted = true; this.input.playsInline = true;
      await ready(this.input, "loadeddata", () => {
        this.input.srcObject = new MediaStream([track]);
        this.input.play().catch(() => {});
      });
      await this.input.play();
      checkActive();
      const settings = track.getSettings();
      const width = this.input.videoWidth || settings.width || 720;
      const height = this.input.videoHeight || settings.height || 1280;
      const scale = Math.min(1, 1280 / Math.max(width, height));
      this.canvas = document.createElement("canvas");
      this.canvas.width = Math.max(2, Math.round(width * scale / 2) * 2);
      this.canvas.height = Math.max(2, Math.round(height * scale / 2) * 2);
      this.context = this.canvas.getContext("2d");
      if (!this.context || !this.canvas.captureStream) throw new Error("Ce navigateur ne permet pas le fond virtuel.");
      // Seul le masque utilise une petite image ; la vidéo reste en HD.
      this.maskInput = document.createElement("canvas");
      const maskScale = Math.min(1, 256 / Math.max(width, height));
      this.maskInput.width = Math.max(2, Math.round(width * maskScale));
      this.maskInput.height = Math.max(2, Math.round(height * maskScale));
      this.maskContext = this.maskInput.getContext("2d");
      if (!this.maskContext) throw new Error("Traitement du fond indisponible.");
      this.segmenter = new SelfieSegmentation({ locateFile: (file) => BASE + file });
      this.segmenter.setOptions({ modelSelection: 0, selfieMode: false });
      this.segmenter.onResults((results) => this.draw(results));
      this.active = true;
      this.pending = this.sendMask();
      await this.pending;
      checkActive();
      this.processedTrack = this.canvas.captureStream(20).getVideoTracks()[0];
      this.timer = setTimeout(() => this.tick(), 50);
    } catch (error) { await this.destroy(); throw error; }
  }
  sendMask() {
    this.maskContext.drawImage(this.input, 0, 0, this.maskInput.width, this.maskInput.height);
    return this.segmenter.send({ image: this.maskInput });
  }
  draw(results) {
    if (!this.active || !this.context) return;
    const ctx = this.context;
    const { width, height } = this.canvas;
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(results.segmentationMask, 0, 0, width, height);
    ctx.globalCompositeOperation = "source-in";
    ctx.drawImage(this.input, 0, 0, width, height);
    ctx.globalCompositeOperation = "destination-over";
    const bg = this.background;
    const rect = coverRect(bg.videoWidth || bg.naturalWidth, bg.videoHeight || bg.naturalHeight, width, height);
    ctx.drawImage(bg, rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
  }
  async tick() {
    if (!this.active) return;
    try {
      this.pending = this.sendMask();
      await this.pending;
    } catch (error) {
      if (this.cancelled) return;
      this.active = false;
      this.onError?.(error);
      return;
    }
    if (this.active) this.timer = setTimeout(() => this.tick(), 50);
  }
  async restart(options) { await this.destroy(); await this.init(options); }
  async destroy() {
    this.cancelled = true;
    this.active = false;
    clearTimeout(this.timer);
    try { await this.pending; } catch {}
    this.pending = null;
    this.processedTrack?.stop();
    this.processedTrack = undefined;
    if (this.input) { this.input.pause(); this.input.srcObject = null; }
    if (this.background?.tagName === "VIDEO") { this.background.pause(); this.background.removeAttribute("src"); this.background.load(); }
    const segmenter = this.segmenter;
    this.segmenter = null;
    if (segmenter) await segmenter.close();
  }
}
