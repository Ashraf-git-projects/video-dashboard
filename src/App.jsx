// src/App.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import VideoPlayer from "./components/VideoPlayer";
import "./index.css";

// Local streams: when running on your machine with FFmpeg + Express
const LOCAL_STREAMS = [
  { id: 1, name: "Stream 1", url: "http://localhost:8000/stream1/stream1.m3u8" },
  { id: 2, name: "Stream 2", url: "http://localhost:8000/stream2/stream2.m3u8" },
  { id: 3, name: "Stream 3", url: "http://localhost:8000/stream3/stream3.m3u8" },
  { id: 4, name: "Stream 4", url: "http://localhost:8000/stream4/stream4.m3u8" },
  { id: 5, name: "Stream 5", url: "http://localhost:8000/stream5/stream5.m3u8" },
];

// Remote demo streams: when deployed on Vercel (so reviewers see real playback)
const REMOTE_STREAMS = [
  {
    id: 1,
    name: "Stream 1",
    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    id: 2,
    name: "Stream 2",
    url: "https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8",
  },
  {
    id: 3,
    name: "Stream 3",
    url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
  },
  {
    id: 4,
    name: "Stream 4",
    url: "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8",
  },
  {
    id: 5,
    name: "Stream 5",
    url: "https://mnmedias.api.telequebec.tv/m3u8/29880.m3u8",
  },
];

// sync tuning
const SYNC_INTERVAL_MS = 300;
const HARD_DESYNC_THRESHOLD = 0.5;
const SOFT_DESYNC_THRESHOLD = 0.08;
const MAX_RATE_OFFSET = 0.08;

function App() {
  const playerRefs = useRef([]);
  const [masterIndex, setMasterIndex] = useState(0);
  const [syncEnabled, setSyncEnabled] = useState(true);

  // decide which streams to use based on hostname
  const isBrowser = typeof window !== "undefined";
  const isLocalHost =
    isBrowser &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");
  const STREAMS = isLocalHost ? LOCAL_STREAMS : REMOTE_STREAMS;
  const sourceLabel = isLocalHost
    ? "Local RTSP → HLS (simulated)"
    : "Public demo HLS streams";

  const getVideoAt = useCallback((idx) => {
    const inst = playerRefs.current[idx];
    if (!inst || !inst.video) return null;
    const v = inst.video;
    if (!v || typeof v.currentTime !== "number") return null;
    return v;
  }, []);

  useEffect(() => {
    if (!syncEnabled) return;

    const timer = setInterval(() => {
      const masterVideo = getVideoAt(masterIndex);
      if (!masterVideo || masterVideo.readyState < 2) return;

      const masterTime = masterVideo.currentTime;

      STREAMS.forEach((_, index) => {
        if (index === masterIndex) return;
        const v = getVideoAt(index);
        if (!v || v.readyState < 2) return;

        const offset = v.currentTime - masterTime;

        if (Math.abs(offset) > HARD_DESYNC_THRESHOLD) {
          try {
            v.currentTime = masterTime;
            v.playbackRate = 1.0;
          } catch {
            /* noop */
          }
          return;
        }

        if (Math.abs(offset) > SOFT_DESYNC_THRESHOLD) {
          const adjust = -offset * 0.5;
          let targetRate = 1.0 + adjust;

          const minRate = 1 - MAX_RATE_OFFSET;
          const maxRate = 1 + MAX_RATE_OFFSET;
          if (targetRate < minRate) targetRate = minRate;
          if (targetRate > maxRate) targetRate = maxRate;

          v.playbackRate = targetRate;
        } else if (v.playbackRate !== 1.0) {
          v.playbackRate = 1.0;
        }
      });
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [syncEnabled, masterIndex, getVideoAt, STREAMS]);

  const handleToggleSync = () => {
    setSyncEnabled((prev) => {
      if (prev) {
        STREAMS.forEach((_, idx) => {
          const v = getVideoAt(idx);
          if (v) v.playbackRate = 1.0;
        });
      }
      return !prev;
    });
  };

  const handleSetMaster = (idx) => setMasterIndex(idx);

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background:
          "radial-gradient(circle at top, #0f172a 0, #020617 42%, #000 100%)",
        padding: "24px 16px",
        boxSizing: "border-box",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          borderRadius: 18,
          padding: 18,
          boxSizing: "border-box",
          background:
            "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(3,7,18,0.98))",
          boxShadow:
            "0 22px 60px rgba(0,0,0,0.75), 0 0 0 1px rgba(148,163,184,0.15)",
          border: "1px solid rgba(30,64,175,0.6)",
          backdropFilter: "blur(12px)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: "1px solid rgba(30,64,175,0.35)",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "3px 9px",
                borderRadius: 999,
                border: "1px solid rgba(56,189,248,0.7)",
                background: "rgba(15,23,42,0.85)",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "999px",
                  background: "#22c55e",
                  boxShadow: "0 0 8px rgba(34,197,94,0.9)",
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#e0f2fe",
                }}
              >
                Live Monitor
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 26,
                letterSpacing: "0.03em",
              }}
            >
              Multi-Stream Video Dashboard
            </h1>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 13,
                color: "#9ca3af",
                maxWidth: 560,
              }}
            >
              Synchronized playback for 5 HLS streams derived from a single
              source. One stream acts as master while others continuously align
              to its timeline.
            </p>
          </div>

          {/* Right controls */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 10,
              minWidth: 220,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              {/* Sync pill */}
              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: syncEnabled
                    ? "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(22,163,74,0.05))"
                    : "rgba(15,23,42,0.85)",
                  border: `1px solid ${
                    syncEnabled
                      ? "rgba(34,197,94,0.7)"
                      : "rgba(148,163,184,0.7)"
                  }`,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "999px",
                    background: syncEnabled ? "#22c55e" : "#9ca3af",
                    boxShadow: syncEnabled
                      ? "0 0 8px rgba(34,197,94,0.9)"
                      : "none",
                  }}
                />
                <span
                  style={{
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Sync
                </span>
                <button
                  onClick={handleToggleSync}
                  style={{
                    marginLeft: 4,
                    padding: "2px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    border: "none",
                    cursor: "pointer",
                    background: syncEnabled ? "#0f172a" : "#111827",
                    color: "#e5e7eb",
                  }}
                >
                  {syncEnabled ? "Disable" : "Enable"}
                </button>
              </div>

              {/* Master dropdown */}
              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "rgba(15,23,42,0.9)",
                  border: "1px solid rgba(55,65,81,0.9)",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ color: "#9ca3af" }}>Master:</span>
                <select
                  value={masterIndex}
                  onChange={(e) => handleSetMaster(Number(e.target.value))}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#e5e7eb",
                    fontSize: 12,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  {STREAMS.map((s, idx) => (
                    <option
                      key={s.id}
                      value={idx}
                      style={{ background: "#020617", color: "#f9fafb" }}
                    >
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Small stats bar */}
            <div
              style={{
                display: "flex",
                gap: 12,
                fontSize: 11,
                color: "#9ca3af",
              }}
            >
              <div>
                <div style={{ fontWeight: 500 }}>Streams</div>
                <div style={{ fontVariantNumeric: "tabular-nums" }}>
                  {STREAMS.length.toString().padStart(2, "0")}
                </div>
              </div>
              <div
                style={{
                  width: 1,
                  background: "rgba(75,85,99,0.7)",
                }}
              />
              <div>
                <div style={{ fontWeight: 500 }}>Source</div>
                <div>{sourceLabel}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Grid */}
        <main
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 14,
            paddingTop: 4,
          }}
        >
          {STREAMS.map((stream, index) => {
            const isMaster = index === masterIndex;
            return (
              <div
                key={stream.id}
                style={{
                  background:
                    "radial-gradient(circle at top left, #1f2937 0, #020617 58%)",
                  borderRadius: 14,
                  padding: 8,
                  boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 230,
                  border: isMaster
                    ? "1px solid rgba(34,197,94,0.85)"
                    : "1px solid rgba(148,163,184,0.35)",
                  transition:
                    "transform 120ms ease-out, box-shadow 120ms ease-out, border-color 120ms ease-out",
                  transform: isMaster ? "translateY(-2px)" : "none",
                }}
              >
                {/* Tile header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "999px",
                        background: isMaster ? "#22c55e" : "#3b82f6",
                        boxShadow: isMaster
                          ? "0 0 8px rgba(34,197,94,0.9)"
                          : "0 0 6px rgba(59,130,246,0.9)",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {stream.name}
                    </span>
                    {isMaster && (
                      <span
                        style={{
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: "0.12em",
                          padding: "1px 7px",
                          borderRadius: 999,
                          border: "1px solid rgba(34,197,94,0.8)",
                          color: "#bbf7d0",
                          background: "rgba(22,101,52,0.25)",
                        }}
                      >
                        Master
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    ID: {stream.id.toString().padStart(2, "0")}
                  </span>
                </div>

                {/* Video */}
                <div
                  style={{
                    flex: 1,
                    minHeight: 185,
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "#000",
                    border: "1px solid rgba(15,23,42,0.9)",
                  }}
                >
                  <VideoPlayer
                    ref={(instance) => {
                      playerRefs.current[index] = instance;
                    }}
                    url={stream.url}
                    muted={true}
                    autoPlay={true}
                    controls={true}
                    onReady={() => {}}
                  />
                </div>
              </div>
            );
          })}
        </main>
      </div>
    </div>
  );
}

export default App;
