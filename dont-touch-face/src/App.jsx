import { useEffect, useRef } from "react";
import "./App.css";
import { Howl } from "howler";
import soundURL from "./assets/hey_sondn.mp3";

import * as mobilenet from "@tensorflow-models/mobilenet";
import * as knnClassifier from "@tensorflow-models/knn-classifier";
import "@tensorflow/tfjs";

const DONT_TOUCH_LABEL = "not_touch";
const TOUCHED_LABEL = "touched";
const TRAINING_TIME = 50;

function App() {
  const videoRef = useRef(null);
  const soundRef = useRef(null);
  const classifierRef = useRef(null);
  const mobilenetRef = useRef(null);

  const setupCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });

    videoRef.current.srcObject = stream;

    mobilenetRef.current = await mobilenet.load();
    classifierRef.current = knnClassifier.create();

    console.log("Setup Done!");
  };

  const train = async (label) => {
    if (!classifierRef.current || !mobilenetRef.current) return;

    console.log(`[${label}] Đang train...`);

    for (let i = 0; i < TRAINING_TIME; i++) {
      const embedding = mobilenetRef.current.infer(
        videoRef.current,
        true
      );

      classifierRef.current.addExample(embedding, label);

      console.log(
        `Training ${label}: ${Math.round(
          ((i + 1) / TRAINING_TIME) * 100
        )}%`
      );

      await sleep(100);
    }

    console.log(`[${label}] Train xong`);
  };

  const sleep = (ms = 0) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  useEffect(() => {
    setupCamera();

    soundRef.current = new Howl({
      src: [soundURL]
    });

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="main">
      <video
        className="video"
        ref={videoRef}
        autoPlay
        muted
        playsInline
      />

      <div className="control">
        <button className="btn" onClick={() => train(DONT_TOUCH_LABEL)}>
          Train 1 (Không chạm)
        </button>

        <button className="btn" onClick={() => train(TOUCHED_LABEL)}>
          Train 2 (Chạm mặt)
        </button>

        <button
          className="btn"
          onClick={() => soundRef.current?.play()}
        >
          Run
        </button>
      </div>
    </div>
  );
}

export default App;
