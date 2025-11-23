// src/App.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import VideoPlayer from "./components/VideoPlayer";
import "./index.css";

const STREAMS = [
  { id: 1, name: "Stream 1", url: "http://localhost:8000/stream1/stream1.m3u8" },
  { id: 2, name: "Stream 2", url: "http://localhost:8000/stream2/stream2.m3u8" },
  { id: 3, name: "Stream 3", url: "http://localhost:8000/stream3/stream3.m3u8" },
  { id: 4, name: "Stream 4", url: "http://localhost:8000/stream4/stream4.m3u8" },
  { id: 5, name: "Stream 5", url: "http://localhost:8000/stream5/stream5.m3u8" },
];

// sync tuning
const SYNC_INTERVAL_MS = 300;       // how often to check offsets
const HARD_DESYNC_THRESHOLD = 0.5;  // seconds (hard seek if beyond this)
const SOFT_DESYNC_THRESHOLD = 0.08; // seconds (small rate tweak if beyond this)
const MAX_RATE_OFFSET = 0.08;       // +/- around 1.0

function App() {
  const playerRefs = useRef([]);
  const [masterIndex, setMasterIndex] = useState(0);
  const [syncEnabled, setSyncEnabled] = useState(true);

  // helper to get safe video element
  const getVideoAt = useCallback((idx) => {
    const inst = playerRefs.current[idx];
    if (!inst || !inst.video) return null;
    const v = inst.video;
    if (!v || typeof v.currentTime !== "number") return null;
    return v;
  }, []);

  // core sync effect
  useEffect(() => {
    if (!syncEnabled) return;

    const timer = setInterval(() => {
      const masterVideo = getVideoAt(masterIndex);
      if (!masterVideo) return;

      // wait until master has some data
      if (masterVideo.readyState < 2) return;

      const masterTime = masterVideo.currentTime;

      STREAMS.forEach((_, index) => {
        if (index === masterIndex) return;
        const v = getVideoAt(index);
        if (!v) return;
        if (v.readyState < 2) return;

        const offset = v.currentTime - masterTime; // positive = ahead of master

        // hard resync if badly out of sync
        if (Math.abs(offset) > HARD_DESYNC_THRESHOLD) {
          try {
            v.currentTime = masterTime;
            v.playbackRate = 1.0;
          } catch (e) {
            
          }
          return;
        }

        if (Math.abs(offset) > SOFT_DESYNC_THRESHOLD) {
          const adjust = -offset * 0.5; // small proportional correction
          let targetRate = 1.0 + adjust;

          // clamp
          const minRate = 1 - MAX_RATE_OFFSET;
          const maxRate = 1 + MAX_RATE_OFFSET;
          if (targetRate < minRate) targetRate = minRate;
          if (targetRate > maxRate) targetRate = maxRate;

          v.playbackRate = targetRate;
        } else {
          // in sync, normal speed
          if (v.playbackRate !== 1.0) v.playbackRate = 1.0;
        }
      });
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [syncEnabled, masterIndex, getVideoAt]);

  const handleToggleSync = () => {
    setSyncEnabled((prev) => {
      // reset all rates when turning off
      if (prev) {
        STREAMS.forEach((_, idx) => {
          const v = getVideoAt(idx);
          if (v) v.playbackRate = 1.0;
        });
      }
      return !prev;
    });
  };

  const handleSetMaster = (idx) => {
    setMasterIndex(idx);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050810",
        color: "#f5f5f5",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "24px",
              letterSpacing: "0.03em",
            }}
          >
            Multi-Stream Video Dashboard
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "13px",
              color: "#9ca3af",
              maxWidth: "520px",
            }}
          >
            Synchronized playback for 5 HLS streams generated from a single
            source (simulated via sample.mp4). One stream acts as master;
            others follow its timeline.
          </p>
        </div>

        {/* Controls */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              padding: "6px 10px",
              borderRadius: "999px",
              background: syncEnabled
                ? "rgba(34,197,94,0.12)"
                : "rgba(148,163,184,0.18)",
              border: `1px solid ${
                syncEnabled ? "rgba(34,197,94,0.6)" : "rgba(148,163,184,0.7)"
              }`,
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "999px",
                background: syncEnabled ? "#22c55e" : "#9ca3af",
                boxShadow: syncEnabled
                  ? "0 0 8px rgba(34,197,94,0.8)"
                  : "none",
              }}
            />
            <span
              style={{
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Sync
            </span>
            <button
              onClick={handleToggleSync}
              style={{
                marginLeft: 4,
                padding: "2px 10px",
                borderRadius: "999px",
                fontSize: "11px",
                border: "none",
                cursor: "pointer",
                background: syncEnabled ? "#0f172a" : "#111827",
                color: "#e5e7eb",
              }}
            >
              {syncEnabled ? "Disable" : "Enable"}
            </button>
          </div>

          <div
            style={{
              padding: "6px 10px",
              borderRadius: "999px",
              background: "rgba(15,23,42,0.9)",
              border: "1px solid rgba(55,65,81,0.9)",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span style={{ color: "#9ca3af" }}>Master stream:</span>
            <select
              value={masterIndex}
              onChange={(e) => handleSetMaster(Number(e.target.value))}
              style={{
                background: "transparent",
                border: "none",
                color: "#e5e7eb",
                fontSize: "12px",
                outline: "none",
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
      </header>

      {/* Grid */}
      <main
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "10px",
        }}
      >
        {STREAMS.map((stream, index) => {
          const isMaster = index === masterIndex;
          return (
            <div
              key={stream.id}
              style={{
                background:
                  "radial-gradient(circle at top, #1f2937 0, #020617 55%)",
                borderRadius: "10px",
                padding: "8px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
                display: "flex",
                flexDirection: "column",
                minHeight: "220px",
                border: isMaster
                  ? "1px solid rgba(34,197,94,0.7)"
                  : "1px solid rgba(148,163,184,0.35)",
              }}
            >
              {/* Tile header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "8px",
                      height: "8px",
                      borderRadius: "999px",
                      background: isMaster ? "#22c55e" : "#60a5fa",
                      boxShadow: isMaster
                        ? "0 0 8px rgba(34,197,94,0.8)"
                        : "0 0 6px rgba(59,130,246,0.7)",
                    }}
                  ></span>
                  <span style={{ fontSize: "13px", fontWeight: 500 }}>
                    {stream.name}
                  </span>
                  {isMaster && (
                    <span
                      style={{
                        fontSize: "10px",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        padding: "1px 6px",
                        borderRadius: "999px",
                        border: "1px solid rgba(34,197,94,0.7)",
                        color: "#bbf7d0",
                        background: "rgba(22,101,52,0.22)",
                      }}
                    >
                      Master
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: "11px",
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
                  minHeight: "180px",
                  borderRadius: "6px",
                  overflow: "hidden",
                  background: "#000",
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
                  onReady={() => {
                  }}
                />
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}

export default App;
