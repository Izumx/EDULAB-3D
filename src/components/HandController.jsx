import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export const HandController = ({ onHandUpdate }) => {
    const videoRef = useRef(null);
    const [status, setStatus] = useState("Initializing...");
    const [logs, setLogs] = useState([]);
    const handLandmarkerRef = useRef(null);
    const requestRef = useRef(null);

    const addLog = (msg) => {
        console.log(msg);
        setLogs(prev => [...prev, msg]);
    };

    useEffect(() => {
        let mounted = true;

        const setupMediaPipe = async () => {
            try {
                addLog("Checking dependencies...");

                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error("Browser API navigator.mediaDevices.getUserMedia not available. Ensure you are on HTTPS or localhost.");
                }

                addLog("Loading Vision Tasks...");
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
                );

                if (!mounted) return;
                addLog("Vision Tasks Loaded. Loading HandLandmarker Model...");

                handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numHands: 1
                });

                if (!mounted) return;
                addLog("Model Loaded. Starting Webcam...");
                await startWebcam();
                setStatus("Ready");
            } catch (err) {
                console.error("Error initializing MediaPipe:", err);
                addLog("ERROR: " + err.message);
                setStatus("Failed");
            }
        };

        setupMediaPipe();

        return () => {
            mounted = false;
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
            if (handLandmarkerRef.current) {
                handLandmarkerRef.current.close();
            }
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, []);

    const startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 }
            });
            addLog("Webcam stream acquired.");

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.addEventListener('loadeddata', () => {
                    addLog("Video data loaded. Starting prediction loop.");
                    predictWebcam();
                });
            }
        } catch (err) {
            console.error("Error accessing webcam:", err);
            addLog("CAMERA ERROR: " + err.message); // Likely permission denied or in use
            setStatus("Camera Error");
        }
    };

    const predictWebcam = () => {
        if (!handLandmarkerRef.current || !videoRef.current) return;

        let startTimeMs = performance.now();

        if (videoRef.current.currentTime > 0) {
            const result = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);

            if (result.landmarks && result.landmarks.length > 0) {
                const landmarks = result.landmarks[0];
                const indexTip = landmarks[8];
                const thumbTip = landmarks[4];
                const wrist = landmarks[0];

                // 1. Calculate Cursor Position (inverted X)
                const cursorX = (1 - indexTip.x) * window.innerWidth;
                const cursorY = indexTip.y * window.innerHeight;

                // 2. Pinch Detection
                const distance = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
                const isPinching = distance < 0.08;

                // 3. Rotation Logic
                const rotY = (wrist.x - 0.5) * Math.PI * 4;
                const rotX = (wrist.y - 0.5) * Math.PI * 4;

                onHandUpdate({
                    x: cursorX,
                    y: cursorY,
                    isPinching,
                    rotation: [rotX, rotY, 0]
                });
            }
        }

        requestRef.current = requestAnimationFrame(predictWebcam);
    };

    return (
        <div style={{ position: 'absolute', bottom: 20, right: 20, width: 240, height: 180, pointerEvents: 'none', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{
                width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.8)',
                borderRadius: 10,
                overflow: 'hidden',
                border: status === 'Failed' || status === 'Camera Error' ? '2px solid red' : '2px solid cyan',
                position: 'relative'
            }}>
                <video
                    ref={videoRef}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                    autoPlay
                    playsInline
                    muted
                />

                {/* Status Overlay */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    display: status === 'Ready' ? 'none' : 'flex',
                    flexDirection: 'column', padding: 10, overflowY: 'auto',
                    background: 'rgba(0,0,0,0.7)', color: '#0f0', fontFamily: 'monospace', fontSize: '10px'
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 5, color: 'white' }}>STATUS: {status}</div>
                    {logs.map((log, i) => (
                        <div key={i}>{log}</div>
                    ))}
                </div>
            </div>
            <div style={{ color: 'cyan', fontSize: '10px', marginTop: 5, textShadow: '0 0 5px cyan' }}>
                Hand Tracking v1.0
            </div>
        </div>
    );
};
