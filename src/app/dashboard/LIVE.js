import React, { useState, useEffect, useRef } from "react";

const LiveVideoInterface = () => {
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("Connexion…");
  const videoRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  /* CHANGE ICI pour tester l’un ou l’autre flux */
  // const STREAM_URL = "https://www.youtube.com/watch?v=kxGR1HKJE6Y";
  const STREAM_URL = "https://www.youtube.com/watch?v=aremtLiMD8U"; // <- ESP32‑CAM MJPEG
  const RETRY_DELAY = 5000; // ms

  /* ───────────────────────── Helpers ───────────────────────── */
  const isYouTube = (url) =>
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)/.test(url);

  const toEmbedURL = (url) => {
    const id = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1] || "";
    return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1`;
  };

  // Heuristique très simple : « /stream » => MJPEG
  const isMJPEG = (url) => /\/stream$/.test(url);

  /* ────────────────────── Nettoyage onUnmount ───────────────── */
  useEffect(() => () => clearTimeout(retryTimeoutRef.current), []);

  /* ────────────────────── Callbacks vidéo / img ─────────────── */
  const handleLoadStart = () => {
    setVideoError(false);
    setIsLoading(true);
    setConnectionStatus("Chargement…");
  };

  const handleLoad = () => {
    setVideoError(false);
    setIsLoading(false);
    setConnectionStatus("Connecté");
  };

  const handleError = (e) => {
    console.error("Erreur media :", e);
    setVideoError(true);
    setIsLoading(false);
    setConnectionStatus("Erreur de connexion");

    retryTimeoutRef.current = setTimeout(retryConnection, RETRY_DELAY);
  };

  const retryConnection = () => {
    setVideoError(false);
    setIsLoading(true);
    setConnectionStatus("Reconnexion…");

    if (isMJPEG(STREAM_URL)) {
      /* Forcer <img> à se recharger : on ajoute un cache‑buster */
      const img = document.getElementById("live-img");
      if (img) img.src = `${STREAM_URL}?t=${Date.now()}`;
    } else {
      /* Pour <video> */
      videoRef.current?.load?.();
    }
  };

  const handleManualRetry = () => {
    clearTimeout(retryTimeoutRef.current);
    retryConnection();
  };

  /* ──────────────────────── Rendu ──────────────────────────── */
  return (
    <div className="col-md-12 grid-margin stretch-card">
      <div className="card border-danger shadow">
        <div className="card-body">
          {/* ---------- En‑tête ---------- */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="card-title text-danger mb-0 d-flex align-items-center">
              <i
                className="mdi mdi-video-wireless mr-2"
                style={{ fontSize: "1.5rem" }}
              ></i>
              Flux Vidéo Sécurité
            </h4>
            <div className="d-flex align-items-center">
              <span
                className={`badge mr-2 ${
                  videoError
                    ? "badge-secondary"
                    : isLoading
                    ? "badge-warning"
                    : "badge-success"
                } ${!videoError && !isLoading ? "animated-blink" : ""}`}
              >
                {videoError
                  ? "🔴 Déconnecté"
                  : isLoading
                  ? "🟡 Chargement…"
                  : "🟢 En direct"}
              </span>
              <small className="text-muted">{connectionStatus}</small>
            </div>
          </div>

          {/* ---------- Zone média ---------- */}
          <div
            className="embed-responsive embed-responsive-16by9 border border-danger rounded"
            style={{ background: "#111", position: "relative" }}
          >
            {videoError ? (
              /* ====== Affichage d’erreur ====== */
              <div className="d-flex flex-column justify-content-center align-items-center h-100 p-4">
                <div className="text-center text-white mb-3">
                  <i
                    className="mdi mdi-wifi-off"
                    style={{ fontSize: "3rem" }}
                  ></i>
                  <h5 className="mt-2">Connexion interrompue</h5>
                  <p className="mb-3">
                    Impossible de se connecter au flux vidéo
                    <br />
                    <small className="text-muted">URL: {STREAM_URL}</small>
                  </p>
                </div>
                <button
                  className="btn btn-outline-light btn-sm"
                  onClick={handleManualRetry}
                >
                  <i className="mdi mdi-refresh mr-1"></i>Réessayer
                </button>
              </div>
            ) : (
              <>
                {/* ====== Overlay de chargement ====== */}
                {isLoading && (
                  <div
                    className="position-absolute d-flex justify-content-center align-items-center"
                    style={{
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: "rgba(0,0,0,0.7)",
                      zIndex: 2,
                    }}
                  >
                    <div className="text-center text-white">
                      <div
                        className="spinner-border text-light mb-2"
                        role="status"
                      >
                        <span className="sr-only">Chargement…</span>
                      </div>
                      <p>Connexion au flux vidéo…</p>
                    </div>
                  </div>
                )}

                {/* ====== Sélecteur YouTube / MJPEG / Video ====== */}
                {isYouTube(STREAM_URL) ? (
                  /* --- YouTube --- */
                  <iframe
                    title="YouTube stream"
                    src={toEmbedURL(STREAM_URL)}
                    className="embed-responsive-item rounded"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    onLoad={handleLoad}
                    onError={handleError}
                    style={{ width: "100%", height: "100%", border: 0 }}
                  />
                ) : isMJPEG(STREAM_URL) ? (
                  /* --- MJPEG (ESP32) : <img> --- */
                  <img
                    id="live-img"
                    src={STREAM_URL}
                    alt="Flux MJPEG"
                    className="embed-responsive-item rounded"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    onLoad={handleLoad}
                    onError={handleError}
                  />
                ) : (
                  /* --- MP4 / HLS / autre --- */
                  <video
                    ref={videoRef}
                    className="embed-responsive-item rounded"
                    autoPlay
                    muted
                    playsInline
                    controls={false}
                    onLoadStart={handleLoadStart}
                    onLoadedData={handleLoad}
                    onCanPlay={handleLoad}
                    onError={handleError}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  >
                    <source src={STREAM_URL} type="video/mp4" />
                    <source src={STREAM_URL} type="application/x-mpegURL" />
                    Votre navigateur ne supporte pas la lecture vidéo.
                  </video>
                )}
              </>
            )}
          </div>

          {/* ---------- Debug ---------- */}
          <div className="mt-3">
            <small className="text-muted">
              <strong>Diagnostic :</strong>
              <br />• URL du flux : {STREAM_URL}
              <br />• Statut : {connectionStatus}
              <br />• Navigateur : {navigator.userAgent.split(" ")[0]}
            </small>
          </div>
        </div>
      </div>

      {/* ---------- Styles internes ---------- */}
      <style jsx>{`
        .animated-blink {
          animation: blink 2s linear infinite;
        }
        @keyframes blink {
          0%,
          50% {
            opacity: 1;
          }
          51%,
          100% {
            opacity: 0.5;
          }
        }
        .spinner-border {
          width: 2rem;
          height: 2rem;
        }
      `}</style>
    </div>
  );
};

export default LiveVideoInterface;
