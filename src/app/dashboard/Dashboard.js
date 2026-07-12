import React, { Component } from "react";
import { Line } from "react-chartjs-2";
import Slider from "react-slick";
import { TodoListComponent } from "../apps/TodoList";
import { VectorMap } from "react-jvectormap";
import LiveVideoInterface from "./LIVE";

const mapData = {
  BZ: 75.0,
  US: 56.25,
  AU: 15.45,
  GB: 25.0,
  RO: 10.25,
  GE: 33.25,
};

export class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      sensorData: {
        humidity: 0,
        temperature: 0,
        waterLevel: 0,
        flameCount: 0,
        timestamp: new Date().toISOString(),
      },
      dataHistory: {
        waterLevel: [],
        flameIntensity: [],
        humidity: [],
        temperature: [],
      },
      isLoading: true,
      error: null,
      connectionStatus: "Connexion...",
    };
    this.intervalId = null;
  }

  componentDidMount() {
    this.fetchSensorData();
    // Actualiser les données toutes les 5 secondes
    this.intervalId = setInterval(() => {
      this.fetchSensorData();
    }, 5000);
  }

  componentWillUnmount() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  fetchSensorData = async () => {
    try {
      // Récupérer les données actuelles
      const currentResponse = await fetch(
        "http://localhost:5000/api/sensors/current"
      );
      const currentData = await currentResponse.json();

      // Récupérer l'historique
      const historyResponse = await fetch(
        "http://localhost:5000/api/sensors/history"
      );
      const historyData = await historyResponse.json();

      if (currentData.success && historyData.success) {
        this.setState({
          sensorData: currentData.data,
          dataHistory: historyData.data,
          isLoading: false,
          error: null,
          connectionStatus: "Connecté",
        });
      } else {
        throw new Error("Erreur lors de la récupération des données");
      }
    } catch (error) {
      console.error("Erreur:", error);
      this.setState({
        error: error.message,
        isLoading: false,
        connectionStatus: "Déconnecté",
      });
    }
  };

  formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  getStatusColor = (type, value) => {
    switch (type) {
      case "humidity":
        return value < 30
          ? "text-danger"
          : value > 70
          ? "text-warning"
          : "text-success";
      case "temperature":
        return value > 35
          ? "text-danger"
          : value < 10
          ? "text-primary"
          : "text-success";
      case "waterLevel":
        return value < 20
          ? "text-danger"
          : value < 50
          ? "text-warning"
          : "text-success";
      case "flame":
        return value > 0 ? "text-danger" : "text-success";
      default:
        return "text-success";
    }
  };

  getChangeIndicator = (type, value) => {
    // Simuler le changement basé sur les données précédentes
    const history =
      this.state.dataHistory[type === "flame" ? "flameIntensity" : type];
    if (history && history.length > 1) {
      const current = value;
      const previous = history[history.length - 2]?.value || 0;
      const change = current - previous;

      if (change > 0) {
        return { text: `+${change.toFixed(1)}`, class: "text-success" };
      } else if (change < 0) {
        return { text: `${change.toFixed(1)}`, class: "text-danger" };
      }
    }
    return { text: "0", class: "text-muted" };
  };

  prepareChartData = (dataKey, label, color) => {
    const history = this.state.dataHistory[dataKey] || [];
    const labels = history.slice(-10).map((item) => item.time);
    const data = history.slice(-10).map((item) => item.value);

    return {
      labels: labels,
      datasets: [
        {
          label: label,
          data: data,
          borderColor: color,
          backgroundColor: color
            .replace("rgb(", "rgba(")
            .replace(")", ", 0.2)"),
          fill: true,
          tension: 0.4,
        },
      ],
    };
  };

  transactionHistoryData = {
    labels: ["Paypal", "Stripe", "Cash"],
    datasets: [
      {
        data: [55, 25, 20],
        backgroundColor: ["#111111", "#00d25b", "#ffab00"],
      },
    ],
  };

  transactionHistoryOptions = {
    responsive: true,
    maintainAspectRatio: true,
    segmentShowStroke: false,
    cutoutPercentage: 70,
    elements: {
      arc: {
        borderWidth: 0,
      },
    },
    legend: {
      display: false,
    },
    tooltips: {
      enabled: true,
    },
  };

  sliderSettings = {
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
  };

  toggleProBanner() {
    document.querySelector(".proBanner").classList.toggle("hide");
  }

  render() {
    const { sensorData, isLoading, error, connectionStatus } = this.state;

    if (isLoading) {
      return (
        <div className="text-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Chargement...</span>
          </div>
          <p className="mt-3">Récupération des données...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="alert alert-danger m-3">
          <h4>Erreur de connexion</h4>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={this.fetchSensorData}>
            Réessayer
          </button>
        </div>
      );
    }

    const humidityChange = this.getChangeIndicator(
      "humidity",
      sensorData.humidity
    );
    const temperatureChange = this.getChangeIndicator(
      "temperature",
      sensorData.temperature
    );
    const waterLevelChange = this.getChangeIndicator(
      "waterLevel",
      sensorData.waterLevel
    );
    const flameChange = this.getChangeIndicator("flame", sensorData.flameCount);

    return (
      <div>
        {/* Indicateur de connexion */}
        <div className="row mb-3">
          <div className="col-12">
            <div
              className={`alert ${
                connectionStatus === "Connecté"
                  ? "alert-success"
                  : "alert-warning"
              } d-flex justify-content-between align-items-center`}
            >
              <span>
                <strong>État de connexion:</strong> {connectionStatus}
                {sensorData.timestamp && (
                  <span className="ml-3">
                    <small>
                      Dernière mise à jour:{" "}
                      {this.formatTimestamp(sensorData.timestamp)}
                    </small>
                  </span>
                )}
              </span>
              <button
                className="btn btn-sm btn-outline-dark"
                onClick={this.fetchSensorData}
              >
                Actualiser
              </button>
            </div>
          </div>
        </div>

        <div className="row">
          {/* HUMIDITÉ */}
          <div className="col-xl-3 col-sm-6 grid-margin stretch-card">
            <div className="card">
              <div className="card-body">
                <div className="row">
                  <div className="col-9">
                    <div className="d-flex align-items-center align-self-start">
                      <h3
                        className={`mb-0 ${this.getStatusColor(
                          "humidity",
                          sensorData.humidity
                        )}`}
                      >
                        {sensorData.humidity.toFixed(1)}%
                      </h3>
                      <p
                        className={`ml-2 mb-0 font-weight-medium ${humidityChange.class}`}
                      >
                        {humidityChange.text}%
                      </p>
                    </div>
                    <p className="text-muted">
                      Pourcentage : {sensorData.humidity.toFixed(1)}%
                    </p>
                  </div>
                  <div className="col-3">
                    <div className="icon icon-box-success">
                      <span className="mdi mdi-water-percent icon-item"></span>
                    </div>
                  </div>
                </div>
                <h6 className="text-muted font-weight-normal">HUMIDITÉ</h6>
              </div>
            </div>
          </div>

          {/* TEMPÉRATURE */}
          <div className="col-xl-3 col-sm-6 grid-margin stretch-card">
            <div className="card">
              <div className="card-body">
                <div className="row">
                  <div className="col-9">
                    <div className="d-flex align-items-center align-self-start">
                      <h3
                        className={`mb-0 ${this.getStatusColor(
                          "temperature",
                          sensorData.temperature
                        )}`}
                      >
                        {sensorData.temperature.toFixed(1)}°C
                      </h3>
                      <p
                        className={`ml-2 mb-0 font-weight-medium ${temperatureChange.class}`}
                      >
                        {temperatureChange.text}°C
                      </p>
                    </div>
                    <p className="text-muted">Température actuelle</p>
                  </div>
                  <div className="col-3">
                    <div className="icon icon-box-success">
                      <span className="mdi mdi-thermometer icon-item"></span>
                    </div>
                  </div>
                </div>
                <h6 className="text-muted font-weight-normal">TEMPÉRATURE</h6>
              </div>
            </div>
          </div>

          {/* Niveau d'eau dans le réservoir */}
          <div className="col-xl-3 col-sm-6 grid-margin stretch-card">
            <div className="card">
              <div className="card-body">
                <div className="row">
                  <div className="col-9">
                    <div className="d-flex align-items-center align-self-start">
                      <h3
                        className={`mb-0 ${this.getStatusColor(
                          "waterLevel",
                          sensorData.waterLevel
                        )}`}
                      >
                        {sensorData.waterLevel.toFixed(0)}%
                      </h3>
                      <p
                        className={`ml-2 mb-0 font-weight-medium ${waterLevelChange.class}`}
                      >
                        {waterLevelChange.text}%
                      </p>
                    </div>
                    <p className="text-muted">
                      Niveau : {sensorData.waterLevel.toFixed(0)}%
                    </p>
                  </div>
                  <div className="col-3">
                    <div className="icon icon-box-success">
                      <span className="mdi mdi-water icon-item"></span>
                    </div>
                  </div>
                </div>
                <h6 className="text-muted font-weight-normal">
                  Niveau d'eau dans le réservoir
                </h6>
              </div>
            </div>
          </div>

          {/* Nombre de flammes détectées */}
          <div className="col-xl-3 col-sm-6 grid-margin stretch-card">
            <div className="card">
              <div className="card-body">
                <div className="row">
                  <div className="col-9">
                    <div className="d-flex align-items-center align-self-start">
                      <h3
                        className={`mb-0 ${this.getStatusColor(
                          "flame",
                          sensorData.flameCount
                        )}`}
                      >
                        {sensorData.flameCount}
                      </h3>
                      <p
                        className={`ml-2 mb-0 font-weight-medium ${flameChange.class}`}
                      >
                        {flameChange.text}
                      </p>
                    </div>
                    <p className="text-muted">
                      {sensorData.flameCount > 0
                        ? "ALERTE DÉTECTÉE"
                        : "Aucune détection"}
                    </p>
                  </div>
                  <div className="col-3">
                    <div
                      className={`icon ${
                        sensorData.flameCount > 0
                          ? "icon-box-danger"
                          : "icon-box-success"
                      }`}
                    >
                      <span className="mdi mdi-fire icon-item"></span>
                    </div>
                  </div>
                </div>
                <h6 className="text-muted font-weight-normal">
                  Nombre de flammes détectées
                </h6>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-4 grid-margin stretch-card">
            <div className="card">
              <div className="card-body">
                <h4 className="card-title">Analyse des Risques</h4>

                {/* Première courbe : Niveau d'eau */}
                <div className="aligner-wrapper">
                  <Line
                    data={this.prepareChartData(
                      "waterLevel",
                      "Niveau d'eau (%)",
                      "rgb(31, 119, 180)"
                    )}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { position: "top" },
                        title: {
                          display: true,
                          text: "Courbe de niveau d'eau",
                        },
                      },
                      scales: {
                        y: {
                          title: { display: true, text: "Pourcentage (%)" },
                        },
                        x: {
                          title: { display: true, text: "Temps (heures)" },
                        },
                      },
                    }}
                  />
                  <div className="absolute center-content">
                    <h5 className="font-weight-normal text-white text-center mb-2">
                      {sensorData.waterLevel.toFixed(0)}%
                    </h5>
                    <p className="text-small text-muted text-center mb-0">
                      Niveau actuel
                    </p>
                  </div>
                </div>

                <div className="bg-gray-dark d-flex d-md-block d-xl-flex flex-row py-3 px-4 px-md-3 px-xl-4 rounded mt-3">
                  <div className="text-md-center text-xl-left">
                    <h6 className="mb-1">Capteur Niveau</h6>
                    <p className="text-muted mb-0">
                      {this.formatTimestamp(sensorData.timestamp)}
                    </p>
                  </div>
                  <div className="align-self-center flex-grow text-right text-md-center text-xl-right py-md-2 py-xl-0">
                    <h6 className="font-weight-bold mb-0">
                      {sensorData.waterLevel.toFixed(0)}%
                    </h6>
                  </div>
                </div>

                {/* Deuxième courbe : Flamme */}
                <div className="aligner-wrapper mt-4">
                  <Line
                    data={this.prepareChartData(
                      "flameIntensity",
                      "Intensité de flamme",
                      "rgb(214, 39, 40)"
                    )}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { position: "top" },
                        title: {
                          display: true,
                          text: "Valeur détectée par le capteur de flamme",
                        },
                      },
                      scales: {
                        y: {
                          title: { display: true, text: "Intensité (unités)" },
                        },
                        x: {
                          title: { display: true, text: "Temps (heures)" },
                        },
                      },
                    }}
                  />
                  <div className="absolute center-content">
                    <h5 className="font-weight-normal text-white text-center mb-2">
                      {sensorData.flameCount}
                    </h5>
                    <p className="text-small text-muted text-center mb-0">
                      Valeur actuelle
                    </p>
                  </div>
                </div>

                <div className="bg-gray-dark d-flex d-md-block d-xl-flex flex-row py-3 px-4 px-md-3 px-xl-4 rounded mt-3">
                  <div className="text-md-center text-xl-left">
                    <h6 className="mb-1">Capteur Flamme</h6>
                    <p className="text-muted mb-0">
                      {this.formatTimestamp(sensorData.timestamp)}
                    </p>
                  </div>
                  <div className="align-self-center flex-grow text-right text-md-center text-xl-right py-md-2 py-xl-0">
                    <h6 className="font-weight-bold mb-0">
                      {sensorData.flameCount}
                    </h6>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-8 grid-margin stretch-card">
            <LiveVideoInterface />
          </div>
        </div>

        <div className="row ">
          <div className="col-12 grid-margin">
            <div className="card">
              <div className="card-body">
                <h4 className="card-title">Informations Citoyens</h4>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>
                          <div className="form-check form-check-muted m-0">
                            <label className="form-check-label">
                              <input
                                type="checkbox"
                                className="form-check-input"
                              />
                              <i className="input-helper"></i>
                            </label>
                          </div>
                        </th>
                        <th> Nom & Prénom </th>
                        <th> N° Carte Nationale </th>
                        <th> N° Passeport </th>
                        <th> Nationalité </th>
                        <th> Adresse </th>
                        <th> État </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <div className="form-check form-check-muted m-0">
                            <label className="form-check-label">
                              <input
                                type="checkbox"
                                className="form-check-input"
                              />
                              <i className="input-helper"></i>
                            </label>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex">
                            <img
                              src={require("../../assets/images/faces/face1.jpg")}
                              alt="face"
                            />
                            <span className="pl-2">Henry Klein</span>
                          </div>
                        </td>
                        <td> AA123456 </td>
                        <td> P987654 </td>
                        <td> Marocaine </td>
                        <td> Rabat, Maroc </td>
                        <td>
                          <span style={{ color: "red", fontWeight: "bold" }}>
                            Recherche
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <div className="form-check form-check-muted m-0">
                            <label className="form-check-label">
                              <input
                                type="checkbox"
                                className="form-check-input"
                              />
                              <i className="input-helper"></i>
                            </label>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex">
                            <img
                              src={require("../../assets/images/faces/face2.jpg")}
                              alt="face"
                            />
                            <span className="pl-2">Estella Bryan</span>
                          </div>
                        </td>
                        <td> BB654321 </td>
                        <td> P123456 </td>
                        <td> Marocaine </td>
                        <td> Casablanca, Maroc </td>
                        <td>
                          <span style={{ color: "red", fontWeight: "bold" }}>
                            Recherche
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <div className="form-check form-check-muted m-0">
                            <label className="form-check-label">
                              <input
                                type="checkbox"
                                className="form-check-input"
                              />
                              <i className="input-helper"></i>
                            </label>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex">
                            <img
                              src={require("../../assets/images/faces/face5.jpg")}
                              alt="face"
                            />
                            <span className="pl-2">Lucy Abbott</span>
                          </div>
                        </td>
                        <td> CC789012 </td>
                        <td> P789012 </td>
                        <td> Marocaine </td>
                        <td> Marrakech, Maroc </td>
                        <td>
                          <span style={{ color: "red", fontWeight: "bold" }}>
                            Recherche
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <div className="form-check form-check-muted m-0">
                            <label className="form-check-label">
                              <input
                                type="checkbox"
                                className="form-check-input"
                              />
                              <i className="input-helper"></i>
                            </label>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex">
                            <img
                              src={require("../../assets/images/faces/face3.jpg")}
                              alt="face"
                            />
                            <span className="pl-2">Peter Gill</span>
                          </div>
                        </td>
                        <td> DD345678 </td>
                        <td> P456789 </td>
                        <td> Marocaine </td>
                        <td> Fès, Maroc </td>
                        <td>
                          <span style={{ color: "red", fontWeight: "bold" }}>
                            Recherche
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <div className="form-check form-check-muted m-0">
                            <label className="form-check-label">
                              <input
                                type="checkbox"
                                className="form-check-input"
                              />
                              <i className="input-helper"></i>
                            </label>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex">
                            <img
                              src={require("../../assets/images/faces/face4.jpg")}
                              alt="face"
                            />
                            <span className="pl-2">Sallie Reyes</span>
                          </div>
                        </td>
                        <td> EE901234 </td>
                        <td> P012345 </td>
                        <td> Marocaine </td>
                        <td> Agadir, Maroc </td>
                        <td>
                          <span style={{ color: "red", fontWeight: "bold" }}>
                            Recherche
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Dashboard;
