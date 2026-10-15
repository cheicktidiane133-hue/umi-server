import crypto from "node:crypto";
import agoraToken from "agora-token";
import { requireActiveAccount } from "./accountManagement.js";

const { RtcTokenBuilder, RtcRole } = agoraToken;
export const agoraUid = (value) => crypto.createHash("sha256").update(value).digest().readUInt32BE(0) || 1;
export const agoraChannel = (liveId) => "umi_" + crypto.createHash("sha256").update(liveId).digest("hex").slice(0, 32);
export function getAgoraStatus(live) {
  const lastSeen = live.presenterLastSeenAt?.toMillis?.() || 0;
  const broadcasting = live.isLive === true && Date.now() - lastSeen < 70000;
  return { broadcasting, viewers: broadcasting ? Number(live.agoraViewerCount) || 0 : 0 };
}

export function registerAgoraRoutes(app, { auth, db, FieldValue }) {
  const activeAccount = requireActiveAccount({ auth, db });
  const validate = (req, res) => {
    const body = req.body || {};
    if (!/^[A-Za-z0-9_-]{1,150}$/.test(body.liveId || "") ||
        !["host", "audience"].includes(body.role) ||
        !/^[A-Za-z0-9_-]{1,64}$/.test(body.sessionId || "")) {
      res.status(400).json({ error: "Paramètres du live invalides." }); return null;
    }
    return body;
  };
  app.post("/agora-token", activeAccount, async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const body = validate(req, res); if (!body) return;
    try {
      const reference = db.collection("live").doc(body.liveId);
      const snapshot = await reference.get();
      if (!snapshot.exists) return res.status(404).json({ error: "Live introuvable." });
      const live = snapshot.data();
      const caller = req.umiAccount;
      if (live.transport !== "agora" || !live.ownerId) return res.status(409).json({ error: "Relancez ce direct avec la version Agora de UMI." });
      if (live.stoppedAt || live.stoppedByAdmin) return res.status(409).json({ error: "Ce live est terminé." });
      if (body.role === "host" && (live.ownerId !== caller.uid ||
          (live.liveType !== "client" && caller.profile.role !== "admin"))) {
        return res.status(403).json({ error: "Vous ne pouvez pas diffuser ce live." });
      }
      if (body.role === "audience" && live.isLive !== true) return res.status(409).json({ error: "Ce live n’est pas en cours." });
      if (body.observer && caller.profile.role !== "admin") return res.status(403).json({ error: "Accès administrateur requis." });
      const appId = process.env.AGORA_APP_ID?.trim();
      const certificate = process.env.AGORA_APP_CERTIFICATE?.trim();
      if (!/^[a-f0-9]{32}$/i.test(appId || "") || !/^[a-f0-9]{32}$/i.test(certificate || "")) {
        return res.status(503).json({ error: "Vérifiez les deux paramètres Agora du serveur." });
      }
      const channelName = agoraChannel(body.liveId);
      const hostUid = agoraUid(`host:${body.liveId}:${live.ownerId}`);
      const uid = body.role === "host" ? hostUid : agoraUid(`audience:${body.liveId}:${caller.uid}:${body.sessionId}`);
      const ttl = 3600;
      // AccessToken2 attend des DURÉES en secondes, pas une date Unix.
      const token = RtcTokenBuilder.buildTokenWithUid(appId, certificate, channelName, uid,
        body.role === "host" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER, ttl, ttl);
      res.json({ appId, channelName, uid, hostUid, token, expiresAt: Math.floor(Date.now() / 1000) + ttl });
    } catch (error) {
      console.error("Jeton Agora :", error);
      res.status(500).json({ error: "Impossible de préparer le direct Agora." });
    }
  });

  app.post("/agora-presence", activeAccount, async (req, res) => {
    const body = validate(req, res); if (!body) return;
    try {
      const reference = db.collection("live").doc(body.liveId);
      const snapshot = await reference.get();
      if (!snapshot.exists) return res.status(404).json({ error: "Live introuvable." });
      const live = snapshot.data();
      const caller = req.umiAccount;
      if (live.transport !== "agora") return res.status(409).json({ error: "Transport invalide." });
      if (body.role === "host" && live.ownerId !== caller.uid) return res.status(403).json({ error: "Accès refusé." });
      const leases = reference.collection("agoraAudience");
      const sessionKey = crypto.createHash("sha256").update(`${caller.uid}:${body.sessionId}`).digest("hex");
      if (body.role === "audience") {
        if (body.leave || live.isLive !== true) await leases.doc(sessionKey).delete();
        else await leases.doc(sessionKey).set({ uid: caller.uid, lastSeen: Date.now() });
      }
      const cutoff = Date.now() - 70000;
      const viewers = await leases.where("lastSeen", ">", cutoff).get();
      await reference.set({
        agoraViewerCount: live.isLive ? viewers.size : 0,
        ...(body.role === "host" && !body.leave ? { presenterLastSeenAt: FieldValue.serverTimestamp() } : {}),
      }, { merge: true });
      res.json({ success: true });
    } catch (error) {
      console.error("Présence Agora :", error);
      res.status(500).json({ error: "Compteur indisponible." });
    }
  });
}
