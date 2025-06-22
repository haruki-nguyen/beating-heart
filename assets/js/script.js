/**
 * 3D Heart Animation - Optimized Version
 * A Three.js-based interactive 3D heart animation with particle effects
 */

// Clear console for development
console.clear();

// Configuration object for easy customization
const CONFIG = {
  // Scene settings
  CAMERA_FOV: 75,
  CAMERA_NEAR: 0.1,
  CAMERA_FAR: 1000,
  CAMERA_POSITION_Z: 1.8,

  // Controls settings
  CONTROLS_MAX_DISTANCE: 3,
  CONTROLS_MIN_DISTANCE: 0.7,

  // Heart settings
  HEART_SCALE: 0.04,
  HEART_ROTATION: -Math.PI * 0.5,
  HEART_TRANSLATE_Y: -0.4,

  // Particle settings
  PARTICLE_COUNT: 10000,
  PARTICLE_SIZE: 0.009,
  PARTICLE_RANDOM_FACTOR: 0.03,

  // Animation settings
  BEAT_DURATION: 0.6,
  BEAT_REPEAT_DELAY: 0.3,
  BEAT_MAX_VALUE: 0.5,

  // Noise settings
  NOISE_SCALE: 1.5,
  NOISE_FREQUENCY: 500,
  NOISE_AMPLITUDE: 0.15,

  // Rendering settings
  MAX_Z: 0.23,
  RATE_Z: 0.5,

  // Colors
  COLORS: ["#ffd4ee", "#ff77fc", "#ff77ae", "#ff1775"],
};

// Main application class
class HeartAnimation {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.group = null;
    this.heart = null;
    this.sampler = null;
    this.originHeart = null;
    this.particles = null;
    this.geometry = null;
    this.material = null;
    this.spikes = [];
    this.positions = [];
    this.colors = [];
    this.beat = { a: 0 };
    this.simplex = new SimplexNoise();
    this.pos = new THREE.Vector3();
    this.palette = CONFIG.COLORS.map((color) => new THREE.Color(color));
    this.isLoaded = false;
    this.isAnimating = false;

    this.init();
  }

  init() {
    try {
      this.setupScene();
      this.setupCamera();
      this.setupRenderer();
      this.setupControls();
      this.setupGroup();
      this.setupParticles();
      this.setupAnimation();
      this.loadHeartModel();
      this.setupEventListeners();
    } catch (error) {
      console.error("Failed to initialize HeartAnimation:", error);
      this.showError("Failed to initialize animation");
    }
  }

  setupScene() {
    this.scene = new THREE.Scene();
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      CONFIG.CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      CONFIG.CAMERA_NEAR,
      CONFIG.CAMERA_FAR
    );
    this.camera.position.z = CONFIG.CAMERA_POSITION_Z;
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });

    this.renderer.setClearColor(new THREE.Color("#000000"));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false; // Disable shadows for performance

    document.body.appendChild(this.renderer.domElement);
  }

  setupControls() {
    this.controls = new THREE.TrackballControls(
      this.camera,
      this.renderer.domElement
    );
    this.controls.noPan = true;
    this.controls.maxDistance = CONFIG.CONTROLS_MAX_DISTANCE;
    this.controls.minDistance = CONFIG.CONTROLS_MIN_DISTANCE;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
  }

  setupGroup() {
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  setupParticles() {
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      vertexColors: true,
      size: CONFIG.PARTICLE_SIZE,
      transparent: true,
      opacity: 0.8,
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.group.add(this.particles);
  }

  setupAnimation() {
    gsap
      .timeline({
        repeat: -1,
        repeatDelay: CONFIG.BEAT_REPEAT_DELAY,
      })
      .to(this.beat, {
        a: CONFIG.BEAT_MAX_VALUE,
        duration: CONFIG.BEAT_DURATION,
        ease: "power2.in",
      })
      .to(this.beat, {
        a: 0.0,
        duration: CONFIG.BEAT_DURATION,
        ease: "power3.out",
      });
  }

  loadHeartModel() {
    const loader = new THREE.OBJLoader();

    loader.load(
      "https://assets.codepen.io/127738/heart_2.obj",
      (obj) => {
        this.onHeartLoaded(obj);
      },
      (progress) => {
        this.onHeartProgress(progress);
      },
      (error) => {
        this.onHeartError(error);
      }
    );
  }

  onHeartLoaded(obj) {
    try {
      this.heart = obj.children[0];
      this.setupHeartGeometry();
      this.setupHeartMaterial();
      this.setupSampler();
      this.initParticles();
      this.startAnimation();
      this.hideLoading();
    } catch (error) {
      console.error("Error setting up heart:", error);
      this.showError("Failed to setup heart model");
    }
  }

  onHeartProgress(progress) {
    const percent = Math.round((progress.loaded / progress.total) * 100);
    console.log(`Loading heart model: ${percent}%`);
  }

  onHeartError(error) {
    console.error("Error loading heart model:", error);
    this.showError("Failed to load heart model");
  }

  setupHeartGeometry() {
    this.heart.geometry.rotateX(CONFIG.HEART_ROTATION);
    this.heart.geometry.scale(
      CONFIG.HEART_SCALE,
      CONFIG.HEART_SCALE,
      CONFIG.HEART_SCALE
    );
    this.heart.geometry.translate(0, CONFIG.HEART_TRANSLATE_Y, 0);
    this.group.add(this.heart);
  }

  setupHeartMaterial() {
    this.heart.material = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#000000"),
      transparent: true,
      opacity: 0.3,
    });
  }

  setupSampler() {
    this.originHeart = Array.from(
      this.heart.geometry.attributes.position.array
    );
    this.sampler = new THREE.MeshSurfaceSampler(this.heart).build();
  }

  initParticles() {
    this.spikes = [];
    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
      this.spikes.push(
        new SparkPoint(this.sampler, this.palette, this.simplex, this.pos)
      );
    }
  }

  startAnimation() {
    this.isAnimating = true;
    this.renderer.setAnimationLoop((time) => this.render(time));
  }

  hideLoading() {
    const loading = document.getElementById("loading");
    if (loading) {
      loading.classList.add("hidden");
      setTimeout(() => {
        loading.style.display = "none";
      }, 500);
    }
  }

  showError(message) {
    const loading = document.getElementById("loading");
    if (loading) {
      loading.innerHTML = `
        <div>
          <div class="loading-text" style="color: #ff4444;">${message}</div>
          <div class="loading-text" style="font-size: 14px; margin-top: 10px;">Please refresh the page to try again.</div>
        </div>
      `;
    }
  }

  setupEventListeners() {
    window.addEventListener("resize", () => this.onWindowResize(), false);

    // Add keyboard controls for accessibility
    document.addEventListener("keydown", (event) => this.onKeyDown(event));

    // Add touch support for mobile
    this.renderer.domElement.addEventListener(
      "touchstart",
      (event) => {
        event.preventDefault();
      },
      { passive: false }
    );
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  onKeyDown(event) {
    switch (event.key) {
      case "ArrowUp":
        this.camera.position.y += 0.1;
        break;
      case "ArrowDown":
        this.camera.position.y -= 0.1;
        break;
      case "ArrowLeft":
        this.camera.position.x -= 0.1;
        break;
      case "ArrowRight":
        this.camera.position.x += 0.1;
        break;
      case " ":
        // Toggle animation
        this.isAnimating = !this.isAnimating;
        if (this.isAnimating) {
          this.renderer.setAnimationLoop((time) => this.render(time));
        } else {
          this.renderer.setAnimationLoop(null);
        }
        break;
    }
  }

  render(time) {
    if (!this.isAnimating || !this.heart) return;

    this.updateParticles();
    this.updateHeartGeometry(time);
    this.updateControls();
    this.renderer.render(this.scene, this.camera);
  }

  updateParticles() {
    this.positions = [];
    this.colors = [];

    this.spikes.forEach((spike) => {
      spike.update(this.beat);

      const rand = spike.rand;
      const color = spike.color;

      // First particle layer
      if (
        CONFIG.MAX_Z * CONFIG.RATE_Z + rand > spike.one.z &&
        spike.one.z > -CONFIG.MAX_Z * CONFIG.RATE_Z - rand
      ) {
        this.positions.push(spike.one.x, spike.one.y, spike.one.z);
        this.colors.push(color.r, color.g, color.b);
      }

      // Second particle layer
      if (
        CONFIG.MAX_Z * CONFIG.RATE_Z + rand * 2 > spike.one.z &&
        spike.one.z > -CONFIG.MAX_Z * CONFIG.RATE_Z - rand * 2
      ) {
        this.positions.push(spike.two.x, spike.two.y, spike.two.z);
        this.colors.push(color.r, color.g, color.b);
      }
    });

    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(this.positions), 3)
    );
    this.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(this.colors), 3)
    );
  }

  updateHeartGeometry(time) {
    const vs = this.heart.geometry.attributes.position.array;

    for (let i = 0; i < vs.length; i += 3) {
      const v = new THREE.Vector3(
        this.originHeart[i],
        this.originHeart[i + 1],
        this.originHeart[i + 2]
      );

      const noise =
        this.simplex.noise4D(
          this.originHeart[i] * CONFIG.NOISE_SCALE,
          this.originHeart[i + 1] * CONFIG.NOISE_SCALE,
          this.originHeart[i + 2] * CONFIG.NOISE_SCALE,
          time * 0.0005
        ) + 1;

      v.multiplyScalar(noise * CONFIG.NOISE_AMPLITUDE * this.beat.a);
      vs[i] = v.x;
      vs[i + 1] = v.y;
      vs[i + 2] = v.z;
    }

    this.heart.geometry.attributes.position.needsUpdate = true;
  }

  updateControls() {
    this.controls.update();
  }
}

// SparkPoint class for particle management
class SparkPoint {
  constructor(sampler, palette, simplex, pos) {
    sampler.sample(pos);
    this.color = palette[Math.floor(Math.random() * palette.length)];
    this.rand = Math.random() * CONFIG.PARTICLE_RANDOM_FACTOR;
    this.pos = pos.clone();
    this.one = null;
    this.two = null;
    this.simplex = simplex;
  }

  update(beat) {
    const noise =
      this.simplex.noise4D(
        this.pos.x * 1,
        this.pos.y * 1,
        this.pos.z * 1,
        0.1
      ) + 1.5;

    const noise2 =
      this.simplex.noise4D(
        this.pos.x * CONFIG.NOISE_FREQUENCY,
        this.pos.y * CONFIG.NOISE_FREQUENCY,
        this.pos.z * CONFIG.NOISE_FREQUENCY,
        1
      ) + 1;

    this.one = this.pos
      .clone()
      .multiplyScalar(1.01 + noise * CONFIG.NOISE_AMPLITUDE * beat.a);
    this.two = this.pos
      .clone()
      .multiplyScalar(1 + noise2 * (beat.a + 0.3) - beat.a * 1.2);
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Check for WebGL support
  if (!window.WebGLRenderingContext) {
    alert("WebGL is not supported in your browser");
    return;
  }

  // Initialize the heart animation
  new HeartAnimation();
});

// Handle page visibility changes for performance
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // Pause animation when tab is not visible
    console.log("Page hidden - animation paused");
  } else {
    // Resume animation when tab becomes visible
    console.log("Page visible - animation resumed");
  }
});
