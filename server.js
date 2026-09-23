import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import OpenAI from "openai";

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import {
  AccessToken,
  RoomServiceClient,
  EgressClient,
  EncodedFileOutput,
  S3Upload,
} from "livekit-server-sdk";

dotenv.config();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors());
app.use(express.json({
  limit: "15mb",
}));


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
   CLIENT CLOUDFLARE R2
========================= */

const r2Client =
  new S3Client({

    region: "auto",

    endpoint:
      r2Endpoint,

    credentials: {

      accessKeyId:
        r2AccessKey,

      secretAccessKey:
        r2SecretKey,

    },

  });


/* =========================
   FFMPEG
========================= */

const execFileAsync =
  promisify(execFile);


/* =========================
   TEMPS FORTS TERMINÉS
========================= */

const highlightResults =
  new Map();


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

app.get(
  "/",
  (req, res) => {

    res.send(
      "UMI LIVE SERVER OK"
    );

  }
);


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


/* =========================
   CRÉER LE TEMPS FORT
========================= */

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


    /* =========================
       1. TÉLÉCHARGER LE REPLAY
    ========================= */

    const object =
      await r2Client.send(

        new GetObjectCommand({

          Bucket:
            r2Bucket,

          Key:
            recordingFilePath,

        })

      );


    if (!object.Body) {

      throw new Error(
        "Le fichier Replay est vide."
      );

    }


    const bytes =
      await object.Body
        .transformToByteArray();


    fs.writeFileSync(
      inputPath,
      Buffer.from(bytes)
    );


    console.log(
      "✅ Replay téléchargé"
    );


    /* =========================
       2. CRÉER TEMPS FORT
       30 SECONDES MAXIMUM
    ========================= */

    await execFileAsync(
      "ffmpeg",
      [

        "-y",

        "-i",
        inputPath,

        "-t",
        "30",

        "-c:v",
        "libx264",

        "-preset",
        "veryfast",

        "-c:a",
        "aac",

        "-movflags",
        "+faststart",

        outputPath,

      ]
    );


    console.log(
      "✅ Temps fort créé avec FFmpeg"
    );


    /* =========================
       3. ENVOYER DANS R2
    ========================= */

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
      "✅ Temps fort envoyé dans R2"
    );

    console.log(
      "Fichier :",
      highlightFilePath
    );

    console.log(
      "=============================="
    );


    return {

      success:
        true,

      highlightFilePath,

    };


  } catch (error) {

    console.error(
      "❌ ERREUR CRÉATION TEMPS FORT :",
      error
    );


    throw error;


  } finally {

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


    } catch (cleanupError) {

      console.error(
        "⚠️ Erreur nettoyage fichiers temporaires :",
        cleanupError
      );

    }

  }

}


/* =========================
   ARRÊTER ENREGISTREMENT
========================= */

app.post(
  "/stop-recording",
  async (req, res) => {

    try {

      const {
        egressId,
        recordingFilePath,
        liveId,
        liveType,
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


      if (
        recordingFilePath &&
        liveId
      ) {

        highlightResults.set(
          liveId,
          {

            status:
              "processing",

            liveType:
              liveType ||
              "umi",

          }
        );

      }


      res.json({

        success:
          true,

        egressId:
          info.egressId,

        highlightStarted:
          Boolean(
            recordingFilePath &&
            liveId
          ),

      });


      console.log(
        "=============================="
      );


      /* =========================
         CRÉATION TEMPS FORT
      ========================= */

      if (
        recordingFilePath &&
        liveId
      ) {

        setTimeout(
          async () => {

            try {

              console.log(
                "⏳ Préparation du Temps fort..."
              );


              const result =
                await createHighlight(

                  recordingFilePath,

                  liveId,

                  liveType

                );


              highlightResults.set(
                liveId,
                {

                  status:
                    "ready",

                  highlightFilePath:
                    result.highlightFilePath,

                  liveType:
                    liveType ||
                    "umi",

                }
              );


              console.log(
                "🎬 Temps fort terminé :",
                result.highlightFilePath
              );


            } catch (
              highlightError
            ) {

              highlightResults.set(
                liveId,
                {

                  status:
                    "error",

                  liveType:
                    liveType ||
                    "umi",

                  error:
                    highlightError?.message ||
                    "Erreur création Temps fort",

                }
              );


              console.error(
                "❌ Impossible de créer le Temps fort :",
                highlightError
              );

            }

          },

          8000

        );

      } else {

        console.log(
          "ℹ️ Temps fort non lancé : informations manquantes."
        );

      }


    } catch (error) {

      console.error(
        "❌ ERREUR ARRÊT ENREGISTREMENT :",
        error
      );


      if (
        !res.headersSent
      ) {

        res
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

  }
);


/* =========================================
   ARRÊT ADMINISTRATIF D'UN LIVE
========================================= */

app.post(
  "/admin-stop-live",
  async (req, res) => {

    try {

      const {
        roomName,
        egressId,
        recordingFilePath,
        liveId,
        liveType,
      } = req.body;


      if (
        !roomName ||
        !liveId
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "roomName ou liveId manquant",

          });

      }


      console.log("");
      console.log(
        "=============================="
      );

      console.log(
        "🛑 ARRÊT ADMINISTRATIF DU LIVE"
      );

      console.log(
        "Live :",
        liveId
      );

      console.log(
        "Salle :",
        roomName
      );


      /* =========================
         1. ARRÊTER ENREGISTREMENT
      ========================= */

      if (egressId) {

        try {

          await egressClient
            .stopEgress(
              egressId
            );


          console.log(
            "✅ Enregistrement arrêté par l'administration"
          );


        } catch (error) {

          console.error(
            "⚠️ Erreur arrêt enregistrement :",
            error?.message ||
            error
          );

        }

      }


      /* =========================
         2. PRÉPARER TEMPS FORT
      ========================= */

      if (
        recordingFilePath &&
        liveId
      ) {

        highlightResults.set(
          liveId,
          {

            status:
              "processing",

            liveType:
              liveType ||
              "client",

          }
        );


        setTimeout(
          async () => {

            try {

              console.log(
                "⏳ Création Temps fort après arrêt administrateur..."
              );


              const result =
                await createHighlight(

                  recordingFilePath,

                  liveId,

                  liveType ||
                    "client"

                );


              highlightResults.set(
                liveId,
                {

                  status:
                    "ready",

                  highlightFilePath:
                    result.highlightFilePath,

                  liveType:
                    liveType ||
                    "client",

                }
              );


              console.log(
                "🎬 Temps fort terminé :",
                result.highlightFilePath
              );


            } catch (error) {

              highlightResults.set(
                liveId,
                {

                  status:
                    "error",

                  liveType:
                    liveType ||
                    "client",

                  error:
                    error?.message ||
                    "Erreur création Temps fort",

                }
              );


              console.error(
                "❌ Erreur Temps fort après arrêt admin :",
                error
              );

            }

          },

          8000

        );

      }


      /* =========================
         3. FERMER LA SALLE
         LIVEKIT
      ========================= */

      try {

        await roomService
          .deleteRoom(
            roomName
          );


        console.log(
          "✅ Salle LiveKit fermée"
        );


      } catch (error) {

        console.error(
          "⚠️ Erreur fermeture salle LiveKit :",
          error?.message ||
          error
        );

      }


      console.log(
        "✅ LIVE complètement arrêté par l'administration"
      );

      console.log(
        "=============================="
      );


      res.json({

        success:
          true,

        highlightStarted:
          Boolean(
            recordingFilePath &&
            liveId
          ),

      });


    } catch (error) {

      console.error(
        "❌ ERREUR ARRÊT ADMIN LIVE :",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

          error:
            error?.message ||
            "Impossible d'arrêter le LIVE",

        });

    }

  }
);


/* =========================
   SUPPRIMER UN TEMPS FORT
========================= */

app.post(
  "/delete-highlight",
  async (req, res) => {

    try {

      const {
        highlightFilePath,
        liveId,
      } = req.body;


      if (
        !highlightFilePath
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "highlightFilePath manquant",

          });

      }


      if (
        !highlightFilePath
          .startsWith(
            "highlights/"
          )
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "Chemin Temps fort invalide",

          });

      }


      console.log("");
      console.log(
        "=============================="
      );

      console.log(
        "🗑️ SUPPRESSION TEMPS FORT"
      );

      console.log(
        "Fichier :",
        highlightFilePath
      );


      await r2Client.send(

        new DeleteObjectCommand({

          Bucket:
            r2Bucket,

          Key:
            highlightFilePath,

        })

      );


      if (liveId) {

        highlightResults.delete(
          liveId
        );

      }


      console.log(
        "✅ Temps fort supprimé de R2"
      );

      console.log(
        "=============================="
      );


      res.json({

        success:
          true,

      });


    } catch (error) {

      console.error(
        "❌ ERREUR SUPPRESSION TEMPS FORT :",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

          error:
            error?.message ||
            "Impossible de supprimer le Temps fort",

        });

    }

  }
);


/* =========================
   SUPPRIMER UN REPLAY
========================= */

app.post(
  "/delete-replay",
  async (req, res) => {

    try {

      const {
        recordingFilePath,
      } = req.body;


      if (
        !recordingFilePath
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "recordingFilePath manquant",

          });

      }


      if (
        !recordingFilePath
          .startsWith(
            "recordings/"
          )
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "Chemin Replay invalide",

          });

      }


      console.log("");
      console.log(
        "=============================="
      );

      console.log(
        "🗑️ SUPPRESSION REPLAY"
      );

      console.log(
        "Fichier :",
        recordingFilePath
      );


      await r2Client.send(

        new DeleteObjectCommand({

          Bucket:
            r2Bucket,

          Key:
            recordingFilePath,

        })

      );


      console.log(
        "✅ Replay supprimé de R2"
      );

      console.log(
        "=============================="
      );


      res.json({

        success:
          true,

      });


    } catch (error) {

      console.error(
        "❌ ERREUR SUPPRESSION REPLAY :",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

          error:
            error?.message ||
            "Impossible de supprimer le Replay",

        });

    }

  }
);


/* =========================
   ÉTAT DU TEMPS FORT
========================= */

app.get(
  "/highlight-status/:liveId",
  (req, res) => {

    const liveId =
      req.params.liveId;


    const result =
      highlightResults.get(
        liveId
      );


    if (!result) {

      return res.json({

        status:
          "not-found",

      });

    }


    res.json(
      result
    );

  }
);

/* =========================
   DIAGNOSTIC EGRESS LIVEKIT
========================= */

app.get(
  "/egress-status/:egressId",
  async (req, res) => {

    try {

      const egressId =
        req.params.egressId;


      if (!egressId) {

        return res
          .status(400)
          .json({
            success: false,
            error: "Egress ID manquant",
          });

      }


      console.log("");
      console.log(
        "=============================="
      );

      console.log(
        "🔎 DIAGNOSTIC EGRESS"
      );

      console.log(
        "Egress ID :",
        egressId
      );


      const egressList =
        await egressClient.listEgress({
          egressId,
        });


      if (
        !egressList ||
        egressList.length === 0
      ) {

        console.log(
          "❌ Egress introuvable"
        );

        console.log(
          "=============================="
        );


        return res
          .status(404)
          .json({
            success: false,
            error: "Egress introuvable",
          });

      }


      const info =
        egressList[0];


      console.log(
        "Statut :",
        info.status
      );


      console.log(
        "Erreur :",
        info.error || "aucune"
      );


      console.log(
        "Code erreur :",
        info.errorCode || "aucun"
      );


      console.log(
        "Fichiers :",
        info.fileResults || []
      );


      console.log(
        "Informations complètes :"
      );

      console.dir(
        info,
        {
          depth: 6,
        }
      );


      console.log(
        "=============================="
      );


      res.json({
        success: true,

        egressId:
          info.egressId,

        status:
          info.status,

        error:
          info.error || null,

        errorCode:
          info.errorCode || null,

        fileResults:
          info.fileResults || [],
      });


    } catch (error) {

      console.error(
        "❌ ERREUR DIAGNOSTIC EGRESS :",
        error
      );


      res
        .status(500)
        .json({
          success: false,

          error:
            error?.message ||
            "Impossible de vérifier l'Egress",
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

        viewers:
          0,

      });

    }

  }
);

/* =========================
   RECHERCHE MACHINE PAR IMAGE
========================= */

app.post(
  "/search-machine-image",
  async (req, res) => {

    try {

      const { image } = req.body;

      if (!image) {
        return res.status(400).json({
          success: false,
          error: "Image manquante",
        });
      }

      console.log(
        "🖼️ Analyse d'une image de machine..."
      );

      const response =
        await openai.responses.create({

          model: "gpt-5.4-mini",

          input: [
            {
              role: "user",

              content: [
                {
                  type: "input_text",
                  text: `
Analyse cette photo.

L'application UMI vend des machines industrielles.

Identifie ce que montre principalement l'image.

Retourne uniquement des mots-clés courts en français
permettant de rechercher cette machine dans notre catalogue.

Exemples :
machine emballage conditionnement sachet
machine remplissage bouteille
machine fabrication plastique
machine agroalimentaire
machine agriculture
machine construction
machine textile
machine recyclage

Ne donne aucune explication.
                  `,
                },

                {
                  type: "input_image",
                  image_url: image,
                },
              ],
            },
          ],

        });


      const keywords =
        response.output_text
          ?.trim() || "";


      console.log(
        "🔎 Mots-clés détectés :",
        keywords
      );


      res.json({
        success: true,
        keywords,
      });


    } catch (error) {

      console.error(
        "❌ Erreur analyse image :",
        error
      );


      res.status(500).json({
        success: false,
        error:
          error?.message ||
          "Impossible d'analyser l'image",
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

      console.log(
        "🎬 Système Temps forts prêt"
      );

      console.log(
        "🛑 Arrêt administratif LIVE prêt"
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