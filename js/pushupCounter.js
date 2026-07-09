// Zaehlt Liegestuetze ueber den Ellbogenwinkel. MediaPipe wird per CDN als
// ES-Modul geladen (dynamischer import), der Rest ist normales Script.

const DOWN_ANGLE = 95;
const UP_ANGLE = 155;

function _angle(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  if (mag === 0) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

const _L = { shoulder: 11, elbow: 13, wrist: 15 };
const _R = { shoulder: 12, elbow: 14, wrist: 16 };

class PushupCounter {
  constructor(opts) {
    this.video = opts.video;
    this.canvas = opts.canvas;
    this.ctx = opts.canvas.getContext("2d");
    this.onCount = opts.onCount;
    this.onStatus = opts.onStatus;
    this.onComplete = opts.onComplete; // wird bei Erreichen des Ziels ausgeloest
    this.target = opts.target || 0; // Zielzahl
    this.count = 0;
    this.phase = "up";
    this.running = false;
    this.armed = false; // erst nach dem Countdown wird gezaehlt
    this.completed = false;
    this.landmarker = null;
  }

  // Gibt das Zaehlen frei (nach dem Countdown).
  arm() {
    this.armed = true;
  }

  async init() {
    if (this.onStatus) this.onStatus("Laedt Modell...");
    // MediaPipe als ES-Modul vom CDN holen.
    const vision = await import(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs"
    );
    const fileset = await vision.FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );
    this.landmarker = await vision.PoseLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
    });
  }

  async start() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: 640, height: 480 },
      audio: false,
    });
    this.video.srcObject = stream;
    await this.video.play();
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    this.running = true;
    if (this.onStatus) this.onStatus("Positionier dich seitlich zur Kamera.");
    this.loop();
  }

  stop() {
    this.running = false;
    const stream = this.video.srcObject;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    this.video.srcObject = null;
  }

  loop() {
    if (!this.running) return;
    const now = performance.now();
    const result = this.landmarker.detectForVideo(this.video, now);
    this.process(result);
    requestAnimationFrame(() => this.loop());
  }

  process(result) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!result.landmarks || result.landmarks.length === 0) {
      if (this.onStatus)
        this.onStatus("Kein Koerper erkannt. Geh weiter zurueck.");
      return;
    }
    const lm = result.landmarks[0];
    const leftVis =
      (lm[_L.shoulder] ? lm[_L.shoulder].visibility : 0) +
      (lm[_L.elbow] ? lm[_L.elbow].visibility : 0);
    const rightVis =
      (lm[_R.shoulder] ? lm[_R.shoulder].visibility : 0) +
      (lm[_R.elbow] ? lm[_R.elbow].visibility : 0);
    const side = leftVis >= rightVis ? _L : _R;
    const sh = lm[side.shoulder];
    const el = lm[side.elbow];
    const wr = lm[side.wrist];
    if (!sh || !el || !wr) {
      if (this.onStatus) this.onStatus("Arme nicht ganz im Bild.");
      return;
    }
    const a = _angle(sh, el, wr);
    this.drawSkeleton(lm, side, a);
    // Waehrend des Countdowns nur anzeigen, noch nicht zaehlen.
    if (!this.armed) {
      return;
    }
    if (this.phase === "up" && a < DOWN_ANGLE) {
      this.phase = "down";
      if (this.onStatus) this.onStatus("Runter, jetzt hoch druecken");
    } else if (this.phase === "down" && a > UP_ANGLE) {
      this.phase = "up";
      this.count++;
      if (this.onCount) this.onCount(this.count);
      // Ziel erreicht? Automatisch beenden und speichern.
      if (this.target > 0 && this.count >= this.target && !this.completed) {
        this.completed = true;
        if (this.onStatus) this.onStatus("Ziel erreicht!");
        this.stop();
        if (this.onComplete) this.onComplete(this.count);
        return;
      }
      if (this.onStatus) this.onStatus("Sauber! Weiter");
    } else {
      if (this.onStatus)
        this.onStatus(
          this.phase === "up" ? "Bereit, geh runter" : "Tiefer / hoch druecken"
        );
    }
  }

  drawSkeleton(lm, side, a) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const pts = [lm[side.shoulder], lm[side.elbow], lm[side.wrist]];
    ctx.strokeStyle = a < DOWN_ANGLE ? "#ff5252" : "#00e676";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pts[0].x * w, pts[0].y * h);
    ctx.lineTo(pts[1].x * w, pts[1].y * h);
    ctx.lineTo(pts[2].x * w, pts[2].y * h);
    ctx.stroke();
    for (const p of pts) {
      ctx.fillStyle = "#00e676";
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
