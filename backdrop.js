(() => {
  const canvas = document.querySelector("#ascii-field");
  const video = document.querySelector("#source-footage");
  const root = document.documentElement;
  const control = document.querySelector(".field-control");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!canvas) {
    root.dataset.ready = "true";
    return;
  }

  const ctx = canvas.getContext("2d", { alpha: false });
  const sampleCanvas = document.createElement("canvas");
  const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  const glyphRamp = "..,:;i!lI1}{][()<>/\\|tfjrxnuvczXYUOQ0B8$%#@";
  const textureGlyphs = [
    "1111111/////<<<<<>>>>>{{{{}}}}",
    "rrrrrrffffffttttttjjjjjxxxxxxx",
    "0000OOOQQQBBBBB88888$$$$$%%%%",
    "SHRESHTHBASICSVLRNTCLUTCHROUND"
  ];

  let width = 0;
  let height = 0;
  let dpr = 1;
  let cols = 0;
  let rows = 0;
  let cellW = 6;
  let cellH = 8;
  let raf = 0;
  let running = false;
  let paused = false;
  let framePixels = null;
  let videoFailed = false;
  let lastFrame = 0;
  let pointer = { x: 0.5, y: 0.52, tx: 0.5, ty: 0.52 };
  let seeds = [];

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function mix(a, b, amount) {
    return a + (b - a) * amount;
  }

  function colorMix(a, b, amount) {
    return [
      mix(a[0], b[0], amount),
      mix(a[1], b[1], amount),
      mix(a[2], b[2], amount)
    ];
  }

  function cssColor(color, alpha) {
    return `rgba(${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(color[2])}, ${alpha})`;
  }

  function hash(x, y) {
    return Math.abs((Math.sin(x * 127.1 + y * 311.7) * 43758.5453123) % 1);
  }

  function lumaOf(r, g, b) {
    return (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
  }

  function coverSource(sourceW, sourceH, targetW, targetH) {
    const sourceRatio = sourceW / sourceH;
    const targetRatio = targetW / targetH;
    let sx = 0;
    let sy = 0;
    let sw = sourceW;
    let sh = sourceH;

    if (sourceRatio > targetRatio) {
      sw = sourceH * targetRatio;
      sx = (sourceW - sw) / 2;
    } else {
      sh = sourceW / targetRatio;
      sy = (sourceH - sh) / 2;
    }

    return { sx, sy, sw, sh };
  }

  function seedCells() {
    seeds = Array.from({ length: rows }, (_, row) =>
      Array.from({ length: cols }, (_, col) => {
        const h = hash(col + 17, row + 31);
        const pool = textureGlyphs[Math.floor(h * textureGlyphs.length)] || textureGlyphs[0];
        return {
          h,
          glyph: pool[Math.floor(hash(col + 91, row + 47) * pool.length)] || "1",
          phase: hash(col + 271, row + 113) * Math.PI * 2
        };
      })
    );
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.2);
    cellW = width < 720 ? 5 : 6;
    cellH = width < 720 ? 7 : 8;
    cols = Math.ceil(width / cellW) + 2;
    rows = Math.ceil(height / cellH) + 2;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    sampleCanvas.width = cols;
    sampleCanvas.height = rows;
    ctx.font = `700 ${cellH}px "JetBrains Mono", ui-monospace, Menlo, monospace`;
    ctx.textBaseline = "top";
    seedCells();
    draw(performance.now(), true);
  }

  function videoCanPaint() {
    return (
      video &&
      sampleCtx &&
      !videoFailed &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      video.videoWidth > 0 &&
      video.videoHeight > 0
    );
  }

  function sampleVideoFrame() {
    if (!videoCanPaint()) return false;

    try {
      const { sx, sy, sw, sh } = coverSource(video.videoWidth, video.videoHeight, cols, rows);
      sampleCtx.drawImage(video, sx, sy, sw, sh, 0, 0, cols, rows);
      framePixels = sampleCtx.getImageData(0, 0, cols, rows).data;
      return true;
    } catch (error) {
      videoFailed = true;
      framePixels = null;
      return false;
    }
  }

  function backgroundWash(t) {
    const glowX = pointer.x * width;
    const glowY = pointer.y * height;
    const gradient = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, Math.max(width, height) * 0.82);
    gradient.addColorStop(0, "#07152a");
    gradient.addColorStop(0.32, "#080915");
    gradient.addColorStop(0.66, "#090302");
    gradient.addColorStop(1, "#02040a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = `rgba(66, 203, 255, ${0.035 + (Math.sin(t * 0.0012) * 0.5 + 0.5) * 0.025})`;
    ctx.fillRect(width * 0.58, 0, width * 0.42, height);
    ctx.fillStyle = "rgba(255, 112, 31, 0.055)";
    ctx.fillRect(0, 0, width * 0.42, height);
    ctx.fillStyle = "rgba(255, 166, 42, 0.034)";
    ctx.fillRect(width * 0.36, 0, width * 0.24, height);
    ctx.fillStyle = "rgba(42, 63, 255, 0.024)";
    ctx.fillRect(width * 0.25, 0, width * 0.36, height);
    ctx.restore();
  }

  function fallbackCell(row, col, t, seedCell) {
    const nx = col / Math.max(cols - 1, 1);
    const ny = row / Math.max(rows - 1, 1);
    const wave =
      Math.sin(nx * 14 + t * 0.0015) * 0.16 +
      Math.sin(ny * 23 - t * 0.001) * 0.14 +
      Math.sin((nx - ny) * 31 + t * 0.0008) * 0.1;
    const bloom = Math.max(0, 1 - Math.hypot(nx - 0.52, ny - 0.62) * 2.2);
    const brightness = clamp(0.34 + wave + bloom * 0.52 + seedCell.h * 0.1, 0.12, 1);

    return {
      brightness,
      color: colorFor(brightness, 180, 74, 12, 0.35),
      alpha: clamp(0.2 + brightness * 0.72, 0.18, 0.92)
    };
  }

  function colorFor(brightness, r, g, b, saturation) {
    const value = clamp(brightness, 0, 1);
    const max = Math.max(r, g, b);
    const source = max < 6 ? [20, 30, 48] : [r, g, b];
    let target = [255, 139, 44];

    if (b > r * 1.08 && b > g * 0.68) target = [78, 166, 255];
    if (g > r * 0.9 && b > r * 0.75) target = [68, 238, 255];
    if (r > b * 1.08 && r > g * 0.78) target = [255, 111, 42];
    if (g > r * 1.03 && g > b * 0.88) target = [192, 232, 74];
    if (r > 150 && g > 105 && r >= b * 1.04) target = [255, 156, 54];
    if (r > 205 && g > 185 && b > 178 && Math.abs(r - b) < 26) target = [255, 244, 218];

    const darkBase = colorMix([8, 15, 30], target, 0.3 + value * 0.2);
    const sourceBoost = colorMix(source, target, 0.34);
    let tuned = colorMix(darkBase, sourceBoost, clamp(0.36 + value * 0.74, 0, 1));
    const warmHighlight = clamp((r + g * 0.72 - b * 1.2 - 128) / 255, 0, 0.44);
    tuned = colorMix(tuned, [255, 136, 38], warmHighlight);
    tuned = colorMix(tuned, target, saturation * 0.28);
    tuned = colorMix(tuned, [255, 250, 238], clamp((value - 0.8) * 0.52, 0, 0.32));
    return tuned;
  }

  function getFrameCell(row, col, t) {
    const seedCell = seeds[row]?.[col] || { h: 0.5, glyph: "1", phase: 0 };

    if (!framePixels) return { ...fallbackCell(row, col, t, seedCell), seedCell };

    const index = (row * cols + col) * 4;
    const r = framePixels[index] || 0;
    const g = framePixels[index + 1] || 0;
    const b = framePixels[index + 2] || 0;
    const luma = lumaOf(r, g, b);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = (max - min) / 255;
    const flicker = Math.sin(t * 0.0035 + seedCell.phase) * 0.018;
    const lifted = clamp((luma - 0.006) * 2.7, 0, 1);
    const brightness = clamp(Math.pow(lifted, 0.42) * 1.06 + saturation * 0.2 + flicker + seedCell.h * 0.036 + 0.035, 0.18, 1);
    const alpha = clamp(0.28 + Math.pow(brightness, 0.62) * 0.78, 0.26, 0.99);

    return {
      brightness,
      color: colorFor(brightness, r, g, b, saturation),
      alpha,
      seedCell
    };
  }

  function drawAscii(t) {
    ctx.save();
    ctx.font = `700 ${cellH}px "JetBrains Mono", ui-monospace, Menlo, monospace`;
    ctx.textBaseline = "top";

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const cell = getFrameCell(row, col, t);
        const rampIndex = clamp(Math.floor(cell.brightness * (glyphRamp.length - 1)), 0, glyphRamp.length - 1);
        const glyph = cell.brightness > 0.54 && cell.seedCell.h > 0.44 ? cell.seedCell.glyph : glyphRamp[rampIndex];

        ctx.fillStyle = cssColor(cell.color, cell.alpha);
        ctx.fillText(glyph, col * cellW, row * cellH);
      }
    }

    ctx.restore();
  }

  function drawReferenceMasks() {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function draw(t, force = false) {
    lastFrame = t;
    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;

    if (!force || !framePixels) sampleVideoFrame();

    ctx.clearRect(0, 0, width, height);
    backgroundWash(t);
    drawAscii(t);
    drawReferenceMasks();

    if (running) raf = requestAnimationFrame(draw);
  }

  function requestVideoPlay() {
    if (!video || reduceMotion.matches) return;
    video.muted = true;
    video.playsInline = true;
    const playPromise = video.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {
        videoFailed = true;
        draw(performance.now(), true);
      });
    }
  }

  function start() {
    if (running || paused || reduceMotion.matches) return;
    running = true;
    requestVideoPlay();
    raf = requestAnimationFrame(draw);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function syncControl() {
    if (!control) return;
    if (reduceMotion.matches) {
      control.disabled = true;
      control.setAttribute("aria-label", "Static background");
      control.textContent = ".";
      return;
    }
    control.disabled = false;
    control.setAttribute("aria-label", paused ? "Play background animation" : "Pause background animation");
    control.textContent = paused ? "▶" : "⌁";
  }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener(
    "pointermove",
    (event) => {
      pointer.tx = clamp(event.clientX / window.innerWidth, 0, 1);
      pointer.ty = clamp(event.clientY / window.innerHeight, 0, 1);
      root.style.setProperty("--mx", `${Math.round(pointer.tx * 100)}%`);
      root.style.setProperty("--my", `${Math.round(pointer.ty * 100)}%`);
    },
    { passive: true }
  );

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
      video?.pause();
    } else {
      requestVideoPlay();
      start();
    }
  });

  control?.addEventListener("click", () => {
    if (reduceMotion.matches) return;
    paused = !paused;
    syncControl();
    if (paused) {
      stop();
      video?.pause();
    } else {
      requestVideoPlay();
      start();
    }
  });

  video?.addEventListener("loadeddata", () => {
    videoFailed = false;
    sampleVideoFrame();
    draw(performance.now(), true);
    start();
  });

  video?.addEventListener("error", () => {
    videoFailed = true;
    draw(performance.now(), true);
  });

  reduceMotion.addEventListener("change", () => {
    stop();
    if (reduceMotion.matches) video?.pause();
    else requestVideoPlay();
    syncControl();
    draw(performance.now(), true);
    start();
  });

  resize();
  syncControl();
  requestVideoPlay();
  draw(performance.now(), true);
  start();

  document.fonts?.ready.finally(() => {
    requestAnimationFrame(() => {
      root.dataset.ready = "true";
      draw(performance.now(), true);
    });
  });
})();
