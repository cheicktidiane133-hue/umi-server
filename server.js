import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";

import {
  initializeApp,
  cert,
  getApps,
} from "firebase-admin/app";

import {
  getFirestore,
  FieldValue,
} from "firebase-admin/firestore";

import { execFile } from "child_process";
import { promisify } from "util";
import OpenAI from "openai";

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getAuth } from "firebase-admin/auth";
import {
  AccessToken,
  RoomServiceClient,
  EgressClient,
  EncodedFileOutput,
  S3Upload,
} from "livekit-server-sdk";
console.log("🧪 TEST SERVER FRESHPAY 2026");

dotenv.config();

console.log("=== TEST PAYDUNYA ENV ===");

console.log(
  "MASTER:",
  process.env.PAYDUNYA_MASTER_KEY
    ? `chargée (${process.env.PAYDUNYA_MASTER_KEY.length} caractères)`
    : "ABSENTE"
);

console.log(
  "PRIVATE:",
  process.env.PAYDUNYA_PRIVATE_KEY
    ? `chargée (${process.env.PAYDUNYA_PRIVATE_KEY.length} caractères)`
    : "ABSENTE"
);

console.log(
  "TOKEN:",
  process.env.PAYDUNYA_TOKEN
    ? `chargé (${process.env.PAYDUNYA_TOKEN.length} caractères)`
    : "ABSENT"
);

console.log("========================");

console.log("🚨 SERVER.JS MODIFIÉ CHARGÉ");

console.log(
  "FICHIER EXÉCUTÉ :",
  import.meta.url
);


// ==========================================
// ORABANK / N-GENIUS
// ==========================================

const NGENIUS_REALM =
  process.env.NGENIUS_REALM;

const NGENIUS_API_KEY =
  process.env.NGENIUS_API_KEY;

const NGENIUS_OUTLET_REF =
  process.env.NGENIUS_OUTLET_REF;

const NGENIUS_IDENTITY_URL =
  process.env.NGENIUS_IDENTITY_URL;

const NGENIUS_GATEWAY_URL =
  process.env.NGENIUS_GATEWAY_URL;

const NGENIUS_PAYPAGE_URL =
  process.env.NGENIUS_PAYPAGE_URL;

console.log(
  NGENIUS_REALM &&
  NGENIUS_API_KEY &&
  NGENIUS_OUTLET_REF &&
  NGENIUS_IDENTITY_URL &&
  NGENIUS_GATEWAY_URL
    ? "🏦 Orabank N-Genius configuration prête"
    : "❌ Orabank N-Genius configuration incomplète"
);


// =========================================================
// FIREBASE ADMIN
// =========================================================

const serviceAccountPath =
  fs.existsSync("/etc/secrets/firebase-service-account.json")
    ? "/etc/secrets/firebase-service-account.json"
    : path.join(
        process.cwd(),
        "secrets",
        "firebase-service-account.json"
      );

const serviceAccount =
  JSON.parse(
    fs.readFileSync(
      serviceAccountPath,
      "utf8"
    )
  );

if (getApps().length === 0) {
  initializeApp({
    credential:
      cert(serviceAccount),
  });
}

const firestoreAdmin =
  getFirestore();

console.log(
  "🔥 Firebase Admin connecté"
);


// =========================================================
// OPENAI
// =========================================================

const openai =
  new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY,
  });


// =========================================================
// EXPRESS
// =========================================================

const app =
  express();

const PORT =
  process.env.PORT || 3001;

app.use(
  cors()
);
const localHighlightJobs = new Set();

app.post(
  "/upload-local-highlight/:liveId",

  async (req, res, next) => {
    try {
      const token = (
        req.headers.authorization || ""
      ).replace(/^Bearer /, "");

      if (!token) {
        return res.status(401).json({
          error: "Connexion requise.",
        });
      }

      const user =
        await getAuth().verifyIdToken(token);

      const profile = await firestoreAdmin
        .collection("users")
        .doc(user.uid)
        .get();

      const isAdmin =
        user.admin === true ||
        user.role === "admin" ||
        profile.data()?.role === "admin";

      if (!isAdmin) {
        return res.status(403).json({
          error: "Accès administrateur requis.",
        });
      }

      const { liveId } = req.params;

      if (!/^[A-Za-z0-9_-]{1,150}$/.test(liveId)) {
        return res.status(400).json({
          error: "Identifiant invalide.",
        });
      }

      const live = await firestoreAdmin
        .collection("live")
        .doc(liveId)
        .get();

      if (!live.exists) {
        return res.status(404).json({
          error: "LIVE introuvable.",
        });
      }

      next();
    } catch {
      return res.status(401).json({
        error: "Reconnectez-vous au compte administrateur.",
      });
    }
  },

  express.raw({
    type: ["video/webm", "video/mp4"],
    limit: "32mb",
  }),

  async (req, res) => {
    const { liveId } = req.params;

    const liveRef = firestoreAdmin
      .collection("live")
      .doc(liveId);

    try {
      if (
        !Buffer.isBuffer(req.body) ||
        !req.body.length
      ) {
        return res.status(400).json({
          error: "Vidéo vide ou format non accepté.",
        });
      }

      const publicUrl = (
        process.env.R2_PUBLIC_URL || ""
      ).replace(/\/+$/, "");

      if (!publicUrl.startsWith("https://")) {
        return res.status(500).json({
          error:
            "Configurez R2_PUBLIC_URL sur le serveur.",
        });
      }

      const latest = await liveRef.get();

      if (
        latest.data()?.highlightPublished &&
        latest.data()?.highlightUrl
      ) {
        return res.json({
          success: true,
          highlightUrl:
            latest.data().highlightUrl,
        });
      }

      if (localHighlightJobs.has(liveId)) {
        return res.status(409).json({
          error:
            "Publication déjà en cours. Patientez puis réessayez.",
        });
      }

      localHighlightJobs.add(liveId);

      try {
        const extension =
          req.is("video/mp4") ? "mp4" : "webm";

        const sourceKey =
          `recordings/local/${liveId}-` +
          `${crypto.randomUUID()}.${extension}`;

        await liveRef.set(
          {
            highlightStatus: "processing",
            highlightPublished: false,
            hasReplay: false,
            replayPublished: false,
          },
          { merge: true }
        );

        await r2Client.send(
          new PutObjectCommand({
            Bucket: r2Bucket,
            Key: sourceKey,
            Body: req.body,
            ContentType: `video/${extension}`,
          })
        );

        const result = await createHighlight(
          sourceKey,
          liveId,
          "umi"
        );

        const highlightUrl =
          `${publicUrl}/${result.highlightFilePath}`;

        await liveRef.set(
          {
            isLive: false,
            highlightStatus: "ready",
            highlightPublished: true,
            highlightUrl,
            highlightFilePath:
              result.highlightFilePath,
            recordingFilePath: null,
            recordingUrl: null,
            recordingStatus: "stopped",
            hasReplay: false,
            replayPublished: false,
          },
          { merge: true }
        );

        await firestoreAdmin
          .collection("liveHighlights")
          .doc(liveId)
          .set(
            {
              highlightUrl,
              recordingFilePath: null,
            },
            { merge: true }
          );

        try {
          await r2Client.send(
            new DeleteObjectCommand({
              Bucket: r2Bucket,
              Key: sourceKey,
            })
          );
        } catch (error) {
          console.error(
            "Nettoyage vidéo temporaire :",
            error.message
          );
        }

        return res.json({
          success: true,
          highlightUrl,
        });
      } finally {
        localHighlightJobs.delete(liveId);
      }
    } catch (error) {
      console.error(
        "Erreur temps fort local :",
        error
      );

      await liveRef
        .set(
          {
            highlightStatus: "error",
            highlightError: error.message,
          },
          { merge: true }
        )
        .catch(() => {});

      return res.status(500).json({
        error:
          error.message ||
          "Création du temps fort impossible.",
      });
    }
  }
);
app.use(
  express.json({
    limit: "15mb",
  })
);


// ==========================================
// ORABANK / N-GENIUS - TEST AUTHENTIFICATION
// ==========================================

app.get(
  "/api/ngenius/test-auth",
  async (req, res) => {
    try {
console.log(
  "🔑 API Key chargée :",
  NGENIUS_API_KEY ? "OUI" : "NON",
  "| longueur :",
  NGENIUS_API_KEY?.length
);
console.log(
  "🏦 Realm chargé :",
  NGENIUS_REALM
);
console.log(
  "🔐 Contrôle API Key :",
  {
    longueur: NGENIUS_API_KEY?.length,
    longueurTrim: NGENIUS_API_KEY?.trim().length,
    contientEspace: /\s/.test(NGENIUS_API_KEY || ""),
    finitParDoubleEgal:
      NGENIUS_API_KEY?.endsWith("=="),
  }
);
console.log("=== TEST CONFIG ORABANK ===");
console.log("Realm :", JSON.stringify(NGENIUS_REALM));
console.log("API Key présente :", Boolean(NGENIUS_API_KEY));
console.log("Longueur API Key :", NGENIUS_API_KEY?.length);
console.log("Gateway :", NGENIUS_GATEWAY_URL);
console.log("===========================");
      const response = await fetch(
  `${NGENIUS_GATEWAY_URL}/identity/auth/access-token`,
  {
    method: "POST",

    headers: {
      "Content-Type":
        "application/vnd.ni-identity.v1+json",

      "Accept":
        "application/vnd.ni-identity.v1+json",

      "Authorization":
        `Basic ${NGENIUS_API_KEY}`,
    },

    body: JSON.stringify({
      realmName: NGENIUS_REALM,
    }),
  }
);

      const rawData =
  await response.text();

console.log(
  "🏦 Réponse brute N-Genius :",
  response.status,
  rawData
);

      if (!response.ok) {

        console.error(
          "❌ N-Genius authentification refusée :",
          response.status
        );

        return res.status(response.status).json({
          success: false,
          message:
            "Authentification N-Genius refusée.",
          status:
            response.status,
        });
      }

      console.log(
        "✅ N-Genius authentification réussie"
      );

      return res.status(200).json({
        success: true,
        message:
          "Connexion Orabank N-Genius réussie.",
        tokenReceived:
          Boolean(data.access_token),
      });

    } catch (error) {

      console.error(
        "❌ Erreur connexion N-Genius :",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Erreur de connexion N-Genius.",
      });
    }
  }
);


app.use(
  express.urlencoded({
    extended: true,
    limit: "15mb",
  })
);


// =========================================================
// PAYTECH - CRÉER UN PAIEMENT
// =========================================================

app.post(
  "/api/payments/paytech/create",
  async (req, res) => {

    try {

      const {
        amount,
        paymentMethod,
        userId,
        buyerInfo,
        cart,
      } = req.body;

      const numericAmount =
        Number(amount);


      if (
        paymentMethod === "orange" ||
        paymentMethod === "moov"
      ) {

        return res
          .status(400)
          .json({
            success: false,

            message:
              paymentMethod === "orange"
                ? "Orange Money Mali sera disponible prochainement."
                : "Moov Money Mali sera disponible prochainement.",
          });
      }


      if (
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {

        return res
          .status(400)
          .json({
            success: false,
            message:
              "Montant de paiement invalide.",
          });
      }


      if (
        !process.env.PAYTECH_API_KEY ||
        !process.env.PAYTECH_API_SECRET
      ) {

        return res
          .status(500)
          .json({
            success: false,
            message:
              "Configuration PayTech manquante sur le serveur.",
          });
      }


      // =========================
      // MOYEN DE PAIEMENT
      // =========================

      let targetPayment = "";

      if (
        paymentMethod === "orange"
      ) {
        targetPayment =
          "Orange Money ML";
      }

      if (
        paymentMethod === "moov"
      ) {
        targetPayment =
          "Moov Money ML";
      }

      if (
        paymentMethod === "card"
      ) {
        targetPayment =
          "Carte Bancaire";
      }


      // =========================
      // RÉFÉRENCE UNIQUE UMI
      // =========================

      const refCommand =
        `UMI-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)
          .toUpperCase()}`;


      // =========================
      // DONNÉES PAYTECH
      // =========================

      const paymentData = {

        item_name:
          "Commande UMI",

        item_price:
          Math.round(
            numericAmount
          ),

        currency:
          "XOF",

        ref_command:
          refCommand,

        command_name:
          `Paiement commande UMI ${refCommand}`,

        env:
          "test",

        ipn_url:
          "https://kruger-ranger-position-restoration.trycloudflare.com/api/payments/paytech/ipn",

        success_url:
          "https://kruger-ranger-position-restoration.trycloudflare.com/api/payments/paytech/success",

        cancel_url:
          "https://kruger-ranger-position-restoration.trycloudflare.com/api/payments/paytech/cancel",

        target_payment:
          targetPayment,

        custom_field:
          JSON.stringify({

            userId:
              userId || "",

            buyerInfo:
              buyerInfo || null,

            cart:
              Array.isArray(cart)
                ? cart
                : [],

            refCommand,
          }),
      };


      console.log(
        "===== TEST MALI ====="
      );

      console.log(
        "paymentMethod reçu :",
        paymentMethod
      );

      console.log(
        "targetPayment envoyé :",
        targetPayment
      );

      console.log(
        "====================="
      );


      console.log(
        "===== DONNEES ENVOYEES A PAYTECH ====="
      );

      console.log(
        JSON.stringify(
          paymentData,
          null,
          2
        )
      );

      console.log(
        "======================================"
      );


      const paytechResponse =
        await fetch(
          "https://paytech.sn/api/payment/request-payment",
          {
            method:
              "POST",

            headers: {
              Accept:
                "application/json",

              "Content-Type":
                "application/json",

              API_KEY:
                process.env
                  .PAYTECH_API_KEY,

              API_SECRET:
                process.env
                  .PAYTECH_API_SECRET,
            },

            body:
              JSON.stringify(
                paymentData
              ),
          }
        );


      const paytechData =
        await paytechResponse
          .json();


      console.log(
        "Réponse PayTech :",
        paytechData
      );


      if (
        !paytechResponse.ok ||
        Number(
          paytechData?.success
        ) !== 1
      ) {

        return res
          .status(400)
          .json({
            success: false,

            message:
              paytechData?.message ||
              "PayTech a refusé la demande de paiement.",

            paytech:
              paytechData,
          });
      }


      const paytechToken =
        paytechData.token || "";

      const redirectUrl =
        paytechData.redirect_url ||
        paytechData.redirectUrl ||
        "";

      let finalRedirectUrl =
        redirectUrl;


      if (
        paymentMethod === "card" &&
        redirectUrl
      ) {

        finalRedirectUrl =
          `${redirectUrl}${
            redirectUrl.includes("?")
              ? "&"
              : "?"
          }tp=${encodeURIComponent(
            "Carte Bancaire"
          )}&nac=1`;
      }


      console.log(
        "URL PayTech finale :",
        finalRedirectUrl
      );


      // =====================================================
      // ENREGISTRER LE PAIEMENT EN ATTENTE DANS FIRESTORE
      // =====================================================

      await firestoreAdmin
        .collection(
          "paytechPayments"
        )
        .doc(
          refCommand
        )
        .set({

          refCommand:
            refCommand,

          amount:
            numericAmount,

          currency:
            "XOF",

          paymentMethod:
            paymentMethod || "",

          userId:
            userId || "",

          buyerInfo:
            buyerInfo || null,

          status:
            "pending",

          paid:
            false,

          paytechToken:
            paytechToken,

          redirectUrl:
            redirectUrl,

          createdAt:
            new Date(),

          updatedAt:
            new Date(),
        });


      console.log(
        "📝 Paiement PayTech enregistré dans Firestore :",
        refCommand
      );


      return res.json({
        success:
          true,

        refCommand,

        token:
          paytechToken,

        redirectUrl:
          finalRedirectUrl,
      });


    } catch (error) {

      console.error(
        "Erreur création paiement PayTech :",
        error
      );


      return res
        .status(500)
        .json({
          success:
            false,

          message:
            error?.message ||
            "Impossible de créer le paiement PayTech.",
        });
    }
  }
);
// =========================================================
// PARTIE 2/4
// LIVEKIT + CLOUDFLARE R2 + ENREGISTREMENT + TEMPS FORT
// =========================================================


// =========================
// VARIABLES LIVEKIT
// =========================

const livekitUrl =
  process.env.LIVEKIT_URL;

const apiKey =
  process.env.LIVEKIT_API_KEY;

const apiSecret =
  process.env.LIVEKIT_API_SECRET;


// =========================
// VARIABLES CLOUDFLARE R2
// =========================

const r2AccessKey =
  process.env.R2_ACCESS_KEY_ID;

const r2SecretKey =
  process.env.R2_SECRET_ACCESS_KEY;

const r2Endpoint =
  process.env.R2_ENDPOINT;

const r2Bucket =
  process.env.R2_BUCKET;


// =========================
// VÉRIFICATIONS
// =========================

if (
  !livekitUrl ||
  !apiKey ||
  !apiSecret
) {

  console.error(
    "❌ Informations LiveKit manquantes dans .env"
  );
}


if (
  !r2AccessKey ||
  !r2SecretKey ||
  !r2Endpoint ||
  !r2Bucket
) {

  console.error(
    "❌ Informations Cloudflare R2 manquantes dans .env"
  );
}


// =========================
// CLIENT CLOUDFLARE R2
// =========================

const r2Client =
  new S3Client({

    region:
      "auto",

    endpoint:
      r2Endpoint,

    credentials: {

      accessKeyId:
        r2AccessKey,

      secretAccessKey:
        r2SecretKey,
    },
  });


// =========================
// FFMPEG
// =========================

const execFileAsync =
  promisify(execFile);


// =========================
// TEMPS FORTS TERMINÉS
// =========================

const highlightResults =
  new Map();


// =========================
// URL HTTP LIVEKIT
// =========================

const livekitHttpUrl =
  livekitUrl
    ?.replace(
      "wss://",
      "https://"
    )
    .replace(
      "ws://",
      "http://"
    );


// =========================
// CLIENTS LIVEKIT
// =========================

const roomService =
  new RoomServiceClient(
    livekitHttpUrl,
    apiKey,
    apiSecret
  );


const egressClient =
  new EgressClient(
    livekitHttpUrl,
    apiKey,
    apiSecret
  );


// =========================
// TEST SERVEUR
// =========================

app.get(
  "/",
  (req, res) => {

    res.send(
      "UMI LIVE SERVER OK"
    );
  }
);


// =========================
// CRÉATION TOKEN LIVEKIT
// =========================

app.post(
  "/token",
  async (req, res) => {

    try {

      const {
        identity,
        role,
        roomName,
      } = req.body;


      if (!identity) {

        return res
          .status(400)
          .json({

            error:
              "Identité manquante",
          });
      }


      const selectedRoom =
        roomName ||
        "umi-live";


      console.log(
        "🎫 Token demandé :",
        identity,
        "| Rôle :",
        role,
        "| Salle :",
        selectedRoom
      );


      const token =
        new AccessToken(
          apiKey,
          apiSecret,
          {
            identity,
          }
        );


      const canPublish =
        role === "admin" ||
        role ===
          "client-broadcaster";


      token.addGrant({

        roomJoin:
          true,

        room:
          selectedRoom,

        canPublish:
          canPublish,

        canSubscribe:
          true,
      });


      const jwt =
        await token.toJwt();


      res.json({

        token:
          jwt,

        url:
          livekitUrl,

        roomName:
          selectedRoom,
      });


    } catch (error) {

      console.error(
        "❌ Erreur création token :",
        error
      );


      res
        .status(500)
        .json({

          error:
            "Impossible de créer le token LiveKit",
        });
    }
  }
);


// =========================
// DÉMARRER ENREGISTREMENT
// =========================

app.post(
  "/start-recording",
  async (req, res) => {

    try {

      const {
        roomName,
        identity,
        liveId,
        liveType,
      } = req.body;


      if (
        !roomName ||
        !identity
      ) {

        return res
          .status(400)
          .json({

            error:
              "roomName et identity sont obligatoires",
          });
      }


      const type =
        liveType === "client"
          ? "client"
          : "umi";


      const safeLiveId =
        liveId ||
        Date.now().toString();


      const filePath =
        `recordings/${type}/${safeLiveId}-${Date.now()}.mp4`;


      console.log("");

      console.log(
        "=============================="
      );

      console.log(
        "🎥 DÉMARRAGE ENREGISTREMENT"
      );

      console.log(
        "Salle :",
        roomName
      );

      console.log(
        "Diffuseur :",
        identity
      );

      console.log(
        "Fichier :",
        filePath
      );


      const fileOutput =
        new EncodedFileOutput({

          filepath:
            filePath,

          output: {

            case:
              "s3",

            value:
              new S3Upload({

                accessKey:
                  r2AccessKey,

                secret:
                  r2SecretKey,

                bucket:
                  r2Bucket,

                endpoint:
                  r2Endpoint,

                forcePathStyle:
                  true,
              }),
          },
        });


      const info =
        await egressClient
          .startParticipantEgress(
            roomName,
            identity,
            {
              file:
                fileOutput,
            },
            {
              screenShare:
                false,
            }
          );


      console.log(
        "✅ Enregistrement démarré"
      );

      console.log(
        "Egress ID :",
        info.egressId
      );

      console.log(
        "=============================="
      );


      res.json({

        success:
          true,

        egressId:
          info.egressId,

        filePath,
      });


    } catch (error) {

      console.error(
        "❌ ERREUR DÉMARRAGE ENREGISTREMENT :",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

          error:
            error?.message ||
            "Impossible de démarrer l'enregistrement",
        });
    }
  }
);


// =========================
// CRÉER LE TEMPS FORT
// =========================

async function createHighlight(
  recordingFilePath,
  liveId,
  liveType = "umi"
) {

  const type =
    liveType === "client"
      ? "client"
      : "umi";


  const safeLiveId =
    liveId ||
    Date.now().toString();


  const tempFolder =
    path.join(
      process.cwd(),
      "temp"
    );


  if (
    !fs.existsSync(
      tempFolder
    )
  ) {

    fs.mkdirSync(
      tempFolder,
      {
        recursive:
          true,
      }
    );
  }


  const inputPath =
    path.join(
      tempFolder,
      `${safeLiveId}-replay.mp4`
    );


  const outputPath =
    path.join(
      tempFolder,
      `${safeLiveId}-highlight.mp4`
    );


  const highlightFilePath =
    `highlights/${type}/${safeLiveId}-${Date.now()}.mp4`;


  try {

    console.log("");

    console.log(
      "=============================="
    );

    console.log(
      "✂️ CRÉATION TEMPS FORT"
    );

    console.log(
      "Replay :",
      recordingFilePath
    );


    // =========================
    // 1. TÉLÉCHARGER LE REPLAY
    // =========================

    const object =
      await r2Client.send(
        new GetObjectCommand({

          Bucket:
            r2Bucket,

          Key:
            recordingFilePath,
        })
      );


    const arrayBuffer =
      await object.Body
        .transformToByteArray();


    fs.writeFileSync(
      inputPath,
      Buffer.from(
        arrayBuffer
      )
    );


    console.log(
      "✅ Replay téléchargé"
    );


    // =========================
    // 2. CRÉER LE TEMPS FORT
    // =========================

    await execFileAsync(
  "ffmpeg",
  [
    "-nostdin",
    "-y",
    "-i", inputPath,
    "-t", "60",
    "-vf", "scale=480:-2",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "28",
    "-threads", "1",
    "-c:a", "aac",
    "-b:a", "96k",
    "-movflags", "+faststart",
    outputPath,
  ],
  {
    timeout: 120000,
    maxBuffer: 10 * 1024 * 1024,
  }
);

    console.log(
      "✅ Temps fort créé"
    );


    // =========================
    // 3. ENVOYER SUR R2
    // =========================

    const highlightBuffer =
      fs.readFileSync(
        outputPath
      );


    await r2Client.send(
      new PutObjectCommand({

        Bucket:
          r2Bucket,

        Key:
          highlightFilePath,

        Body:
          highlightBuffer,

        ContentType:
          "video/mp4",
      })
    );


    console.log(
      "☁️ Temps fort envoyé sur R2 :",
      highlightFilePath
    );


    // =========================
    // 4. ENREGISTRER FIRESTORE
    // =========================

    const highlightData = {

      liveId:
        safeLiveId,

      liveType:
        type,

      recordingFilePath,

      highlightFilePath,

      createdAt:
        new Date(),

      status:
        "ready",
    };


    await firestoreAdmin
      .collection(
        "liveHighlights"
      )
      .doc(
        safeLiveId
      )
      .set(
        highlightData,
        {
          merge:
            true,
        }
      );


    highlightResults.set(
      safeLiveId,
      highlightData
    );


    console.log(
      "🔥 Temps fort enregistré dans Firestore"
    );


    // =========================
    // 5. NETTOYAGE
    // =========================

    try {

      if (
        fs.existsSync(
          inputPath
        )
      ) {

        fs.unlinkSync(
          inputPath
        );
      }


      if (
        fs.existsSync(
          outputPath
        )
      ) {

        fs.unlinkSync(
          outputPath
        );
      }

    } catch (
      cleanupError
    ) {

      console.error(
        "⚠️ Erreur nettoyage fichiers temporaires :",
        cleanupError
      );
    }


    console.log(
      "=============================="
    );


    return highlightData;


  } catch (error) {

    console.error(
      "❌ ERREUR CRÉATION TEMPS FORT :",
      error
    );


    const errorData = {

      liveId:
        safeLiveId,

      liveType:
        type,

      recordingFilePath,

      status:
        "error",

      error:
        error?.message ||
        "Erreur inconnue",

      updatedAt:
        new Date(),
    };


    highlightResults.set(
      safeLiveId,
      errorData
    );


    try {

      await firestoreAdmin
        .collection(
          "liveHighlights"
        )
        .doc(
          safeLiveId
        )
        .set(
          errorData,
          {
            merge:
              true,
          }
        );

    } catch (
      firestoreError
    ) {

      console.error(
        "❌ Erreur Firestore temps fort :",
        firestoreError
      );
    }


    throw error;
  }
}
// =========================================================
// PARTIE 3/4
// ARRÊT ENREGISTREMENT + STATUT HIGHLIGHT + ADMIN LIVE
// + PAYDUNYA
// =========================================================


// =========================
// ARRÊTER ENREGISTREMENT
// =========================

app.post(
  "/stop-recording",
  async (req, res) => {

    try {

      const {
        egressId,
        liveId,
        liveType,
        filePath,
      } = req.body;


      if (!egressId) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "egressId manquant",
          });
      }


      console.log("");

      console.log(
        "=============================="
      );

      console.log(
        "🛑 ARRÊT ENREGISTREMENT"
      );

      console.log(
        "Egress ID :",
        egressId
      );


      const result =
        await egressClient
          .stopEgress(
            egressId
          );


      console.log(
        "✅ Enregistrement arrêté"
      );


      const recordingFilePath =
        filePath ||
        result?.fileResults?.[0]
          ?.filename ||
        "";


      console.log(
        "Fichier replay :",
        recordingFilePath
      );


      res.json({

        success:
          true,

        result,

        recordingFilePath,
      });


      // =========================
      // TEMPS FORT EN ARRIÈRE-PLAN
      // =========================

      if (
        recordingFilePath &&
        liveId
      ) {

        setTimeout(
          async () => {

            try {

              await createHighlight(
                recordingFilePath,
                liveId,
                liveType
              );

            } catch (
              highlightError
            ) {

              console.error(
                "❌ Temps fort non créé :",
                highlightError
              );
            }
          },
          3000
        );
      }


      console.log(
        "=============================="
      );


    } catch (error) {

      console.error(
        "❌ ERREUR ARRÊT ENREGISTREMENT :",
        error
      );


      return res
        .status(500)
        .json({

          success:
            false,

          error:
            error?.message ||
            "Impossible d'arrêter l'enregistrement",
        });
    }
  }
);


// =========================
// STATUT TEMPS FORT
// =========================

app.get(
  "/highlight-status/:liveId",
  async (req, res) => {

    try {

      const {
        liveId,
      } = req.params;


      if (
        highlightResults.has(
          liveId
        )
      ) {

        return res.json(
          highlightResults.get(
            liveId
          )
        );
      }


      const snapshot =
        await firestoreAdmin
          .collection(
            "liveHighlights"
          )
          .doc(
            liveId
          )
          .get();


      if (
        !snapshot.exists
      ) {

        return res
          .status(404)
          .json({

            success:
              false,

            status:
              "not_found",
          });
      }


      return res.json({

        success:
          true,

        ...snapshot.data(),
      });


    } catch (error) {

      console.error(
        "❌ Erreur statut temps fort :",
        error
      );


      return res
        .status(500)
        .json({

          success:
            false,

          error:
            error?.message ||
            "Impossible de récupérer le statut",
        });
    }
  }
);


// =========================
// ARRÊT ADMINISTRATIF LIVE
// =========================

app.post(
  "/admin/stop-live",
  async (req, res) => {

    try {

      const {
        roomName,
      } = req.body;


      if (!roomName) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "roomName manquant",
          });
      }


      console.log(
        "🛑 Arrêt administratif LIVE :",
        roomName
      );


      await roomService
        .deleteRoom(
          roomName
        );


      console.log(
        "✅ Salle LiveKit fermée :",
        roomName
      );


      return res.json({

        success:
          true,

        roomName,
      });


    } catch (error) {

      console.error(
        "❌ Erreur arrêt administratif LIVE :",
        error
      );


      return res
        .status(500)
        .json({

          success:
            false,

          error:
            error?.message ||
            "Impossible d'arrêter le live",
        });
    }
  }
);


// =========================================================
// PAYDUNYA - PAIEMENT CARTE BANCAIRE UMI
// =========================================================

app.post(
  "/api/payments/paydunya/create",
  async (req, res) => {

    try {

      const {
        amount,
        paymentMethod,
        userId,
        buyerInfo,
        cart,
      } = req.body;


      const numericAmount =
        Number(amount);


      if (
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            message:
              "Montant invalide.",
          });
      }


      if (
        !process.env.PAYDUNYA_MASTER_KEY ||
        !process.env.PAYDUNYA_PRIVATE_KEY ||
        !process.env.PAYDUNYA_TOKEN
      ) {

        console.error(
          "❌ Clés PayDunya manquantes dans .env"
        );


        return res
          .status(500)
          .json({

            success:
              false,

            message:
              "Configuration PayDunya manquante sur le serveur.",
          });
      }


      // =========================
      // RÉFÉRENCE UNIQUE
      // =========================

      const refCommand =
        `UMI-PD-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase()}`;


      // =========================
      // DONNÉES PAYDUNYA
      // =========================

      const paydunyaData = {

        invoice: {

          total_amount:
            Math.round(
              numericAmount
            ),

          description:
            `Paiement commande UMI ${refCommand}`,
        },


        store: {

          name:
            "UMI",
        },


        custom_data: {

          refCommand,

          userId:
            userId || "",
        },


        actions: {

          callback_url:
            "https://kruger-ranger-position-restoration.trycloudflare.com/api/payments/paydunya/ipn",

          return_url:
            `https://kruger-ranger-position-restoration.trycloudflare.com/api/payments/paydunya/success?refCommand=${encodeURIComponent(
              refCommand
            )}`,

          cancel_url:
            "https://kruger-ranger-position-restoration.trycloudflare.com/api/payments/paydunya/cancel",
        },
      };


      console.log("");

      console.log(
        "=============================="
      );

      console.log(
        "💳 CRÉATION PAIEMENT PAYDUNYA"
      );

      console.log(
        "Référence :",
        refCommand
      );

      console.log(
        "Montant :",
        numericAmount
      );


      // =========================
      // APPEL PAYDUNYA
      // =========================
console.log("=== CONTROLE PAYDUNYA PRODUCTION ===");

console.log(
  "URL :",
  "https://app.paydunya.com/api/v1/checkout-invoice/create"
);

console.log(
  "MASTER longueur :",
  process.env.PAYDUNYA_MASTER_KEY?.length
);

console.log(
  "PRIVATE longueur :",
  process.env.PAYDUNYA_PRIVATE_KEY?.length,
  "| commence par test_private :",
  process.env.PAYDUNYA_PRIVATE_KEY?.startsWith("test_private"),
  "| commence par live_private :",
  process.env.PAYDUNYA_PRIVATE_KEY?.startsWith("live_private")
);

console.log(
  "TOKEN longueur :",
  process.env.PAYDUNYA_TOKEN?.length
);

console.log("===============================");
      const paydunyaResponse =
        await fetch(

          "https://app.paydunya.com/api/v1/checkout-invoice/create",

          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json",

              "PAYDUNYA-MASTER-KEY":
                process.env
                  .PAYDUNYA_MASTER_KEY,

              "PAYDUNYA-PRIVATE-KEY":
                process.env
                  .PAYDUNYA_PRIVATE_KEY,

              "PAYDUNYA-TOKEN":
                process.env
                  .PAYDUNYA_TOKEN,
            },

            body:
              JSON.stringify(
                paydunyaData
              ),
          }
        );


      const paydunyaRaw =
        await paydunyaResponse
          .text();


      console.log(
        "Réponse brute PayDunya :",
        paydunyaRaw
      );


      let paydunyaResult;


      try {

        paydunyaResult =
          JSON.parse(
            paydunyaRaw
          );

      } catch (
        parseError
      ) {

        console.error(
          "❌ PayDunya n'a pas retourné du JSON."
        );


        return res
          .status(502)
          .json({

            success:
              false,

            message:
              "PayDunya a retourné une réponse invalide.",
          });
      }


      console.log(
        "Réponse PayDunya :",
        paydunyaResult
      );


      // =========================
      // VÉRIFIER LA RÉPONSE
      // =========================

      if (
        !paydunyaResponse.ok ||
        !paydunyaResult?.token
      ) {

        console.error(
          "❌ Création PayDunya refusée :",
          paydunyaResult
        );


        return res
          .status(400)
          .json({

            success:
              false,

            message:
              paydunyaResult?.response_text ||
              paydunyaResult?.description ||
              "PayDunya a refusé la création du paiement.",

            details:
              paydunyaResult,
          });
      }


      const redirectUrl =
        paydunyaResult
          .response_text ||
        `https://app.paydunya.com/sandbox-checkout/invoice/${paydunyaResult.token}`;


      // =========================
      // ENREGISTRER FIRESTORE
      // =========================

      await firestoreAdmin
        .collection(
          "paydunyaPayments"
        )
        .doc(
          refCommand
        )
        .set({

          refCommand,

          amount:
            numericAmount,

          currency:
            "XOF",

          paymentMethod:
            "card",

          provider:
            "paydunya",

          paydunyaToken:
            paydunyaResult.token,

          redirectUrl,

          status:
            "pending",

          paid:
            false,

          userId:
            userId || "",

          buyerInfo:
            buyerInfo || null,

          cart:
            Array.isArray(cart)
              ? cart
              : [],

          createdAt:
            new Date(),

          updatedAt:
            new Date(),
        });


      console.log(
        "🧾 Paiement PayDunya enregistré :",
        refCommand
      );

      console.log(
        "URL PayDunya :",
        redirectUrl
      );

      console.log(
        "=============================="
      );


      return res.json({

        success:
          true,

        refCommand,

        token:
          paydunyaResult.token,

        redirectUrl,
      });


    } catch (error) {

      console.error(
        "❌ Erreur création paiement PayDunya :",
        error
      );


      return res
        .status(500)
        .json({

          success:
            false,

          message:
            error?.message ||
            "Impossible de créer le paiement PayDunya.",
        });
    }
  }
);
// =========================================================
// PARTIE 4/4
// PAYDUNYA IPN + COMMANDES + PAYTECH + DÉMARRAGE SERVEUR
// =========================================================


// =========================================================
// PAYDUNYA - IPN / CONFIRMATION
// =========================================================

app.post(
  "/api/payments/paydunya/ipn",
  async (req, res) => {
    try {

      console.log(
        "📩 IPN PayDunya reçu"
      );

      console.log(
        "📦 IPN PAYDUNYA COMPLET :",
        JSON.stringify(
          req.body,
          null,
          2
        )
      );


      const data =
        req.body?.data ||
        req.body;


      console.log(
        "Statut PayDunya reçu :",
        data?.status || ""
      );


      const customData =
        data?.custom_data ||
        {};


      const refCommand =
        String(
          customData?.refCommand ||
          ""
        ).trim();


      const paydunyaToken =
        data?.invoice?.token ||
        data?.token ||
        "";


      if (!refCommand) {

        console.error(
          "❌ IPN PayDunya : refCommand manquant"
        );

        return res
          .status(400)
          .send(
            "REF_COMMAND_MISSING"
          );
      }


      const paymentDocRef =
        firestoreAdmin
          .collection(
            "paydunyaPayments"
          )
          .doc(
            refCommand
          );


      const paymentSnapshot =
        await paymentDocRef
          .get();


      if (
        !paymentSnapshot.exists
      ) {

        console.error(
          "❌ Paiement PayDunya inconnu :",
          refCommand
        );

        return res
          .status(404)
          .send(
            "PAYMENT_NOT_FOUND"
          );
      }


      const status =
        String(
          data?.status || ""
        )
          .trim()
          .toLowerCase();


      if (
        status === "completed"
      ) {

        await paymentDocRef
          .update({

            status:
              "paid",

            paid:
              true,

            paydunyaStatus:
              status,

            paydunyaToken:
              paydunyaToken ||
              paymentSnapshot
                .data()
                ?.paydunyaToken ||
              "",

            paidAt:
              new Date(),

            updatedAt:
              new Date(),
          });


        const paymentData =
          paymentSnapshot.data() ||
          {};


        // ==========================================
        // CRÉER LA COMMANDE UMI APRÈS PAIEMENT
        // ==========================================

        const orderRef =
          firestoreAdmin
            .collection(
              "orders"
            )
            .doc(
              refCommand
            );


        const existingOrder =
          await orderRef.get();


        if (
          !existingOrder.exists
        ) {

          await orderRef.set({

            orderNumber:
              refCommand,

            userId:
              paymentData.userId ||
              "",

            products:
              Array.isArray(
                paymentData.cart
              )
                ? paymentData.cart
                : [],

            total:
              Number(
                paymentData.amount
              ) || 0,

            currency:
              "FCFA",

            status:
              "paid",

            paymentStatus:
              "paid",

            paymentMethod:
              "card",

            paymentProvider:
              "paydunya",

            paymentReference:
              refCommand,

            paydunyaToken:
              paydunyaToken ||
              paymentData
                .paydunyaToken ||
              "",

            buyerInfo:
              paymentData
                .buyerInfo ||
              null,

            paid:
              true,

            createdAt:
              FieldValue
                .serverTimestamp(),

            paidAt:
              FieldValue
                .serverTimestamp(),

            updatedAt:
              FieldValue
                .serverTimestamp(),
          });


          console.log(
            "📦 COMMANDE UMI CRÉÉE :",
            refCommand
          );

        } else {

          console.log(
            "ℹ️ Commande UMI déjà existante :",
            refCommand
          );
        }


        console.log(
          "✅ PAIEMENT PAYDUNYA CONFIRMÉ :",
          refCommand
        );

      } else {

        await paymentDocRef
          .update({

            paydunyaStatus:
              status ||
              "unknown",

            updatedAt:
              new Date(),
          });


        console.log(
          "ℹ️ PayDunya statut :",
          status,
          refCommand
        );
      }


      return res
        .status(200)
        .send(
          "OK"
        );


    } catch (error) {

      console.error(
        "❌ Erreur IPN PayDunya :",
        error
      );

      return res
        .status(500)
        .send(
          "ERREUR_SERVEUR"
        );
    }
  }
);


// =========================================================
// PAYDUNYA - VERIFIER UN PAIEMENT
// =========================================================

app.get(
  "/api/payments/paydunya/status/:refCommand",
  async (req, res) => {
    try {

      const refCommand =
        String(
          req.params?.refCommand ||
          ""
        ).trim();


      if (!refCommand) {

        return res
          .status(400)
          .json({

            success:
              false,

            paid:
              false,

            message:
              "Référence de paiement manquante.",
          });
      }


      const paymentSnapshot =
        await firestoreAdmin
          .collection(
            "paydunyaPayments"
          )
          .doc(
            refCommand
          )
          .get();


      if (
        !paymentSnapshot.exists
      ) {

        return res
          .status(404)
          .json({

            success:
              false,

            paid:
              false,

            message:
              "Paiement introuvable.",
          });
      }


      const paymentData =
        paymentSnapshot.data() ||
        {};


      const paid =
        paymentData.paid ===
          true &&
        paymentData.status ===
          "paid";


      return res
        .status(200)
        .json({

          success:
            true,

          paid,

          status:
            paymentData.status ||
            "pending",

          refCommand,

          orderNumber:
            refCommand,
        });


    } catch (error) {

      console.error(
        "❌ Erreur vérification paiement PayDunya :",
        error
      );


      return res
        .status(500)
        .json({

          success:
            false,

          paid:
            false,

          message:
            "Impossible de vérifier le paiement.",
        });
    }
  }
);


// =========================================================
// PAYDUNYA - RETOUR APRÈS PAIEMENT
// =========================================================

app.get(
  "/api/payments/paydunya/success",
  async (req, res) => {
    try {

      console.log(
        "✅ Retour PayDunya après paiement",
        req.query
      );


      const refCommand =
        String(
          req.query?.refCommand ||
          ""
        ).trim();


      if (!refCommand) {

        return res
          .status(400)
          .send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>
    UMI - Paiement
  </title>
</head>

<body
  style="
    font-family: Arial, sans-serif;
    text-align: center;
    padding: 50px 20px;
  "
>
  <h1>
    Impossible de vérifier le paiement
  </h1>

  <p>
    La référence de paiement est manquante.
  </p>
</body>
</html>
          `);
      }


      const paymentDocRef =
        firestoreAdmin
          .collection(
            "paydunyaPayments"
          )
          .doc(
            refCommand
          );


      const paymentSnapshot =
        await paymentDocRef
          .get();


      if (
        !paymentSnapshot.exists
      ) {

        return res
          .status(404)
          .send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>
    UMI - Paiement
  </title>
</head>

<body
  style="
    font-family: Arial, sans-serif;
    text-align: center;
    padding: 50px 20px;
  "
>
  <h1>
    Paiement introuvable
  </h1>

  <p>
    UMI ne trouve pas ce paiement.
  </p>
</body>
</html>
          `);
      }


      const paymentData =
        paymentSnapshot.data() ||
        {};


      if (
        paymentData.paid !==
          true ||
        paymentData.status !==
          "paid"
      ) {

        return res
          .status(200)
          .send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <meta
    http-equiv="refresh"
    content="2"
  />

  <title>
    UMI - Vérification
  </title>
</head>

<body
  style="
    font-family: Arial, sans-serif;
    text-align: center;
    padding: 50px 20px;
  "
>
  <h1>
    Vérification du paiement...
  </h1>

  <p>
    UMI attend la confirmation sécurisée de PayDunya.
  </p>
</body>
</html>
          `);
      }


      console.log(
        "✅ RETOUR UMI : paiement vérifié :",
        refCommand
      );


      // ==========================================
      // CRÉER LA COMMANDE UMI APRÈS PAIEMENT
      // ==========================================

      const orderRef =
        firestoreAdmin
          .collection(
            "orders"
          )
          .doc(
            refCommand
          );


      const existingOrder =
        await orderRef.get();


      if (
        !existingOrder.exists
      ) {

        await orderRef.set({

          orderNumber:
            refCommand,

          userId:
            paymentData.userId ||
            "",

          products:
            Array.isArray(
              paymentData.cart
            )
              ? paymentData.cart
              : [],

          total:
            Number(
              paymentData.amount
            ) || 0,

          currency:
            "FCFA",

          status:
            "paid",

          paymentStatus:
            "paid",

          paymentMethod:
            paymentData
              .paymentMethod ||
            "card",

          paymentProvider:
            "paydunya",

          paymentReference:
            refCommand,

          buyerInfo:
            paymentData
              .buyerInfo ||
            null,

          paid:
            true,

          createdAt:
            new Date(),

          paidAt:
            new Date(),

          updatedAt:
            new Date(),
        });


        console.log(
          "📦 COMMANDE UMI CRÉÉE DEPUIS SUCCESS :",
          refCommand
        );

      } else {

        console.log(
          "ℹ️ Commande UMI déjà existante :",
          refCommand
        );
      }


      return res
        .status(200)
        .send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>
    UMI - Paiement réussi
  </title>
</head>

<body
  style="
    font-family: Arial, sans-serif;
    text-align: center;
    padding: 50px 20px;
  "
>
  <h1>
    ✅ Paiement réussi
  </h1>

  <p>
    Votre paiement a été confirmé.
  </p>

  <p>
    Commande :
    <strong>${refCommand}</strong>
  </p>

  <p>
    Retour vers UMI...
  </p>

  <script>
    setTimeout(() => {
      window.location.href =
        "http://10.38.91.173:5175/?payment=success&refCommand=${encodeURIComponent(
          refCommand
        )}";
    }, 1500);
  </script>
</body>
</html>
        `);


    } catch (error) {

      console.error(
        "❌ Erreur retour PayDunya :",
        error
      );


      return res
        .status(500)
        .send(
          "Impossible de vérifier le paiement."
        );
    }
  }
);


// =========================================================
// PAYDUNYA - ANNULATION
// =========================================================

app.get(
  "/api/payments/paydunya/cancel",
  async (req, res) => {

    console.log(
      "❌ Paiement PayDunya annulé",
      req.query
    );


    return res
      .status(200)
      .send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>
    Paiement UMI
  </title>
</head>

<body
  style="
    font-family: Arial, sans-serif;
    text-align: center;
    padding: 50px 20px;
  "
>
  <h1>
    Paiement annulé
  </h1>

  <p>
    Aucun paiement n'a été confirmé.
  </p>

  <p>
    Vous pouvez retourner dans l'application UMI.
  </p>
</body>
</html>
      `);
  }
);
// =========================================================
// FRESHPAY / MOKO AFRIKA - CARD PAYMENTS
// =========================================================

const FRESHPAY_API_KEY =
  process.env.FRESHPAY_API_KEY;

const FRESHPAY_API_SECRET =
  process.env.FRESHPAY_API_SECRET;

const FRESHPAY_BASE_URL =
  process.env.FRESHPAY_BASE_URL ||
  "https://sandbox.gofreshpay.com/api/v1/payment";


console.log(
  FRESHPAY_API_KEY &&
  FRESHPAY_API_SECRET
    ? "💳 FreshPay Card Payments configuré"
    : "❌ Configuration FreshPay manquante"
);


// =========================================================
// CRÉER SIGNATURE HMAC FRESHPAY
// =========================================================

function createFreshPaySignature(
  body,
  timestamp
) {

  const payloadString =
    JSON.stringify(body);

  const message =
    payloadString + timestamp;

  return crypto
    .createHmac(
      "sha256",
      FRESHPAY_API_SECRET
    )
    .update(message)
    .digest("hex");
}


// =========================================================
// CRÉER UN PAIEMENT CARTE FRESHPAY
// =========================================================
// =========================================================
// TEST DIRECT FRESHPAY CARD PAYMENTS
// =========================================================

app.get(
  "/api/freshpay/test",
  async (req, res) => {
console.log("🚨 ROUTE TEST FRESHPAY APPELÉE");
    try {

      const testBody = {
        amount: 25,
        currency: "USD",
        merchant_reference:
          `UMI_TEST_${Date.now()}`,
      };

      console.log(
        "🧪 TEST DIRECT FRESHPAY"
      );

      console.log(
        "API KEY chargée :",
        Boolean(FRESHPAY_API_KEY)
      );

      console.log(
        "Longueur API KEY :",
        FRESHPAY_API_KEY?.length
      );

      const response =
        await fetch(
          "https://sandbox.gofreshpay.com/api/v1/payment/orders",
          {
            method: "POST",

            headers: {
              "X-Api-Key":
                FRESHPAY_API_KEY,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                testBody
              ),
          }
        );

      const raw =
        await response.text();

      console.log(
        "FreshPay TEST :",
        response.status,
        raw
      );

      return res
        .status(response.status)
        .send(raw);

    } catch (error) {

      console.error(
        "❌ TEST FRESHPAY :",
        error
      );

      return res
        .status(500)
        .json({
          error:
            error.message,
        });
    }
  }
);
app.post(
  "/api/payments/freshpay/create",
  async (req, res) => {

    try {

      if (
        !FRESHPAY_API_KEY ||
        !FRESHPAY_API_SECRET
      ) {

        return res
          .status(500)
          .json({

            success: false,

            message:
              "Configuration FreshPay manquante sur le serveur.",

          });
      }


      const {
        amount,
        userId,
        buyerInfo,
        cart,
      } = req.body;


      const numericAmount =
        Number(amount);


      if (
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {

        return res
          .status(400)
          .json({

            success: false,

            message:
              "Montant de paiement invalide.",

          });
      }


      // ==========================================
      // RÉFÉRENCE UNIQUE UMI
      // ==========================================

      const merchantReference =
        `UMI-FP-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)
          .toUpperCase()}`;


      // ==========================================
      // INFORMATIONS CLIENT
      // ==========================================

      const firstname =
        buyerInfo?.firstName ||
        buyerInfo?.firstname ||
        buyerInfo?.prenom ||
        "Client";


      const lastname =
        buyerInfo?.lastName ||
        buyerInfo?.lastname ||
        buyerInfo?.nom ||
        "UMI";


      const email =
        buyerInfo?.email ||
        "";


      const phone =
        buyerInfo?.phone ||
        buyerInfo?.telephone ||
        "";


      const address =
        buyerInfo?.address ||
        buyerInfo?.adresse ||
        "";


      const city =
        buyerInfo?.city ||
        buyerInfo?.ville ||
        "Bamako";


      // ==========================================
      // BODY FRESHPAY
      // ==========================================

      const freshPayBody = {

        amount:
          Number(
            numericAmount.toFixed(2)
          ),

        currency:
          "USD",

        merchant_reference:
          merchantReference,

        callback_url:
          `${req.protocol}://${req.get(
            "host"
          )}/api/payments/freshpay/webhook`,

        bill_to_forename:
          firstname,

        bill_to_surname:
          lastname,

        bill_to_email:
          email,

        bill_to_phone:
          phone,

        bill_to_address_line1:
          address || "Bamako",

        bill_to_address_city:
          city,

        bill_to_address_country:
          "ML",

      };


      // ==========================================
      // TIMESTAMP ISO 8601
      // ==========================================

      const timestamp =
        new Date().toISOString();


      // ==========================================
      // SIGNATURE HMAC-SHA256
      // ==========================================

      const signature =
        createFreshPaySignature(
          freshPayBody,
          timestamp
        );


      console.log(
        "💳 Création paiement FreshPay :",
        merchantReference
      );


      // ==========================================
      // APPEL API FRESHPAY
      // ==========================================

      const freshPayResponse =
        await fetch(
          `${FRESHPAY_BASE_URL}/orders`,
          {

            method:
              "POST",

            headers: {
  "Content-Type": "application/json",
  "X-Api-Key": FRESHPAY_API_KEY,
},

            // IMPORTANT :
            // la signature a été calculée
            // avec exactement ce JSON
            body:
              JSON.stringify(
                freshPayBody
              ),

          }
        );


      const rawResponse =
        await freshPayResponse.text();


      console.log(
        "Réponse brute FreshPay :",
        freshPayResponse.status,
        rawResponse
      );


      let freshPayData;


      try {

        freshPayData =
          JSON.parse(
            rawResponse
          );

      } catch {

        return res
          .status(502)
          .json({

            success: false,

            message:
              "FreshPay a retourné une réponse invalide.",

            raw:
              rawResponse,

          });
      }


      if (
        !freshPayResponse.ok
      ) {

        return res
          .status(
            freshPayResponse.status
          )
          .json({

            success: false,

            message:
              freshPayData?.message ||
              freshPayData?.error ||
              "FreshPay a refusé le paiement.",

            freshpay:
              freshPayData,

          });
      }


      // ==========================================
      // INFORMATIONS RETOURNÉES
      // ==========================================

      const transactionUuid =
        freshPayData?.data
          ?.transaction_uuid ||
        freshPayData
          ?.transaction_uuid ||
        "";


      const paymentUrl =
        freshPayData?.data
          ?.links ||
        freshPayData
          ?.links ||
        "";


      const transactionStatus =
        freshPayData?.data
          ?.transaction_status ||
        freshPayData
          ?.transaction_status ||
        "PENDING";


      // ==========================================
      // ENREGISTRER DANS FIRESTORE
      // ==========================================

      await firestoreAdmin
        .collection(
          "freshpayPayments"
        )
        .doc(
          merchantReference
        )
        .set({

          merchantReference,

          transactionUuid,

          paymentUrl,

          amount:
            numericAmount,

          currency:
            "USD",

          provider:
            "freshpay",

          paymentMethod:
            "card",

          status:
            transactionStatus,

          paid:
            false,

          userId:
            userId || "",

          buyerInfo:
            buyerInfo || null,

          cart:
            Array.isArray(cart)
              ? cart
              : [],

          createdAt:
            new Date(),

          updatedAt:
            new Date(),

        });


      console.log(
        "✅ Paiement FreshPay créé :",
        merchantReference
      );


      // ==========================================
      // RÉPONSE AU FRONTEND
      // ==========================================

      return res.json({

        success:
          true,

        merchantReference,

        transactionUuid,

        status:
          transactionStatus,

        paymentUrl,

        freshpay:
          freshPayData,

      });


    } catch (error) {

      console.error(
        "❌ Erreur FreshPay :",
        error
      );


      return res
        .status(500)
        .json({

          success:
            false,

          message:
            error?.message ||
            "Impossible de créer le paiement FreshPay.",

        });
    }
  }
);

// =========================================================
// PAYTECH - IPN / CONFIRMATION DU PAIEMENT
// =========================================================

app.post(
  "/api/payments/paytech/ipn",
  async (req, res) => {
    try {

      console.log(
        "📩 IPN PayTech reçu"
      );

      console.log(
        "Body IPN :",
        req.body
      );


      const data =
        req.body || {};


      const refCommand =
        String(
          data.ref_command ||
          data.refCommand ||
          ""
        ).trim();


      if (!refCommand) {

        console.error(
          "❌ IPN PayTech sans référence"
        );

        return res
          .status(400)
          .send(
            "REF_COMMAND_MISSING"
          );
      }


      const paymentDocRef =
        firestoreAdmin
          .collection(
            "paytechPayments"
          )
          .doc(
            refCommand
          );


      const paymentSnapshot =
        await paymentDocRef
          .get();


      if (
        !paymentSnapshot.exists
      ) {

        console.error(
          "❌ Paiement PayTech inconnu :",
          refCommand
        );

        return res
          .status(404)
          .send(
            "PAYMENT_NOT_FOUND"
          );
      }


      const rawStatus =
        data.status ||
        data.payment_status ||
        data.state ||
        "";


      const status =
        String(
          rawStatus
        )
          .trim()
          .toLowerCase();


      console.log(
        "Statut PayTech :",
        status
      );


      const paidStatuses = [
        "completed",
        "complete",
        "paid",
        "success",
        "successful",
      ];


      if (
        paidStatuses.includes(
          status
        )
      ) {

        await paymentDocRef
          .update({

            status:
              "paid",

            paid:
              true,

            paytechStatus:
              status,

            paidAt:
              new Date(),

            updatedAt:
              new Date(),
          });


        console.log(
          "✅ PAIEMENT PAYTECH CONFIRMÉ :",
          refCommand
        );

      } else {

        await paymentDocRef
          .update({

            paytechStatus:
              status ||
              "unknown",

            updatedAt:
              new Date(),
          });


        console.log(
          "ℹ️ Paiement PayTech non confirmé :",
          refCommand,
          status
        );
      }


      return res
        .status(200)
        .send(
          "OK"
        );


    } catch (error) {

      console.error(
        "❌ Erreur IPN PayTech :",
        error
      );


      return res
        .status(500)
        .send(
          "ERREUR_SERVEUR"
        );
    }
  }
);


// =========================================================
// PAYTECH - RETOUR SUCCÈS
// =========================================================

app.get(
  "/api/payments/paytech/success",
  async (req, res) => {

    console.log(
      "✅ Retour PayTech après paiement",
      req.query
    );


    return res
      .status(200)
      .send(
        "Paiement UMI terminé. Vous pouvez retourner dans l'application."
      );
  }
);


// =========================================================
// PAYTECH - ANNULATION
// =========================================================

app.get(
  "/api/payments/paytech/cancel",
  async (req, res) => {

    console.log(
      "❌ Paiement PayTech annulé",
      req.query
    );


    return res
      .status(200)
      .send(
        "Paiement UMI annulé. Vous pouvez retourner dans l'application."
      );
  }
);


// =========================
// DÉMARRER LE SERVEUR
// =========================
async function deleteStoredReplays() {
  const [lives, highlights] = await Promise.all([
    firestoreAdmin.collection("live").get(),
    firestoreAdmin.collection("liveHighlights").get(),
  ]);

  const recordings = new Map();
  const protectedFiles = new Set();

  for (const document of [
    ...lives.docs,
    ...highlights.docs,
  ]) {
    const data = document.data();

    if (data.highlightFilePath) {
      protectedFiles.add(data.highlightFilePath);
    }

    if (!data.recordingFilePath) {
      if (data.recordingUrl) {
        console.log(
          "Replay sans chemin R2, à vérifier :",
          document.id
        );
      }

      continue;
    }

    const key = data.recordingFilePath;

    if (!recordings.has(key)) {
      recordings.set(key, []);
    }

    recordings.get(key).push({
      ref: document.ref,
      data,
    });
  }

  let deleted = 0;
  let skipped = 0;
  let failed = 0;

  for (const [key, documents] of recordings) {
    const mustKeep =
      typeof key !== "string" ||
      !key.startsWith("recordings/") ||
      protectedFiles.has(key) ||
      documents.some(({ data }) =>
        data.isLive === true ||
        data.highlightStatus === "processing" ||
        data.status === "processing" ||
        data.recordingStatus === "recording"
      );

    if (mustKeep) {
      skipped++;
      console.log("Replay conservé :", key);
      continue;
    }

    try {
      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: r2Bucket,
          Key: key,
        })
      );

      // Effacer les références seulement après
      // la suppression réussie du fichier R2.
      for (const { ref } of documents) {
        await ref.update({
          recordingUrl: null,
          recordingFilePath: null,
          hasReplay: false,
          replayPublished: false,
          recordingStatus: "deleted",
        });
      }

      deleted++;
      console.log("Replay supprimé :", key);
    } catch (error) {
      failed++;
      console.error(
        "Erreur suppression :",
        key,
        error.message
      );
    }
  }

  console.log(
    `${deleted} supprimés, ` +
    `${skipped} conservés, ` +
    `${failed} échecs.`
  );

  return failed ? 1 : 0;
}

if (
  process.argv.includes("--delete-stored-replays")
) {
  try {
    const exitCode = await deleteStoredReplays();
    process.exit(exitCode);
  } catch (error) {
    console.error(
      "Suppression interrompue :",
      error.message
    );
    process.exit(1);
  }
}
app.post("/delete-highlight", async (req, res) => {
  try {
    const token = (
      req.headers.authorization || ""
    ).replace(/^Bearer /, "");

    if (!token) {
      return res.status(401).json({
        error: "Reconnectez-vous au compte administrateur.",
      });
    }

    const user = await getAuth().verifyIdToken(token);

    const profile = await firestoreAdmin
      .collection("users")
      .doc(user.uid)
      .get();

    const isAdmin =
      user.admin === true ||
      user.role === "admin" ||
      profile.data()?.role === "admin";

    if (!isAdmin) {
      return res.status(403).json({
        error: "Accès administrateur requis.",
      });
    }

    const liveId = req.body?.liveId;

    if (
      typeof liveId !== "string" ||
      !liveId ||
      liveId.includes("/")
    ) {
      return res.status(400).json({
        error: "Identifiant du LIVE invalide.",
      });
    }

    const liveRef = firestoreAdmin
      .collection("live")
      .doc(liveId);

    const snapshot = await liveRef.get();

    if (!snapshot.exists) {
      return res.status(404).json({
        error: "LIVE introuvable.",
      });
    }

    const live = snapshot.data();
    const filePath = live.highlightFilePath;

    if (
      typeof filePath !== "string" ||
      !filePath.startsWith("highlights/")
    ) {
      return res.status(400).json({
        error: "Chemin du Temps fort introuvable.",
      });
    }

    if (
      live.isLive === true ||
      live.highlightStatus === "processing"
    ) {
      return res.status(409).json({
        error: "Attendez la fin du LIVE et du traitement.",
      });
    }

    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: r2Bucket,
        Key: filePath,
      })
    );

    await liveRef.update({
      highlightUrl: null,
      highlightFilePath: null,
      highlightPublished: false,
      highlightStatus: "deleted",
    });

    await firestoreAdmin
      .collection("liveHighlights")
      .doc(liveId)
      .set(
        {
          highlightUrl: null,
          highlightFilePath: null,
          status: "deleted",
        },
        { merge: true }
      );

    highlightResults.delete(liveId);

    return res.json({ success: true });
  } catch (error) {
    console.error(
      "Erreur suppression Temps fort :",
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        "Impossible de supprimer le Temps fort.",
    });
  }
});
if (
  process.argv.includes("--close-old-lives")
) {
  try {
    const snapshot = await firestoreAdmin
      .collection("live")
      .where("isLive", "==", true)
      .get();

    let closed = 0;

    for (const document of snapshot.docs) {
      await document.ref.update({
        isLive: false,
        stoppedAt: FieldValue.serverTimestamp(),
      });

      closed++;
    }

    console.log(
      `${closed} anciens LIVE fermés.`
    );

    process.exit(0);
  } catch (error) {
    console.error(
      "Erreur fermeture des LIVE :",
      error.message
    );

    process.exit(1);
  }
}
const server =
  app.listen(
    PORT,
    "0.0.0.0",
    () => {

      console.log("");

      console.log(
        "✅ Serveur UMI LIVE démarré"
      );

      console.log(
        `✅ Port : ${PORT}`
      );

      console.log(
        `✅ Test : http://localhost:${PORT}`
      );

      console.log(
        `✅ R2 : ${
          r2Bucket ||
          "non configuré"
        }`
      );

      console.log("");

      console.log(
        "🎥 Enregistrement LIVE prêt"
      );

      console.log(
        "🎬 Système Temps forts prêt"
      );

      console.log(
        "🛑 Arrêt administratif LIVE prêt"
      );

      console.log("");

      console.log(
        "💳 Paiement PayTech prêt"
      );

      console.log(
        "💳 Paiement PayDunya prêt"
      );

      console.log(
        "🔥 Firestore paiements prêt"
      );

      console.log("");
    }
  );


// =========================
// ERREUR SERVEUR
// =========================

server.on(
  "error",
  (error) => {

    console.error(
      "❌ ERREUR SERVEUR :",
      error
    );
  }
);
