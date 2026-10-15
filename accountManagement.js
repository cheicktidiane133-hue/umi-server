export function requireActiveAccount({ auth, db }) {
  return async (req, res, next) => {
    const header = req.headers.authorization || "";
    if (!/^Bearer\s+\S+$/i.test(header)) return res.status(401).json({ error: "Reconnectez-vous à votre compte." });
    try {
      const token = await auth.verifyIdToken(header.replace(/^Bearer\s+/i, ""), true);
      const [snapshot, account] = await Promise.all([
        db.collection("users").doc(token.uid).get(), auth.getUser(token.uid),
      ]);
      const profile = snapshot.data();
      if (!snapshot.exists || account.disabled || profile.blocked || profile.deleting) {
        return res.status(403).json({ error: "Ce compte ne peut pas effectuer cette action." });
      }
      req.umiAccount = { uid: token.uid, profile };
      return next();
    } catch {
      return res.status(401).json({ error: "Votre session a expiré. Reconnectez-vous." });
    }
  };
}

export function registerAccountManagement(app, { auth, db, FieldValue }) {
  const busy = new Set();
  app.post("/admin/accounts/manage", requireActiveAccount({ auth, db }), async (req, res) => {
    const caller = req.umiAccount;
    if (caller.profile.role !== "admin") return res.status(403).json({ error: "Accès administrateur requis." });
    const { uid, action } = req.body || {};
    if (typeof uid !== "string" || !uid || uid.length > 128 || /[\x00-\x1f\/]/.test(uid)
      || !["block", "unblock", "delete"].includes(action)) {
      return res.status(400).json({ error: "Compte ou action invalide." });
    }
    if (uid === caller.uid) return res.status(403).json({ error: "Vous ne pouvez pas modifier votre propre compte." });
    if (busy.has(uid)) return res.status(409).json({ error: "Une action est déjà en cours sur ce compte." });
    busy.add(uid);
    const reference = db.collection("users").doc(uid);
    try {
      const profile = await reference.get();
      if (!profile.exists) return res.status(404).json({ error: "Ce compte n’existe plus." });
      let account;
      try { account = await auth.getUser(uid); }
      catch (error) { if (error.code !== "auth/user-not-found" || action !== "delete") throw error; }
      if (profile.data().role === "admin" || account?.customClaims?.admin === true || account?.customClaims?.role === "admin") {
        return res.status(403).json({ error: "Les comptes administrateur sont protégés." });
      }
      if (action === "unblock" && profile.data().deleting) {
        return res.status(409).json({ error: "Une suppression est en cours. Réessayez la suppression de ce compte." });
      }
      if (action === "block") {
        await reference.set({ blocked: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        await auth.updateUser(uid, { disabled: true });
        await auth.revokeRefreshTokens(uid);
      } else if (action === "unblock") {
        await auth.updateUser(uid, { disabled: false });
        await reference.set({ blocked: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      } else {
        await reference.set({ blocked: true, deleting: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        if (account) {
          await auth.updateUser(uid, { disabled: true });
          await auth.revokeRefreshTokens(uid);
          try { await auth.deleteUser(uid); }
          catch (error) { if (error.code !== "auth/user-not-found") throw error; }
        }
        await reference.delete();
      }
      // Le résultat Auth/Firestore est déjà acquis : un échec du journal ne doit
      // pas provoquer un faux échec de l'action ni une deuxième suppression.
      try {
        await db.collection("adminAccountAudit").add({ adminId: caller.uid, targetUid: uid, action, createdAt: FieldValue.serverTimestamp() });
      } catch (error) { console.error("Journal gestion des comptes UMI :", error.code || "indisponible"); }
      return res.json({ success: true, action, uid });
    } catch (error) {
      console.error("Gestion des comptes UMI :", error.code || "erreur");
      return res.status(500).json({ error: action === "unblock"
        ? "Déblocage non confirmé. Réessayez."
        : "Action non terminée. Le profil reste protégé ; réessayez pour terminer." });
    } finally { busy.delete(uid); }
  });
}
