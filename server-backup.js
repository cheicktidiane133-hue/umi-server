import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import {
  AccessToken,
  RoomServiceClient,
  EgressClient,
  EncodedFileOutput,
  S3Upload,
} from "livekit-server-sdk";

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

/* =========================
   VARIABLES LIVEKIT
========================= */

const livekitUrl =
  process.env.LIVEKIT_URL;

const apiKey =
  process.env.LIVEKIT_API_KEY;

const apiSecret =
  process.env.LIVEKIT_API_SECRET;

/* =========================
   VARIABLES CLOUDFLARE R2
========================= */

const r2AccessKey =
  process.env.R2_ACCESS_KEY_ID;

const r2SecretKey =
  process.env.R2_SECRET_ACCESS_KEY;

const r2Endpoint =
  process.env.R2_ENDPOINT;

const r2Bucket =
  process.env.R2_BUCKET;

/* =========================
   VÉRIFICATIONS
========================= */

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

/* =========================
   URL HTTP LIVEKIT
========================= */

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

/* =========================
   CLIENTS LIVEKIT
========================= */

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

/* =========================
   TEST SERVEUR
========================= */

app.get("/", (req, res) => {
  res.send(
    "UMI LIVE SERVER OK"
  );
});

/* =========================
   CRÉATION TOKEN LIVEKIT
========================= */

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
        roomName || "umi-live";

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

      /*
        ADMIN UMI :
        peut diffuser.

        VENDEUR CLIENT :
        peut également diffuser.

        SPECTATEUR :
        peut seulement regarder.
      */

      const canPublish =
        role === "admin" ||
        role ===
          "client-broadcaster";

      token.addGrant({
        roomJoin: true,
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
        token: jwt,
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

/* =========================
   DÉMARRER ENREGISTREMENT
========================= */

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

      /*
        Nom du fichier vidéo.

        Exemple :
        recordings/client/abc123-....mp4

        ou :

        recordings/umi/abc123-....mp4
      */

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

      /*
        Fichier MP4 envoyé directement
        vers Cloudflare R2.
      */

      const fileOutput =
        new EncodedFileOutput({
          filepath:
            filePath,

          output: {
            case: "s3",

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

      /*
        Participant Egress :
        enregistre la caméra +
        le microphone du diffuseur.
      */

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
        success: true,

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
          success: false,

          error:
            error?.message ||
            "Impossible de démarrer l'enregistrement",
        });
    }
  }
);

/* =========================
   ARRÊTER ENREGISTREMENT
========================= */

app.post(
  "/stop-recording",
  async (req, res) => {
    try {
      const {
        egressId,
      } = req.body;

      if (!egressId) {
        return res
          .status(400)
          .json({
            error:
              "egressId manquant",
          });
      }

      console.log("");
      console.log(
        "=============================="
      );
      console.log(
        "⏹ ARRÊT ENREGISTREMENT"
      );
      console.log(
        "Egress ID :",
        egressId
      );

      const info =
        await egressClient
          .stopEgress(
            egressId
          );

      console.log(
        "✅ Arrêt demandé à LiveKit"
      );

      console.log(
        "=============================="
      );

      res.json({
        success: true,
        egressId:
          info.egressId,
      });
    } catch (error) {
      console.error(
        "❌ ERREUR ARRÊT ENREGISTREMENT :",
        error
      );

      res
        .status(500)
        .json({
          success: false,

          error:
            error?.message ||
            "Impossible d'arrêter l'enregistrement",
        });
    }
  }
);

/* =========================
   NOMBRE DE SPECTATEURS
========================= */

app.get(
  "/live-viewers/:roomName",
  async (req, res) => {
    const roomName =
      req.params.roomName;

    try {
      console.log("");

      console.log(
        "=============================="
      );

      console.log(
        "👁 DEMANDE COMPTEUR"
      );

      console.log(
        "Salle :",
        roomName
      );

      const participants =
        await roomService
          .listParticipants(
            roomName
          );

      console.log(
        "Participants LiveKit :",
        participants.map(
          (participant) =>
            participant.identity
        )
      );

      /*
        On compte uniquement
        les spectateurs.
      */

      const spectators =
        participants.filter(
          (participant) =>
            participant.identity
              ?.startsWith(
                "spectateur-"
              )
        );

      console.log(
        "Nombre total :",
        participants.length
      );

      console.log(
        "Nombre de spectateurs :",
        spectators.length
      );

      console.log(
        "=============================="
      );

      res.json({
        roomName,

        viewers:
          spectators.length,
      });
    } catch (error) {
      console.error(
        "❌ ERREUR COMPTEUR :",
        error
      );

      res.json({
        roomName,
        viewers: 0,
      });
    }
  }
);

/* =========================
   DÉMARRER LE SERVEUR
========================= */

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
        `✅ R2 : ${r2Bucket || "non configuré"}`
      );

      console.log("");

      console.log(
        "🎥 Enregistrement LIVE prêt"
      );

      console.log("");
    }
  );

server.on(
  "error",
  (error) => {
    console.error(
      "❌ ERREUR SERVEUR :",
      error
    );
  }
);