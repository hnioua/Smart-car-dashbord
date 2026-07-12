const express = require("express");
const cors = require("cors");
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, onValue, off } = require("firebase/database");

const app = express();
const PORT = process.env.PORT || 5000;

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAyTbto5iGPuAF-qJZckKzEekNDA4AByNw",
  databaseURL:
    "https://fire-detection-arduino2-default-rtdb.europe-west1.firebasedatabase.app/",
  authDomain: "fire-detection-arduino2.firebaseapp.com",
  projectId: "fire-detection-arduino2",
  storageBucket: "fire-detection-arduino2.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
};

// Initialiser Firebase
const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

// Middleware
app.use(cors());
app.use(express.json());

// Variables pour stocker les dernières données
let sensorData = {
  humidity: 0,
  temperature: 0,
  waterLevel: 0,
  flameCount: 0,
  timestamp: new Date().toISOString(),
};

// Historique des données pour les graphiques
let dataHistory = {
  waterLevel: [],
  flameIntensity: [],
  humidity: [],
  temperature: [],
};

// Fonction pour écouter les changements dans Firebase
function listenToFirebaseData() {
  const humidityRef = ref(database, "voiture_autonome/env/humPct");
  onValue(humidityRef, (snapshot) => {
    const value = snapshot.val();
    if (value !== null) {
      sensorData.humidity = parseFloat(value);
      addToHistory("humidity", value);
    }
  });

  const temperatureRef = ref(database, "voiture_autonome/env/tempC");
  onValue(temperatureRef, (snapshot) => {
    const value = snapshot.val();
    if (value !== null) {
      sensorData.temperature = parseFloat(value);
      addToHistory("temperature", value);
    }
  });

  const waterLevelRef = ref(database, "voiture_autonome/water/percent");
  onValue(waterLevelRef, (snapshot) => {
    const value = snapshot.val();
    if (value !== null) {
      sensorData.waterLevel = parseFloat(value);
      addToHistory("waterLevel", value);
    }
  });

  const flameRef = ref(database, "voiture_autonome/flammes/count");
  onValue(flameRef, (snapshot) => {
    const value = snapshot.val();
    if (value !== null) {
      sensorData.flameCount = parseInt(value);
      addToHistory("flameIntensity", value);
    }
  });

  console.log("✅ Écoute des données Firebase activée !");
}

// Fonction pour ajouter des données à l'historique
function addToHistory(type, value) {
  const now = new Date();
  const timeLabel = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const dataPoint = {
    time: timeLabel,
    value: parseFloat(value),
    timestamp: now.toISOString(),
  };

  if (!dataHistory[type]) {
    dataHistory[type] = [];
  }

  dataHistory[type].push(dataPoint);

  // Garder seulement les 20 dernières valeurs
  if (dataHistory[type].length > 20) {
    dataHistory[type].shift();
  }

  // Mettre à jour le timestamp global
  sensorData.timestamp = now.toISOString();
}

// Routes API

// Obtenir toutes les données actuelles
app.get("/api/sensors/current", (req, res) => {
  res.json({
    success: true,
    data: sensorData,
    timestamp: new Date().toISOString(),
  });
});

// Obtenir l'historique des données
app.get("/api/sensors/history", (req, res) => {
  res.json({
    success: true,
    data: dataHistory,
    timestamp: new Date().toISOString(),
  });
});

// Obtenir les données d'une seule mesure
app.get("/api/sensors/:type", (req, res) => {
  const { type } = req.params;

  const validTypes = ["humidity", "temperature", "waterLevel", "flameCount"];

  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: "Type de capteur invalide",
    });
  }

  res.json({
    success: true,
    data: {
      type: type,
      value: sensorData[type],
      timestamp: sensorData.timestamp,
    },
  });
});

// Route pour obtenir les statistiques
app.get("/api/sensors/stats", (req, res) => {
  const stats = {
    humidity: {
      current: sensorData.humidity,
      average: calculateAverage(dataHistory.humidity),
      min: calculateMin(dataHistory.humidity),
      max: calculateMax(dataHistory.humidity),
    },
    temperature: {
      current: sensorData.temperature,
      average: calculateAverage(dataHistory.temperature),
      min: calculateMin(dataHistory.temperature),
      max: calculateMax(dataHistory.temperature),
    },
    waterLevel: {
      current: sensorData.waterLevel,
      average: calculateAverage(dataHistory.waterLevel),
      min: calculateMin(dataHistory.waterLevel),
      max: calculateMax(dataHistory.waterLevel),
    },
    flameCount: {
      current: sensorData.flameCount,
      total: dataHistory.flameIntensity.length,
      lastDetection: getLastDetectionTime(),
    },
  };

  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString(),
  });
});

// Fonctions utilitaires pour les statistiques
function calculateAverage(data) {
  if (!data || data.length === 0) return 0;
  const sum = data.reduce((acc, item) => acc + item.value, 0);
  return (sum / data.length).toFixed(2);
}

function calculateMin(data) {
  if (!data || data.length === 0) return 0;
  return Math.min(...data.map((item) => item.value));
}

function calculateMax(data) {
  if (!data || data.length === 0) return 0;
  return Math.max(...data.map((item) => item.value));
}

function getLastDetectionTime() {
  if (!dataHistory.flameIntensity || dataHistory.flameIntensity.length === 0) {
    return null;
  }
  const lastItem =
    dataHistory.flameIntensity[dataHistory.flameIntensity.length - 1];
  return lastItem.timestamp;
}

// Route de santé
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend Firebase IoT est en marche",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error("Erreur:", err.stack);
  res.status(500).json({
    success: false,
    error: "Erreur interne du serveur",
    timestamp: new Date().toISOString(),
  });
});

// Route 404
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route non trouvée",
    timestamp: new Date().toISOString(),
  });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`\n🚀 Serveur backend démarré sur le port ${PORT}`);
  console.log(`📊 API disponible sur: http://localhost:${PORT}/api`);
  console.log(`🔥 Connexion à Firebase en cours...`);

  // Commencer à écouter Firebase
  listenToFirebaseData();

  console.log(`✅ Backend Firebase IoT prêt !`);
});

// Gestion propre de l'arrêt
process.on("SIGINT", () => {
  console.log("\n🛑 Arrêt du serveur...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Arrêt du serveur...");
  process.exit(0);
});
