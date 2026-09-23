const { onRequest } = require("firebase-functions/v2/https");

exports.umiPaymentServer = onRequest(
  {
    region: "europe-west1",
  },
  async (req, res) => {
    res.status(200).json({
      success: true,
      message: "Serveur de paiement UMI fonctionne",
    });
  }
);