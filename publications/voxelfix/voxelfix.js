(function () {
  "use strict";

  const STAGES = ["input", "output", "gt"];
  const DEMO_CLASS_IDS = [1, 7, 12, 5, 15, 16, 8, 3, 10, 2, 11, 13];
  const CLASS_NAMES = [
    "Road", "Tree", "Vehicle", "Grass", "Wall / Building", "Roof",
    "Obstacle", "Gravel", "Person", "Dirt", "Bicycle", "Water"
  ];
  const CLASS_COLORS = [
    [0.50, 0.00, 0.50], [0.25, 0.25, 0.00], [0.00, 0.50, 0.50], [0.00, 1.00, 0.00],
    [1.00, 0.00, 0.00], [0.25, 0.63, 0.47], [1.00, 1.00, 0.00], [0.75, 0.75, 0.75],
    [1.00, 0.06, 1.00], [0.50, 0.00, 0.00], [1.00, 0.80, 0.60], [0.00, 0.00, 1.00]
  ];
  const VIEWER_CLASS_DEFINITIONS = [
    { id: 0, name: "Unlabeled", color: "#000000" },
    { id: 1, name: "Road", color: "#800080" },
    { id: 2, name: "Dirt", color: "#800000" },
    { id: 3, name: "Gravel", color: "#c0c0c0" },
    { id: 5, name: "Grass", color: "#00ff00" },
    { id: 7, name: "Tree", color: "#404000" },
    { id: 8, name: "Obstacle", color: "#ffff00" },
    { id: 10, name: "Person", color: "#ff10ff" },
    { id: 11, name: "Bicycle", color: "#ffcc99" },
    { id: 12, name: "Vehicle", color: "#008080" },
    { id: 13, name: "Water", color: "#0000ff" },
    { id: 15, name: "Wall / Building", color: "#ff0000" },
    { id: 16, name: "Roof", color: "#40a078" }
  ];
  const VIEWER_CLASS_IDS = new Set(VIEWER_CLASS_DEFINITIONS.map((item) => item.id));
  const SCENE_DISPLAY_NAMES = {
    "occufly-buxheim": "Scene 1",
    "occufly-schanz": "Scene 2",
    "occufly-treffler": "Scene 3",
    "occufly-inc-west": "Scene 4",
    "occufly-kiesplatz": "Scene 5",
    "occufly-lenting": "Scene 6",
    "occufly-koesching": "Scene 7",
    "occufly-donaukurier": "Scene 8",
    "occufly-car": "Scene 9",
    "ood-poernbach-patch": "OOD Patch",
    "ood-poernbach-full": "OOD Full Scene"
  };
  const OUTCOME_COLORS = {
    corrected: [0.39, 0.91, 0.47, 1],
    damaged: [1.0, 0.36, 0.30, 1],
    changedWrong: [0.69, 0.51, 1.0, 1],
    unresolved: [0.25, 0.62, 0.96, 0.72],
    stableCorrect: [0.46, 0.51, 0.48, 0.24],
    unmatched: [0.95, 0.78, 0.30, 0.8]
  };
  const CHANGE_COLOR = [1.0, 0.73, 0.25, 1];
  const DIM_COLOR = [0.47, 0.52, 0.49, 0.16];
  const CATEGORY_CODES = {
    unmatched: 0,
    stableCorrect: 1,
    corrected: 2,
    damaged: 3,
    changedWrong: 4,
    unresolved: 5
  };
  const CODE_CATEGORIES = Object.keys(CATEGORY_CODES).reduce((result, key) => {
    result[CATEGORY_CODES[key]] = key;
    return result;
  }, []);

  const state = {
    datasets: { input: null, output: null, gt: null },
    renderers: {},
    classification: new Map(),
    classificationByIndex: null,
    changedByIndex: null,
    alignedHosted: false,
    coordinateMaps: {},
    tolerance: 0.0001,
    mode: "semantic",
    changedOnly: false,
    pointSize: 5,
    demoMode: true,
    hostedMode: false,
    manifest: null,
    classDefinitions: VIEWER_CLASS_DEFINITIONS,
    classColorMap: new Map(VIEWER_CLASS_DEFINITIONS.map((item) => [String(item.id), hexToRgb(item.color)])),
    hiddenClasses: new Set(),
    assetCache: new Map(),
    loadController: null,
    selectedScene: null,
    selectedModel: null,
    bounds: { center: [0, 0, 0], radius: 20 },
    camera: { yaw: -0.72, pitch: 0.6, distance: 48 },
    stats: { matched: 0, changed: 0, corrected: 0, damaged: 0 }
  };

  class VoxelRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext("webgl", {
        alpha: false,
        antialias: true,
        powerPreference: "high-performance"
      });
      this.count = 0;
      this.positionBuffer = null;
      this.colorBuffer = null;

      if (!this.gl) {
        throw new Error("WebGL is unavailable in this browser.");
      }

      this.program = this.createProgram();
      this.locations = {
        position: this.gl.getAttribLocation(this.program, "a_position"),
        color: this.gl.getAttribLocation(this.program, "a_color"),
        mvp: this.gl.getUniformLocation(this.program, "u_mvp"),
        pointSize: this.gl.getUniformLocation(this.program, "u_point_size")
      };

      this.gl.enable(this.gl.DEPTH_TEST);
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      this.bindControls();
    }

    createProgram() {
      const vertexSource = [
        "attribute vec3 a_position;",
        "attribute vec4 a_color;",
        "uniform mat4 u_mvp;",
        "uniform float u_point_size;",
        "varying vec4 v_color;",
        "void main() {",
        "  gl_Position = u_mvp * vec4(a_position, 1.0);",
        "  gl_PointSize = u_point_size;",
        "  v_color = a_color;",
        "}"
      ].join("\n");
      const fragmentSource = [
        "precision mediump float;",
        "varying vec4 v_color;",
        "void main() {",
        "  if (v_color.a < 0.01) discard;",
        "  vec2 edge = min(gl_PointCoord, 1.0 - gl_PointCoord);",
        "  float bevel = smoothstep(0.0, 0.10, min(edge.x, edge.y));",
        "  gl_FragColor = vec4(v_color.rgb * (0.76 + 0.24 * bevel), v_color.a);",
        "}"
      ].join("\n");

      const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexSource);
      const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource);
      const program = this.gl.createProgram();
      this.gl.attachShader(program, vertexShader);
      this.gl.attachShader(program, fragmentShader);
      this.gl.linkProgram(program);

      if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
        throw new Error(this.gl.getProgramInfoLog(program) || "Could not link WebGL program.");
      }
      return program;
    }

    compileShader(type, source) {
      const shader = this.gl.createShader(type);
      this.gl.shaderSource(shader, source);
      this.gl.compileShader(shader);
      if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        throw new Error(this.gl.getShaderInfoLog(shader) || "Could not compile WebGL shader.");
      }
      return shader;
    }

    bindControls() {
      let dragging = false;
      let previousX = 0;
      let previousY = 0;

      this.canvas.addEventListener("pointerdown", (event) => {
        dragging = true;
        previousX = event.clientX;
        previousY = event.clientY;
        this.canvas.setPointerCapture(event.pointerId);
      });

      this.canvas.addEventListener("pointermove", (event) => {
        if (!dragging) return;
        const deltaX = event.clientX - previousX;
        const deltaY = event.clientY - previousY;
        previousX = event.clientX;
        previousY = event.clientY;
        state.camera.yaw -= deltaX * 0.006;
        state.camera.pitch = clamp(state.camera.pitch + deltaY * 0.006, -1.42, 1.42);
        renderAll();
      });

      const stopDragging = () => { dragging = false; };
      this.canvas.addEventListener("pointerup", stopDragging);
      this.canvas.addEventListener("pointercancel", stopDragging);

      this.canvas.addEventListener("wheel", (event) => {
        event.preventDefault();
        const radius = state.bounds.radius;
        state.camera.distance = clamp(
          state.camera.distance * Math.exp(event.deltaY * 0.001),
          Math.max(radius * 0.35, 0.2),
          Math.max(radius * 14, 20)
        );
        renderAll();
      }, { passive: false });

      this.canvas.addEventListener("dblclick", resetCamera);

      this.canvas.addEventListener("keydown", (event) => {
        const angleStep = 0.08;
        const zoomFactor = 1.12;
        if (event.key === "ArrowLeft") state.camera.yaw += angleStep;
        else if (event.key === "ArrowRight") state.camera.yaw -= angleStep;
        else if (event.key === "ArrowUp") state.camera.pitch = clamp(state.camera.pitch - angleStep, -1.42, 1.42);
        else if (event.key === "ArrowDown") state.camera.pitch = clamp(state.camera.pitch + angleStep, -1.42, 1.42);
        else if (event.key === "+" || event.key === "=") state.camera.distance /= zoomFactor;
        else if (event.key === "-" || event.key === "_") state.camera.distance *= zoomFactor;
        else if (event.key === "Home" || event.key === "0") {
          resetCamera();
          event.preventDefault();
          return;
        } else {
          return;
        }

        const radius = state.bounds.radius;
        state.camera.distance = clamp(
          state.camera.distance,
          Math.max(radius * 0.35, 0.2),
          Math.max(radius * 14, 20)
        );
        event.preventDefault();
        renderAll();
      });
    }

    setGeometry(positions, colors) {
      const gl = this.gl;
      this.count = positions.length / 3;

      if (!this.positionBuffer) this.positionBuffer = gl.createBuffer();
      if (!this.colorBuffer) this.colorBuffer = gl.createBuffer();

      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
    }

    setColors(colors) {
      if (!this.colorBuffer) return;
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, colors, this.gl.DYNAMIC_DRAW);
    }

    clear() {
      this.count = 0;
      this.render();
    }

    render() {
      const gl = this.gl;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
      }

      gl.viewport(0, 0, width, height);
      gl.clearColor(0.043, 0.071, 0.059, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (!this.count || !this.positionBuffer || !this.colorBuffer) return;

      const camera = state.camera;
      const cp = Math.cos(camera.pitch);
      const eye = [
        camera.distance * cp * Math.sin(camera.yaw),
        camera.distance * cp * Math.cos(camera.yaw),
        camera.distance * Math.sin(camera.pitch)
      ];
      const radius = state.bounds.radius;
      const projection = perspective(
        Math.PI * 42 / 180,
        width / height,
        Math.max(radius * 0.005, 0.001),
        Math.max(camera.distance + radius * 8, 100)
      );
      const view = lookAt(eye, [0, 0, 0], [0, 0, 1]);
      const mvp = multiply4(projection, view);

      gl.useProgram(this.program);
      gl.uniformMatrix4fv(this.locations.mvp, false, mvp);
      gl.uniform1f(this.locations.pointSize, state.pointSize * dpr);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.enableVertexAttribArray(this.locations.position);
      gl.vertexAttribPointer(this.locations.position, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
      gl.enableVertexAttribArray(this.locations.color);
      gl.vertexAttribPointer(this.locations.color, 4, gl.UNSIGNED_BYTE, true, 0, 0);

      gl.drawArrays(gl.POINTS, 0, this.count);
    }
  }

  function init() {
    try {
      STAGES.forEach((stage) => {
        state.renderers[stage] = new VoxelRenderer(document.getElementById(stage + "-canvas"));
      });
    } catch (error) {
      showMessage(error.message);
      return;
    }

    document.querySelectorAll(".mode-button").forEach((button) => {
      button.addEventListener("click", () => {
        state.mode = button.dataset.mode;
        document.querySelectorAll(".mode-button").forEach((candidate) => {
          const active = candidate === button;
          candidate.classList.toggle("active", active);
          candidate.setAttribute("aria-pressed", String(active));
        });
        updateColors();
      });
    });

    document.getElementById("changed-only").addEventListener("change", (event) => {
      state.changedOnly = event.target.checked;
      updateColors();
    });
    document.getElementById("scene-select").addEventListener("change", (event) => {
      selectScene(event.target.value, true);
    });
    document.getElementById("model-select").addEventListener("change", (event) => {
      loadHostedScene(state.selectedScene.id, event.target.value);
    });
    document.getElementById("retry-scene").addEventListener("click", () => {
      if (state.selectedScene && state.selectedModel) {
        loadHostedScene(state.selectedScene.id, state.selectedModel.id);
      } else {
        loadHostedCatalog();
      }
    });
    document.getElementById("show-all-classes").addEventListener("click", () => {
      state.hiddenClasses.clear();
      updateClassLegend();
      updateColors();
    });
    document.getElementById("reset-camera").addEventListener("click", resetCamera);
    window.addEventListener("resize", renderAll);

    loadHostedCatalog();
  }

  async function loadHostedCatalog() {
    const sceneSelect = document.getElementById("scene-select");
    const modelSelect = document.getElementById("model-select");
    setCatalogStatus("Loading scene catalog...", "loading");
    document.getElementById("retry-scene").hidden = true;

    try {
      const manifestUrl = new URL("voxelfix/data/manifest.json", window.location.href);
      const response = await fetch(manifestUrl, { cache: "no-cache" });
      if (!response.ok) throw new Error("Scene catalog returned HTTP " + response.status + ".");
      const manifest = await response.json();
      validateManifest(manifest);
      state.manifest = manifest;
      state.classDefinitions = VIEWER_CLASS_DEFINITIONS;
      state.classColorMap = new Map(
        VIEWER_CLASS_DEFINITIONS.map((item) => [String(item.id), hexToRgb(item.color)])
      );

      sceneSelect.innerHTML = "";
      [
        ["occufly", "In-distribution"],
        ["ood", "Out-of-distribution"]
      ].forEach(([dataset, label]) => {
        const scenes = manifest.scenes.filter((scene) => scene.dataset === dataset);
        if (dataset === "occufly") {
          scenes.sort((left, right) => displaySceneName(left).localeCompare(displaySceneName(right), undefined, { numeric: true }));
        }
        if (!scenes.length) return;
        const group = document.createElement("optgroup");
        group.label = label;
        scenes.forEach((scene) => {
          const option = document.createElement("option");
          option.value = scene.id;
          option.textContent = displaySceneName(scene) + " · " + formatNumber(scene.voxelCount) + " voxels";
          group.appendChild(option);
        });
        sceneSelect.appendChild(group);
      });
      sceneSelect.disabled = false;
      modelSelect.disabled = false;
      sceneSelect.value = manifest.defaultScene;
      selectScene(manifest.defaultScene, true, manifest.defaultModel);
    } catch (error) {
      sceneSelect.innerHTML = "<option>Catalog unavailable</option>";
      modelSelect.innerHTML = "<option>Models unavailable</option>";
      sceneSelect.disabled = true;
      modelSelect.disabled = true;
      setCatalogStatus(error.message || "Could not load hosted examples.", "error");
      document.getElementById("retry-scene").hidden = false;
    }
  }

  function validateManifest(manifest) {
    if (!manifest || manifest.version !== 1 || manifest.voxelSize !== 0.5) {
      throw new Error("The hosted scene manifest has an unsupported version or voxel size.");
    }
    if (!Array.isArray(manifest.scenes) || !manifest.scenes.length) {
      throw new Error("The hosted scene manifest contains no scenes.");
    }
    if (!Array.isArray(manifest.classes) || !manifest.classes.length) {
      throw new Error("The hosted scene manifest contains no semantic classes.");
    }
  }

  function selectScene(sceneId, shouldLoad, preferredModelId) {
    if (!state.manifest) return;
    const scene = state.manifest.scenes.find((candidate) => candidate.id === sceneId);
    if (!scene) return;
    state.selectedScene = scene;

    const modelSelect = document.getElementById("model-select");
    modelSelect.innerHTML = "";
    scene.models.forEach((model) => {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = model.name;
      modelSelect.appendChild(option);
    });
    const requestedModel = preferredModelId || (state.selectedModel && state.selectedModel.id);
    const selectedModel = scene.models.find((model) => model.id === requestedModel) || scene.models[0];
    state.selectedModel = selectedModel;
    modelSelect.value = selectedModel.id;
    modelSelect.disabled = scene.models.length === 1;
    if (shouldLoad) loadHostedScene(scene.id, selectedModel.id);
  }

  async function loadHostedScene(sceneId, modelId) {
    if (!state.manifest) return;
    const scene = state.manifest.scenes.find((candidate) => candidate.id === sceneId);
    const model = scene && scene.models.find((candidate) => candidate.id === modelId);
    if (!scene || !model) return;

    abortHostedLoad();
    const controller = new AbortController();
    state.loadController = controller;
    state.selectedScene = scene;
    state.selectedModel = model;
    document.getElementById("retry-scene").hidden = true;
    document.getElementById("scene-select").disabled = true;
    document.getElementById("model-select").disabled = true;
    const assets = [scene.geometry, scene.gt, model.labels];
    const totalBytes = assets.reduce((total, asset) => total + asset.compressedBytes, 0);
    let completed = 0;
    setCatalogStatus(
      "Loading " + displaySceneName(scene) + " · 0/3 assets · " + formatBytes(totalBytes),
      "loading"
    );

    try {
      const buffers = await Promise.all(assets.map(async (asset) => {
        const buffer = await loadCompressedAsset(asset, controller.signal);
        completed += 1;
        setCatalogStatus(
          "Loading " + displaySceneName(scene) + " · " + completed + "/3 assets · " + formatBytes(totalBytes),
          "loading"
        );
        return buffer;
      }));
      if (controller.signal.aborted) return;

      const positions = decodeHostedGeometry(buffers[0], scene, state.manifest.voxelSize);
      if (buffers[1].byteLength !== scene.voxelCount) {
        throw new Error("Ground-truth asset length does not match the scene manifest.");
      }
      if (buffers[2].byteLength !== scene.voxelCount * 2) {
        throw new Error("Prediction asset length does not match the scene manifest.");
      }
      const gtLabels = remapSemanticLabels(new Uint8Array(buffers[1]));
      const combinedLabels = new Uint8Array(buffers[2]);
      const inputLabels = remapSemanticLabels(combinedLabels.subarray(0, scene.voxelCount));
      const outputLabels = remapSemanticLabels(combinedLabels.subarray(scene.voxelCount));
      const alignmentId = scene.id;
      const makeDataset = (labels, source, semanticCounts) => ({
        count: scene.voxelCount,
        positions,
        labels,
        baseColors: null,
        semanticKeys: null,
        source,
        format: "voxelfix-web-v1",
        hasSemanticData: true,
        alignmentId,
        semanticCounts
      });

      state.datasets = {
        input: makeDataset(inputLabels, displaySceneName(scene) + " input", remapSemanticCounts(model.inputCounts)),
        output: makeDataset(outputLabels, displaySceneName(scene) + " VoxelFix output", remapSemanticCounts(model.outputCounts)),
        gt: makeDataset(gtLabels, displaySceneName(scene) + " ground truth", remapSemanticCounts(scene.gtCounts))
      };
      state.demoMode = false;
      state.hostedMode = true;
      state.alignedHosted = true;
      state.hiddenClasses.clear();
      state.classDefinitions = VIEWER_CLASS_DEFINITIONS;
      state.classColorMap = new Map(
        VIEWER_CLASS_DEFINITIONS.map((item) => [String(item.id), hexToRgb(item.color)])
      );
      updateViewLabels(scene, model);
      updateSceneMetrics(calculateSceneMetrics(inputLabels, outputLabels, gtLabels));
      hideMessage();
      updateScene(true);
      setCatalogStatus(
        "Loaded " + formatNumber(scene.voxelCount) + " voxels · " + formatBytes(totalBytes),
        "ready"
      );
    } catch (error) {
      if (error.name === "AbortError") return;
      setCatalogStatus(error.message || "Could not load the selected scene.", "error");
      document.getElementById("retry-scene").hidden = false;
      showMessage(error.message || "Could not load the selected scene.");
    } finally {
      if (state.loadController === controller) {
        state.loadController = null;
        document.getElementById("scene-select").disabled = false;
        document.getElementById("model-select").disabled = scene.models.length === 1;
      }
    }
  }

  async function loadCompressedAsset(asset, signal) {
    const cacheKey = asset.sha256;
    if (state.assetCache.has(cacheKey)) return state.assetCache.get(cacheKey);
    if (typeof DecompressionStream === "undefined") {
      throw new Error("This browser cannot decompress hosted scene data. Use a current Chrome, Firefox, or Safari release.");
    }
    const assetUrl = new URL("voxelfix/data/" + asset.path, window.location.href);
    assetUrl.searchParams.set("v", asset.sha256.slice(0, 12));
    const response = await fetch(assetUrl, { signal, cache: "force-cache" });
    if (!response.ok || !response.body) {
      throw new Error("Scene asset returned HTTP " + response.status + ".");
    }
    const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
    const buffer = await new Response(stream).arrayBuffer();
    if (buffer.byteLength !== asset.rawBytes) {
      throw new Error("A scene asset failed its decoded-size validation.");
    }
    state.assetCache.set(cacheKey, buffer);
    return buffer;
  }

  function decodeHostedGeometry(buffer, scene, voxelSize) {
    if (buffer.byteLength !== scene.voxelCount * 6) {
      throw new Error("Geometry asset length does not match the scene manifest.");
    }
    const encoded = new Uint16Array(buffer);
    const positions = new Float32Array(scene.voxelCount * 3);
    for (let index = 0; index < positions.length; index += 3) {
      positions[index] = scene.origin[0] + encoded[index] * voxelSize;
      positions[index + 1] = scene.origin[1] + encoded[index + 1] * voxelSize;
      positions[index + 2] = scene.origin[2] + encoded[index + 2] * voxelSize;
    }
    return positions;
  }

  function updateViewLabels(scene, model) {
    const sceneName = displaySceneName(scene);
    document.getElementById("input-view-subtitle").textContent = sceneName + " · " + model.name;
    document.getElementById("output-view-subtitle").textContent = sceneName + " · corrected";
    document.getElementById("gt-view-subtitle").textContent = sceneName + " · reference";
  }

  function displaySceneName(scene) {
    return SCENE_DISPLAY_NAMES[scene.id] || "Scene";
  }

  function remapSemanticLabels(source) {
    const labels = new Uint8Array(source.length);
    for (let index = 0; index < source.length; index += 1) {
      labels[index] = VIEWER_CLASS_IDS.has(source[index]) ? source[index] : 0;
    }
    return labels;
  }

  function remapSemanticCounts(sourceCounts) {
    const counts = {};
    Object.entries(sourceCounts || {}).forEach(([id, count]) => {
      const normalizedId = VIEWER_CLASS_IDS.has(Number(id)) ? String(Number(id)) : "0";
      counts[normalizedId] = (counts[normalizedId] || 0) + Number(count);
    });
    return counts;
  }

  function calculateSceneMetrics(inputLabels, outputLabels, gtLabels) {
    const classIds = VIEWER_CLASS_DEFINITIONS.map((item) => item.id).filter((id) => id !== 0);
    const gtCounts = new Uint32Array(256);
    const inputCounts = new Uint32Array(256);
    const outputCounts = new Uint32Array(256);
    const inputIntersections = new Uint32Array(256);
    const outputIntersections = new Uint32Array(256);

    for (let index = 0; index < gtLabels.length; index += 1) {
      const reference = gtLabels[index];
      const input = inputLabels[index];
      const output = outputLabels[index];
      gtCounts[reference] += 1;
      inputCounts[input] += 1;
      outputCounts[output] += 1;
      if (input === reference) inputIntersections[reference] += 1;
      if (output === reference) outputIntersections[reference] += 1;
    }

    const meanIoU = (predictionCounts, intersections) => {
      let total = 0;
      let presentClasses = 0;
      classIds.forEach((classId) => {
        if (gtCounts[classId] === 0) return;
        const intersection = intersections[classId];
        const union = predictionCounts[classId] + gtCounts[classId] - intersection;
        total += intersection / union;
        presentClasses += 1;
      });
      return presentClasses ? total / presentClasses * 100 : 0;
    };
    const inputMiou = meanIoU(inputCounts, inputIntersections);
    const outputMiou = meanIoU(outputCounts, outputIntersections);
    return { inputMiou, outputMiou, miouGain: outputMiou - inputMiou };
  }

  function updateSceneMetrics(metrics) {
    const container = document.getElementById("scene-metrics");
    container.hidden = false;
    if (!metrics) {
      document.getElementById("metric-input").textContent = "N/A";
      document.getElementById("metric-output").textContent = "N/A";
      const unavailableGain = document.getElementById("metric-gain");
      unavailableGain.textContent = "N/A";
      unavailableGain.classList.remove("positive", "negative");
      return;
    }
    document.getElementById("metric-input").textContent = metrics.inputMiou.toFixed(2);
    document.getElementById("metric-output").textContent = metrics.outputMiou.toFixed(2);
    const gain = document.getElementById("metric-gain");
    gain.textContent = (metrics.miouGain >= 0 ? "+" : "") + metrics.miouGain.toFixed(2);
    gain.classList.toggle("positive", metrics.miouGain >= 0);
    gain.classList.toggle("negative", metrics.miouGain < 0);
  }

  function setCatalogStatus(message, status) {
    const container = document.querySelector(".catalog-status");
    container.classList.toggle("loading", status === "loading");
    container.classList.toggle("error", status === "error");
    document.getElementById("scene-load-status").textContent = message;
  }

  function abortHostedLoad() {
    if (state.loadController) {
      state.loadController.abort();
      state.loadController = null;
    }
  }

  async function loadPlyFile(stage, file) {
    if (!file.name.toLowerCase().endsWith(".ply")) {
      showMessage("Please choose a PLY file for the " + stageLabel(stage) + " view.");
      return;
    }

    const fileLabel = document.getElementById(stage + "-file-name");
    fileLabel.textContent = "Reading " + file.name + "...";
    hideMessage();

    try {
      const buffer = await file.arrayBuffer();
      const dataset = parsePly(buffer, file.name);

      if (state.demoMode || state.hostedMode) {
        abortHostedLoad();
        STAGES.forEach((otherStage) => {
          state.datasets[otherStage] = null;
          document.getElementById(otherStage + "-file-name").textContent = "Choose matching PLY";
          document.getElementById(otherStage + "-ply").value = "";
        });
        state.demoMode = false;
      }

      state.hostedMode = false;
      state.alignedHosted = false;
      state.hiddenClasses.clear();

      state.datasets[stage] = dataset;
      fileLabel.textContent = file.name + " · " + formatNumber(dataset.count) + " voxels";
      document.getElementById(stage + "-view-subtitle").textContent = file.name;
      updateScene(true);
      setCatalogStatus("Custom local PLY files", "ready");
      document.getElementById("scene-metrics").hidden = true;

      const missing = STAGES.filter((name) => !state.datasets[name]);
      if (missing.length) {
        showMessage("Loaded " + file.name + ". Add the " + missing.map(stageLabel).join(" and ") + " file" + (missing.length > 1 ? "s" : "") + " to compute correction outcomes.", "info");
      }
    } catch (error) {
      fileLabel.textContent = "Could not read " + file.name;
      showMessage(error.message || "The PLY file could not be parsed.");
    }
  }

  function parsePly(buffer, fileName) {
    const bytes = new Uint8Array(buffer);
    const marker = [101, 110, 100, 95, 104, 101, 97, 100, 101, 114];
    let markerIndex = -1;
    const searchLimit = Math.min(bytes.length - marker.length, 1024 * 1024);
    for (let index = 0; index <= searchLimit; index += 1) {
      let found = true;
      for (let offset = 0; offset < marker.length; offset += 1) {
        if (bytes[index + offset] !== marker[offset]) {
          found = false;
          break;
        }
      }
      if (found) {
        markerIndex = index;
        break;
      }
    }
    if (markerIndex < 0) throw new Error(fileName + " has no valid PLY header terminator.");

    let dataOffset = markerIndex + marker.length;
    if (bytes[dataOffset] === 13) dataOffset += 1;
    if (bytes[dataOffset] === 10) dataOffset += 1;

    const header = new TextDecoder("ascii").decode(bytes.subarray(0, dataOffset));
    const lines = header.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines[0] !== "ply") throw new Error(fileName + " is not a PLY file.");

    let format = null;
    let currentElement = null;
    let vertexCount = 0;
    let vertexIsFirst = true;
    let sawElementBeforeVertex = false;
    const properties = [];

    lines.forEach((line) => {
      const parts = line.split(/\s+/);
      if (parts[0] === "format") format = parts[1];
      if (parts[0] === "element") {
        currentElement = parts[1];
        if (currentElement === "vertex") {
          vertexCount = Number(parts[2]);
          vertexIsFirst = !sawElementBeforeVertex;
        } else if (!vertexCount) {
          sawElementBeforeVertex = true;
        }
      }
      if (parts[0] === "property" && currentElement === "vertex") {
        if (parts[1] === "list") {
          properties.push({ list: true, countType: parts[2], valueType: parts[3], name: parts[4] });
        } else {
          properties.push({ list: false, type: parts[1], name: parts[2] });
        }
      }
    });

    if (!format || !["ascii", "binary_little_endian", "binary_big_endian"].includes(format)) {
      throw new Error(fileName + " uses an unsupported PLY format.");
    }
    if (!vertexCount || !properties.length) throw new Error(fileName + " contains no vertex data.");
    if (!vertexIsFirst) throw new Error(fileName + " must store its vertex element before other PLY elements.");
    if (properties.some((property) => property.list)) {
      throw new Error(fileName + " uses list-valued vertex properties, which are not supported.");
    }

    const propertyIndex = Object.fromEntries(properties.map((property, index) => [normalizeName(property.name), index]));
    const xIndex = propertyIndex.x;
    const yIndex = propertyIndex.y;
    const zIndex = propertyIndex.z;
    if ([xIndex, yIndex, zIndex].some((index) => index === undefined)) {
      throw new Error(fileName + " must contain x, y, and z vertex properties.");
    }

    const labelCandidates = ["label", "semantic", "semantic_label", "semantic_id", "class", "class_id", "category", "category_id"];
    const labelName = labelCandidates.find((name) => propertyIndex[name] !== undefined);
    const labelIndex = labelName === undefined ? undefined : propertyIndex[labelName];
    const redIndex = firstDefined(propertyIndex.red, propertyIndex.r, propertyIndex.diffuse_red);
    const greenIndex = firstDefined(propertyIndex.green, propertyIndex.g, propertyIndex.diffuse_green);
    const blueIndex = firstDefined(propertyIndex.blue, propertyIndex.b, propertyIndex.diffuse_blue);
    const hasColor = redIndex !== undefined && greenIndex !== undefined && blueIndex !== undefined;

    const positions = new Float64Array(vertexCount * 3);
    const baseColors = new Uint8Array(vertexCount * 4);
    const semanticKeys = new Array(vertexCount);

    const consumeVertex = (vertex, index) => {
      const px = Number(vertex[xIndex]);
      const py = Number(vertex[yIndex]);
      const pz = Number(vertex[zIndex]);
      if (![px, py, pz].every(Number.isFinite)) {
        throw new Error(fileName + " contains a non-finite vertex coordinate.");
      }
      positions[index * 3] = px;
      positions[index * 3 + 1] = py;
      positions[index * 3 + 2] = pz;

      let key;
      let color;
      if (labelIndex !== undefined) {
        key = String(vertex[labelIndex]);
        color = hasColor
          ? normalizeRgb(vertex[redIndex], vertex[greenIndex], vertex[blueIndex])
          : colorForKey(key);
      } else if (hasColor) {
        color = normalizeRgb(vertex[redIndex], vertex[greenIndex], vertex[blueIndex]);
        key = color.map((channel) => Math.round(channel * 255)).join(",");
      } else {
        key = "unlabeled";
        color = [0.74, 0.79, 0.75];
      }
      semanticKeys[index] = key;
      setColorBytes(baseColors, index * 4, [color[0], color[1], color[2], 1]);
    };

    if (format === "ascii") {
      const body = new TextDecoder("utf-8").decode(bytes.subarray(dataOffset));
      const tokens = body.trim().split(/\s+/);
      const required = vertexCount * properties.length;
      if (tokens.length < required) throw new Error(fileName + " ends before all vertices are defined.");
      for (let index = 0; index < vertexCount; index += 1) {
        const start = index * properties.length;
        consumeVertex(tokens.slice(start, start + properties.length), index);
      }
    } else {
      const littleEndian = format === "binary_little_endian";
      const view = new DataView(buffer);
      let offset = dataOffset;
      for (let index = 0; index < vertexCount; index += 1) {
        const vertex = new Array(properties.length);
        for (let propertyIndexValue = 0; propertyIndexValue < properties.length; propertyIndexValue += 1) {
          const result = readBinaryValue(view, offset, properties[propertyIndexValue].type, littleEndian);
          vertex[propertyIndexValue] = result.value;
          offset = result.offset;
        }
        consumeVertex(vertex, index);
      }
    }

    return {
      count: vertexCount,
      positions,
      baseColors,
      semanticKeys,
      source: fileName,
      format,
      hasSemanticData: labelIndex !== undefined || hasColor,
      classNames: null
    };
  }

  function readBinaryValue(view, offset, type, littleEndian) {
    const normalized = type.toLowerCase();
    const readers = {
      char: ["getInt8", 1], int8: ["getInt8", 1],
      uchar: ["getUint8", 1], uint8: ["getUint8", 1],
      short: ["getInt16", 2], int16: ["getInt16", 2],
      ushort: ["getUint16", 2], uint16: ["getUint16", 2],
      int: ["getInt32", 4], int32: ["getInt32", 4],
      uint: ["getUint32", 4], uint32: ["getUint32", 4],
      float: ["getFloat32", 4], float32: ["getFloat32", 4],
      double: ["getFloat64", 8], float64: ["getFloat64", 8]
    };
    const reader = readers[normalized];
    if (!reader) throw new Error("Unsupported PLY property type: " + type);
    if (offset + reader[1] > view.byteLength) throw new Error("PLY file ends unexpectedly in vertex data.");
    const value = reader[1] === 1 ? view[reader[0]](offset) : view[reader[0]](offset, littleEndian);
    return { value, offset: offset + reader[1] };
  }

  function createSyntheticDemo() {
    const points = [];
    const seen = new Set();
    const add = (x, y, z, label) => {
      const key = [x, y, z].join("|");
      if (seen.has(key)) return;
      seen.add(key);
      points.push({ x, y, z, label });
    };

    for (let x = -16; x <= 16; x += 0.5) {
      for (let y = -10; y <= 10; y += 0.5) {
        let label = Math.abs(x) < 3.25 ? 0 : 3;
        if (x < -11 && y < -4 && (x + 13.5) ** 2 + (y + 6.5) ** 2 < 7) label = 11;
        if (x > 12 && y < -5) label = 9;
        add(x, y, 0, label);
      }
    }

    for (let z = 0.5; z <= 4.5; z += 0.5) {
      for (let x = 6; x <= 12; x += 0.5) {
        add(x, -3, z, 4);
        add(x, 3, z, 4);
      }
      for (let y = -2.5; y <= 2.5; y += 0.5) {
        add(6, y, z, 4);
        add(12, y, z, 4);
      }
    }
    for (let x = 5.5; x <= 12.5; x += 0.5) {
      for (let y = -3.5; y <= 3.5; y += 0.5) add(x, y, 5, 5);
    }

    [[-8, 3], [-11, 6], [-7, -5]].forEach(([cx, cy], treeIndex) => {
      for (let z = 0.5; z <= 2.5; z += 0.5) add(cx, cy, z, 6);
      for (let x = cx - 2; x <= cx + 2; x += 0.5) {
        for (let y = cy - 2; y <= cy + 2; y += 0.5) {
          for (let z = 2.5; z <= 6; z += 0.5) {
            const radius = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + ((z - 4.2) * 0.88) ** 2);
            if (radius <= 2.05 && ((x * 2 + y * 4 + z * 6 + treeIndex) % 3 !== 0)) add(x, y, z, 1);
          }
        }
      }
    });

    for (let x = -1.5; x <= 1.5; x += 0.5) {
      for (let y = -5.5; y <= -3.5; y += 0.5) {
        for (let z = 0.5; z <= 1.5; z += 0.5) add(x, y, z, 2);
      }
    }

    const positions = new Float64Array(points.length * 3);
    const gtLabels = new Uint8Array(points.length);
    const inputLabels = new Uint8Array(points.length);
    const outputLabels = new Uint8Array(points.length);

    points.forEach((point, index) => {
      positions.set([point.x, point.y, point.z], index * 3);
      gtLabels[index] = point.label;
      let noisy = point.label;
      if (point.label === 5 && point.x < 10.6) noisy = 4;
      if (point.label === 1 && point.x < -8.5 && point.y > 1) noisy = 3;
      if (point.label === 0 && point.y > 3.5) noisy = 3;
      if (point.label === 3 && point.x > 4.5 && point.x < 7 && Math.abs(point.y) < 4) noisy = 4;
      inputLabels[index] = noisy;

      let corrected = noisy;
      const fingerprint = Math.abs(Math.round(point.x * 7 + point.y * 11 + point.z * 13));
      if (noisy !== point.label && fingerprint % 7 !== 0) corrected = point.label;
      if (noisy !== point.label && fingerprint % 19 === 0) corrected = 6;
      if (noisy === point.label && point.label === 3 && point.x < -13 && point.y > 5) corrected = 9;
      outputLabels[index] = corrected;
    });

    const makeDataset = (sourceLabels, source) => {
      const labels = new Uint8Array(sourceLabels.length);
      for (let index = 0; index < sourceLabels.length; index += 1) {
        labels[index] = DEMO_CLASS_IDS[sourceLabels[index]];
      }
      return {
        count: labels.length,
        positions,
        labels,
        baseColors: null,
        semanticKeys: null,
        source,
        format: "synthetic",
        hasSemanticData: true,
        alignmentId: "synthetic"
      };
    };

    return {
      input: makeDataset(inputLabels, "Synthetic noisy input"),
      output: makeDataset(outputLabels, "Synthetic VoxelFix output"),
      gt: makeDataset(gtLabels, "Synthetic ground truth")
    };
  }

  function updateScene(resetView) {
    calculateBounds();
    buildCoordinateMaps();
    compareDatasets();
    uploadGeometry();
    updateColors();
    updateStats();
    if (resetView) resetCamera();
  }

  function calculateBounds() {
    const available = STAGES.map((stage) => state.datasets[stage]).filter(Boolean);
    if (!available.length) {
      state.bounds = { center: [0, 0, 0], radius: 20 };
      return;
    }

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    available.forEach((dataset) => {
      for (let index = 0; index < dataset.positions.length; index += 3) {
        for (let axis = 0; axis < 3; axis += 1) {
          const value = dataset.positions[index + axis];
          if (value < min[axis]) min[axis] = value;
          if (value > max[axis]) max[axis] = value;
        }
      }
    });

    const center = min.map((value, axis) => (value + max[axis]) / 2);
    const diagonal = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
    state.bounds = { center, radius: Math.max(diagonal / 2, 0.5) };
    state.tolerance = Math.max(diagonal * 0.000001, 0.00001);
  }

  function buildCoordinateMaps() {
    state.coordinateMaps = {};
    const datasets = STAGES.map((stage) => state.datasets[stage]).filter(Boolean);
    const aligned = datasets.length > 1
      && datasets.every((dataset) => dataset.alignmentId)
      && datasets.every((dataset) => dataset.alignmentId === datasets[0].alignmentId && dataset.count === datasets[0].count);
    if (aligned) {
      STAGES.forEach((stage) => { state.coordinateMaps[stage] = new Map(); });
      return;
    }
    STAGES.forEach((stage) => {
      const dataset = state.datasets[stage];
      const map = new Map();
      if (dataset) {
        for (let index = 0; index < dataset.count; index += 1) {
          map.set(coordinateKey(dataset.positions, index), index);
        }
      }
      state.coordinateMaps[stage] = map;
    });
  }

  function compareDatasets() {
    state.classification = new Map();
    state.classificationByIndex = null;
    state.changedByIndex = null;
    state.stats = { matched: 0, changed: 0, corrected: 0, damaged: 0 };
    const input = state.datasets.input;
    const output = state.datasets.output;
    const gt = state.datasets.gt;

    if (!input || !output) return;

    const aligned = input.alignmentId
      && output.alignmentId === input.alignmentId
      && input.count === output.count
      && (!gt || (gt.alignmentId === input.alignmentId && gt.count === input.count));
    if (aligned) {
      state.classificationByIndex = new Uint8Array(output.count);
      state.changedByIndex = new Uint8Array(output.count);
      for (let index = 0; index < output.count; index += 1) {
        const inputSemantic = semanticAt(input, index);
        const outputSemantic = semanticAt(output, index);
        const changed = inputSemantic !== outputSemantic;
        let category = changed ? "changedWrong" : "stableCorrect";
        if (gt) {
          const gtSemantic = semanticAt(gt, index);
          const inputCorrect = inputSemantic === gtSemantic;
          const outputCorrect = outputSemantic === gtSemantic;
          if (!inputCorrect && outputCorrect) category = "corrected";
          else if (inputCorrect && !outputCorrect) category = "damaged";
          else if (!inputCorrect && !outputCorrect && changed) category = "changedWrong";
          else if (!inputCorrect && !outputCorrect) category = "unresolved";
          else category = "stableCorrect";
        }
        state.stats.matched += 1;
        if (changed) state.stats.changed += 1;
        if (category === "corrected") state.stats.corrected += 1;
        if (category === "damaged") state.stats.damaged += 1;
        state.classificationByIndex[index] = CATEGORY_CODES[category];
        state.changedByIndex[index] = changed ? 1 : 0;
      }
      hideMessage();
      return;
    }
    const inputMap = state.coordinateMaps.input;
    const gtMap = state.coordinateMaps.gt;

    state.coordinateMaps.output.forEach((outputIndex, key) => {
      const inputIndex = inputMap.get(key);
      if (inputIndex === undefined) {
        state.classification.set(key, { category: "unmatched", changed: false });
        return;
      }

      const inputSemantic = semanticAt(input, inputIndex);
      const outputSemantic = semanticAt(output, outputIndex);
      const changed = inputSemantic !== outputSemantic;
      let category = changed ? "changedWrong" : "stableCorrect";

      if (gt) {
        const gtIndex = gtMap.get(key);
        if (gtIndex === undefined) {
          category = "unmatched";
        } else {
          const gtSemantic = semanticAt(gt, gtIndex);
          const inputCorrect = inputSemantic === gtSemantic;
          const outputCorrect = outputSemantic === gtSemantic;
          state.stats.matched += 1;
          if (!inputCorrect && outputCorrect) category = "corrected";
          else if (inputCorrect && !outputCorrect) category = "damaged";
          else if (!inputCorrect && !outputCorrect && changed) category = "changedWrong";
          else if (!inputCorrect && !outputCorrect) category = "unresolved";
          else category = "stableCorrect";
        }
      } else {
        state.stats.matched += 1;
      }

      if (changed) state.stats.changed += 1;
      if (category === "corrected") state.stats.corrected += 1;
      if (category === "damaged") state.stats.damaged += 1;
      state.classification.set(key, { category, changed });
    });

    if (gt) {
      const largestCount = Math.max(input.count, output.count, gt.count);
      const ratio = largestCount ? state.stats.matched / largestCount : 1;
      if (ratio < 0.95) {
        showMessage(
          "Only " + formatPercent(ratio) + " of voxel coordinates match across all three files. Check that geometry, units, and coordinate frames are identical."
        );
      } else if (![input, output, gt].every((dataset) => dataset.hasSemanticData)) {
        showMessage("At least one file has no RGB or semantic-label property, so semantic comparison is limited.");
      } else {
        hideMessage();
      }
    }
  }

  function uploadGeometry() {
    const center = state.bounds.center;
    STAGES.forEach((stage) => {
      const dataset = state.datasets[stage];
      const renderer = state.renderers[stage];
      if (!dataset) {
        renderer.clear();
        return;
      }
      const relative = new Float32Array(dataset.positions.length);
      for (let index = 0; index < dataset.positions.length; index += 3) {
        relative[index] = dataset.positions[index] - center[0];
        relative[index + 1] = dataset.positions[index + 1] - center[1];
        relative[index + 2] = dataset.positions[index + 2] - center[2];
      }
      renderer.setGeometry(relative, colorsForDataset(stage, dataset));
    });
  }

  function updateColors() {
    STAGES.forEach((stage) => {
      const dataset = state.datasets[stage];
      if (!dataset) return;
      state.renderers[stage].setColors(colorsForDataset(stage, dataset));
    });
    updateLegend();
    updateClassLegend();
    renderAll();
  }

  function colorsForDataset(stage, dataset) {
    const colors = new Uint8Array(dataset.count * 4);
    for (let index = 0; index < dataset.count; index += 1) {
      const result = comparisonForStage(stage, dataset, index);
      const semantic = semanticAt(dataset, index);
      let color;

      if (state.mode === "semantic") {
        color = dataset.baseColors ? [
          dataset.baseColors[index * 4] / 255,
          dataset.baseColors[index * 4 + 1] / 255,
          dataset.baseColors[index * 4 + 2] / 255,
          dataset.baseColors[index * 4 + 3] / 255
        ] : (state.classColorMap.get(String(semantic)) || colorForKey(String(semantic))).concat(1);
      } else if (state.mode === "changes") {
        color = result.differsFromGt ? CHANGE_COLOR : DIM_COLOR;
      } else {
        color = OUTCOME_COLORS[result.category] || OUTCOME_COLORS.unmatched;
      }

      if (state.hiddenClasses.has(String(semantic))) color = [color[0], color[1], color[2], 0];
      const isComparisonFocus = state.mode === "outcomes"
        ? result.category !== "stableCorrect"
        : result.differsFromGt;
      if (state.changedOnly && !isComparisonFocus) color = [color[0], color[1], color[2], 0];
      setColorBytes(colors, index * 4, color);
    }
    return colors;
  }

  function comparisonForStage(stage, dataset, index) {
    const gt = state.datasets.gt;
    let gtIndex;
    if (gt && dataset.alignmentId && gt.alignmentId === dataset.alignmentId && gt.count === dataset.count) {
      gtIndex = index;
    } else if (gt) {
      gtIndex = state.coordinateMaps.gt.get(coordinateKey(dataset.positions, index));
    }
    if (!gt || gtIndex === undefined) {
      return { category: "unmatched", differsFromGt: true };
    }

    const differsFromGt = semanticAt(dataset, index) !== semanticAt(gt, gtIndex);
    if (stage === "gt") {
      return { category: "stableCorrect", differsFromGt: false };
    }
    if (stage === "input") {
      return {
        category: differsFromGt ? "unresolved" : "stableCorrect",
        differsFromGt
      };
    }

    let category = differsFromGt ? "unresolved" : "stableCorrect";
    if (state.classificationByIndex && dataset.alignmentId) {
      category = CODE_CATEGORIES[state.classificationByIndex[index]] || "unmatched";
    } else {
      const result = state.classification.get(coordinateKey(dataset.positions, index));
      if (result) category = result.category;
    }
    return { category, differsFromGt };
  }

  function updateStats() {
    document.getElementById("stat-matched").textContent = formatNumber(state.stats.matched);
    document.getElementById("stat-changed").textContent = formatNumber(state.stats.changed);
    document.getElementById("stat-corrected").textContent = formatNumber(state.stats.corrected);
    document.getElementById("stat-damaged").textContent = formatNumber(state.stats.damaged);
  }

  function updateLegend() {
    const legend = document.getElementById("comparison-legend");
    let items;
    if (state.mode === "changes") {
      items = [
        ["Differs from GT", CHANGE_COLOR],
        ["Matches GT", DIM_COLOR]
      ];
    } else if (state.mode === "outcomes") {
      items = [
        ["Corrected", OUTCOME_COLORS.corrected],
        ["Damaged", OUTCOME_COLORS.damaged],
        ["Changed, still wrong", OUTCOME_COLORS.changedWrong],
        ["Unresolved error", OUTCOME_COLORS.unresolved],
        ["Stable correct", OUTCOME_COLORS.stableCorrect]
      ];
    } else {
      items = [["Semantic class colors", [0.72, 0.79, 0.74, 1]]];
    }

    legend.innerHTML = "";
    items.forEach(([label, color]) => {
      const item = document.createElement("span");
      item.className = "legend-item";
      const swatch = document.createElement("i");
      swatch.className = "legend-swatch";
      swatch.style.background = rgbCss(color);
      item.appendChild(swatch);
      item.appendChild(document.createTextNode(label));
      legend.appendChild(item);
    });
  }

  function updateClassLegend() {
    const legend = document.getElementById("class-legend");
    const stageCounts = Object.fromEntries(STAGES.map((stage) => [stage, datasetCounts(state.datasets[stage])]));
    const knownIds = new Set(state.classDefinitions.map((item) => String(item.id)));
    const extraIds = new Set();
    STAGES.forEach((stage) => {
      stageCounts[stage].forEach((count, id) => {
        if (count && !knownIds.has(id)) extraIds.add(id);
      });
    });
    const definitions = state.classDefinitions.concat(
      Array.from(extraIds).sort((a, b) => Number(a) - Number(b)).map((id) => ({
        id,
        name: id === "unlabeled" ? "Unlabeled" : "Class " + id,
        color: rgbCss(state.classColorMap.get(id) || colorForKey(id))
      }))
    );

    legend.innerHTML = "";
    definitions.forEach((definition) => {
      const id = String(definition.id);
      const counts = STAGES.map((stage) => stageCounts[stage].get(id) || 0);
      const total = counts.reduce((sum, count) => sum + count, 0);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "class-key";
      button.classList.toggle("absent", total === 0);
      button.classList.toggle("hidden-class", state.hiddenClasses.has(id));
      button.setAttribute("aria-pressed", String(!state.hiddenClasses.has(id)));
      button.setAttribute("aria-label", definition.name + ", toggle class visibility");
      button.title = "Input " + formatNumber(counts[0]) + " · Output " + formatNumber(counts[1]) + " · Ground truth " + formatNumber(counts[2]);

      const swatch = document.createElement("i");
      swatch.style.background = definition.color;
      const name = document.createElement("strong");
      name.textContent = definition.name;
      const summary = document.createElement("small");
      summary.textContent = counts.map(compactNumber).join(" / ");
      button.append(swatch, name, summary);
      button.addEventListener("click", () => {
        if (state.hiddenClasses.has(id)) state.hiddenClasses.delete(id);
        else state.hiddenClasses.add(id);
        updateColors();
      });
      legend.appendChild(button);
    });
    document.getElementById("show-all-classes").disabled = state.hiddenClasses.size === 0;
  }

  function resetCamera() {
    state.camera.yaw = -0.72;
    state.camera.pitch = 0.6;
    state.camera.distance = Math.max(state.bounds.radius * 2.35, 2);
    renderAll();
  }

  function renderAll() {
    STAGES.forEach((stage) => {
      if (state.renderers[stage]) state.renderers[stage].render();
    });
  }

  function coordinateKey(positions, index) {
    const offset = index * 3;
    const tolerance = state.tolerance;
    return [
      Math.round(positions[offset] / tolerance),
      Math.round(positions[offset + 1] / tolerance),
      Math.round(positions[offset + 2] / tolerance)
    ].join("|");
  }

  function normalizeName(name) {
    return name.toLowerCase().replace(/[\s-]+/g, "_");
  }

  function semanticAt(dataset, index) {
    const semantic = dataset.labels ? dataset.labels[index] : dataset.semanticKeys && dataset.semanticKeys[index];
    const numeric = Number(semantic);
    return VIEWER_CLASS_IDS.has(numeric) ? numeric : 0;
  }

  function datasetCounts(dataset) {
    if (!dataset) return new Map();
    if (dataset.countsCache) return dataset.countsCache;
    if (dataset.semanticCounts) {
      dataset.countsCache = new Map(
        Object.entries(dataset.semanticCounts).map(([id, count]) => [String(id), Number(count)])
      );
      return dataset.countsCache;
    }
    const counts = new Map();
    for (let index = 0; index < dataset.count; index += 1) {
      const id = String(semanticAt(dataset, index));
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    dataset.countsCache = counts;
    return counts;
  }

  function setColorBytes(target, offset, color) {
    target[offset] = Math.round(clamp(color[0], 0, 1) * 255);
    target[offset + 1] = Math.round(clamp(color[1], 0, 1) * 255);
    target[offset + 2] = Math.round(clamp(color[2], 0, 1) * 255);
    target[offset + 3] = Math.round(clamp(color[3] === undefined ? 1 : color[3], 0, 1) * 255);
  }

  function normalizeRgb(red, green, blue) {
    const values = [Number(red), Number(green), Number(blue)];
    const scale = values.some((value) => value > 1) ? 255 : 1;
    return values.map((value) => clamp(value / scale, 0, 1));
  }

  function colorForKey(key) {
    let hash = 0;
    for (let index = 0; index < key.length; index += 1) hash = ((hash << 5) - hash + key.charCodeAt(index)) | 0;
    const hue = ((hash % 360) + 360) % 360;
    return hslToRgb(hue / 360, 0.58, 0.58);
  }

  function hslToRgb(h, s, l) {
    if (s === 0) return [l, l, l];
    const hueToRgb = (p, q, tValue) => {
      let t = tValue;
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [hueToRgb(p, q, h + 1 / 3), hueToRgb(p, q, h), hueToRgb(p, q, h - 1 / 3)];
  }

  function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    const range = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * range, -1,
      0, 0, 2 * far * near * range, 0
    ]);
  }

  function lookAt(eye, target, up) {
    let zx = eye[0] - target[0];
    let zy = eye[1] - target[1];
    let zz = eye[2] - target[2];
    let length = Math.hypot(zx, zy, zz) || 1;
    zx /= length; zy /= length; zz /= length;

    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;
    length = Math.hypot(xx, xy, xz) || 1;
    xx /= length; xy /= length; xz /= length;

    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    return new Float32Array([
      xx, yx, zx, 0,
      xy, yy, zy, 0,
      xz, yz, zz, 0,
      -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
      -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
      -(zx * eye[0] + zy * eye[1] + zz * eye[2]),
      1
    ]);
  }

  function multiply4(a, b) {
    const out = new Float32Array(16);
    for (let column = 0; column < 4; column += 1) {
      for (let row = 0; row < 4; row += 1) {
        let value = 0;
        for (let index = 0; index < 4; index += 1) value += a[index * 4 + row] * b[column * 4 + index];
        out[column * 4 + row] = value;
      }
    }
    return out;
  }

  function showMessage(message, type) {
    const element = document.getElementById("viewer-message");
    element.textContent = message;
    element.classList.add("visible");
    element.dataset.type = type || "error";
  }

  function hideMessage() {
    const element = document.getElementById("viewer-message");
    element.classList.remove("visible");
    element.textContent = "";
  }

  function stageLabel(stage) {
    return { input: "noisy input", output: "VoxelFix output", gt: "ground truth" }[stage] || stage;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("en-US").format(value || 0);
  }

  function formatPercent(value) {
    return new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 }).format(value || 0);
  }

  function compactNumber(value) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
  }

  function formatBytes(value) {
    if (!value) return "0 B";
    const units = ["B", "KiB", "MiB", "GiB"];
    const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    return (value / (1024 ** exponent)).toFixed(exponent ? 1 : 0) + " " + units[exponent];
  }

  function hexToRgb(value) {
    const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value || "");
    if (!match) return [0.74, 0.79, 0.75];
    return match.slice(1).map((channel) => parseInt(channel, 16) / 255);
  }

  function rgbCss(color) {
    return "rgb(" + color.slice(0, 3).map((value) => Math.round(value * 255)).join(",") + ")";
  }

  function firstDefined() {
    for (let index = 0; index < arguments.length; index += 1) {
      if (arguments[index] !== undefined) return arguments[index];
    }
    return undefined;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  document.addEventListener("DOMContentLoaded", init);
}());
