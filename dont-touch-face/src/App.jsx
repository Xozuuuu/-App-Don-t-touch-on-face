import { useEffect, useRef , useState} from "react";
import { initNotifications, notify } from '@mycv/f8-notification';
import "./App.css";
import { Howl } from "howler";
import soundURL from "./assets/hey_sondn.mp3";

import * as mobilenet from "@tensorflow-models/mobilenet";
import * as knnClassifier from "@tensorflow-models/knn-classifier";
import "@tensorflow/tfjs";

const DONT_TOUCH_LABEL = "not_touch";
const TOUCHED_LABEL = "touched";
const TRAINING_TIME = 50;
const TOUCHED_CONFIDENCE = 0.8;


var sound = new Howl ({
  src : [soundURL]
});


function App() {
  const videoRef = useRef(null);
  const soundRef = useRef(null);
  const canPlayAudio = useRef(true);
  const classifierRef = useRef(null);
  const mobilenetRef = useRef(null);
  const [touched , setTouched] = useState(false);
  const isRunning = useRef(false);
  const [status , setStatus ] = useState("Idle");
  const [confidences, setConfidence] = useState(0);

  

  const setupCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });

    videoRef.current.srcObject = stream;

    mobilenetRef.current = await mobilenet.load();
    classifierRef.current = knnClassifier.create();

    console.log("Setup Done!");

    initNotifications({ cooldown : 3000});
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

  const run = async () => {
  if (!isRunning.current) return;

  const embedding = mobilenetRef.current.infer(
    videoRef.current,
    true
  ); 

  const result = await classifierRef.current.predictClass(embedding);

  setConfidence(result.confidences[result.label] || 0);

  if (
    result.label === TOUCHED_LABEL &&
    result.confidences[result.label] > TOUCHED_CONFIDENCE
  ) {
    console.log('Touched');
    if (canPlayAudio.current) {
      canPlayAudio.current = false;
      sound.play();
    }
    notify('Dont touch', { body: '=))))))' });
    setTouched(true);
  } else {
    console.log('Un Touched');
    setTouched(false);
  }

  await sleep(200);
  run();
};


  const sleep = (ms = 0) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  useEffect(() => {
    sound.on('end' , function() {
      canPlayAudio.current = true;
    });

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
    <div className={`main ${touched ? 'touched' : ''}`}>
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
          onClick={() => {
            isRunning.current = true;
            run(
              setStatus("Running...")
            )}}
        >
          Run
        </button>
        
        <button
          className="btn"
          onClick={() => {
            isRunning.current = false;
            setStatus("Stopped !")
          }}
        >
          Stop
        </button>

        <p className="status">Status : {status}</p>

        <p>Confidence : {(confidences * 100).toFixed(1)}%</p>
      </div>
    </div>
  );
}

export default App;
