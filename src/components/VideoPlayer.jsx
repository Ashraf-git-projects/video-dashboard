// src/components/VideoPlayer.jsx
import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import Hls from "hls.js";

/**
 * Clean VideoPlayer using hls.js
 *
 * Props:
 *  - url: string (.m3u8)
 *  - muted: boolean
 *  - autoPlay: boolean
 *  - controls: boolean
 *  - onReady(videoEl): callback when playback is ready
 */
const VideoPlayer = forwardRef(
  ({ url, muted = true, autoPlay = true, controls = true, onReady }, ref) => {
    const videoRef = useRef(null);
    const hlsRef = useRef(null);

    // expose video + reload to parent
    useImperativeHandle(
      ref,
      () => ({
        video: videoRef.current,
        reload: () => {
          attachHls(); // re-attach source
        },
      }),
      []
    );

    const attachHls = () => {
      const video = videoRef.current;
      if (!video || !url) return;

      // cleanup previous
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch (e) {}
        hlsRef.current = null;
      }

      // Prefer hls.js whenever possible
      if (Hls.isSupported()) {
        const hls = new Hls({
          liveSyncDuration: 3,
          liveMaxLatencyDuration: 6,
          maxBufferLength: 30,
          enableWorker: true,
          lowLatencyMode: false,
          debug: false,
        });
        hlsRef.current = hls;

        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          try {
            video.muted = muted;
            if (autoPlay) {
              const p = video.play();
              if (p && p.catch) p.catch(() => {});
            }
          } catch (e) {
            console.error("Error auto-playing video:", e);
          }
          onReady && onReady(video);
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error("HLS error:", data);
          if (data && data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                try {
                  hls.destroy();
                } catch (e) {}
                hlsRef.current = null;
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Only used on real Safari
        video.src = url;
        video.addEventListener(
          "loadedmetadata",
          () => {
            try {
              video.muted = muted;
              if (autoPlay) {
                const p = video.play();
                if (p && p.catch) p.catch(() => {});
              }
            } catch (e) {
              console.error("Error auto-playing video:", e);
            }
            onReady && onReady(video);
          },
          { once: true }
        );
      } else {
        // Fallback: just set src (may not work everywhere)
        video.src = url;
      }
    };

    useEffect(() => {
      attachHls();
      return () => {
        if (hlsRef.current) {
          try {
            hlsRef.current.destroy();
          } catch (e) {}
          hlsRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);

    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <video
          ref={videoRef}
          controls={controls}
          muted={muted}
          autoPlay={autoPlay}
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            background: "#000",
          }}
        />
      </div>
    );
  }
);

export default VideoPlayer;
