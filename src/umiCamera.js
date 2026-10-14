export function cameraOptions(facingMode = "user") {
  return { facingMode };
}

export async function createCameraCapture(createTracks, facingMode) {
  try {
    return await createTracks({
      video: cameraOptions(facingMode),
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (error) {
    if (!["AbortError", "OverconstrainedError"].includes(error.name)) throw error;
    // Certains téléphones refusent les réglages HD : conserver leurs réglages natifs.
    return createTracks({ video: { facingMode }, audio: true });
  }
}

export async function improveCameraCapture(track) {
  const capabilities = track.getCapabilities?.() || {};
  const hints = {};
  // Utiliser le champ le plus large proposé par la caméra.
  if (Number.isFinite(capabilities.zoom?.min)) hints.zoom = capabilities.zoom.min;
  for (const key of ["focusMode", "exposureMode", "whiteBalanceMode"]) {
    if (capabilities[key]?.includes("continuous")) hints[key] = "continuous";
  }
  if (Object.keys(hints).length) {
    try { await track.applyConstraints({ advanced: [hints] }); }
    catch (error) { console.info("Réglages caméra facultatifs indisponibles", error); }
  }
}

export async function attachCamera(track, video, facingMode = "user") {
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  // Caméra avant : miroir. Caméra arrière : orientation naturelle.
  track.attach(video);
  const actualFacing = track.mediaStreamTrack?.getSettings?.().facingMode || facingMode;
  const cameraTransform = actualFacing === "environment" ? "none" : "scaleX(-1)";
  video.style.setProperty("--umi-camera-transform", cameraTransform);
  for (const [key, value] of Object.entries({
  "object-fit": "cover",
  "object-position": "center",
  transform: cameraTransform,
})) {
    video.style.setProperty(key, value, "important");
  }
  // attach() et autoplay peuvent déjà lancer play(). Firefox peut interrompre
  // une deuxième demande pendant que le nouveau srcObject se charge.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      if (video.paused !== false) await video.play();
      break;
    } catch (error) {
      if (error.name !== "AbortError" || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  if (!video.videoWidth) await track.waitForDimensions(10000);
  console.info("UMI cadrage caméra", {
    capture: track.mediaStreamTrack?.getSettings?.(),
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
    displayWidth: video.clientWidth,
    displayHeight: video.clientHeight,
  });
}
