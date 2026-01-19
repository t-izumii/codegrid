import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import {
  simulationFragmentShader,
  simulationVertexShader,
  renderFragmentShader,
  renderVertexShader,
} from "./shaders";

// Constants
const CAMERA_FOV = 50;
const FONT_SIZE = 100;
const BACKGROUND_COLOR = "#fb74277";
const TEXT_COLOR = "#fef4b8";
const TEXT_CONTENT = "PNRM CREATIVE";
const MAX_PIXEL_RATIO = 2;

// Initialize smooth scrolling
function initSmoothScrolling() {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  const lenis = new Lenis();
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
}

// Setup camera with responsive positioning
function createCamera(viewPort) {
  const fovRad = (CAMERA_FOV / 2) * (Math.PI / 180);
  const distance = viewPort.height / 2 / Math.tan(fovRad);
  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV,
    viewPort.width / viewPort.height,
    0.1,
    10000
  );
  camera.position.z = distance;
  return camera;
}

// Setup WebGL renderer with optimal settings
function createRenderer(viewPort) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setClearColor(0x000000, 1);
  renderer.setSize(viewPort.width, viewPort.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputEncoding = THREE.LinearEncoding;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.0;
  return renderer;
}

// Create render targets for ping-pong rendering
function createRenderTargets(viewPort) {
  const options = {
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    stencilBuffer: false,
    depthBuffer: false,
  };

  return {
    rtA: new THREE.WebGLRenderTarget(viewPort.width, viewPort.height, options),
    rtB: new THREE.WebGLRenderTarget(viewPort.width, viewPort.height, options),
  };
}

// Draw text on canvas
function drawTextOnCanvas(ctx, viewPort) {
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, viewPort.width, viewPort.height);

  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `bold ${FONT_SIZE}px PP Neue Montreal`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.textRendering = "geometricPrecision";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillText(TEXT_CONTENT, viewPort.width / 2, viewPort.height / 2);
}

// Initialize canvas texture
function createTextTexture(viewPort) {
  const canvas = document.createElement("canvas");
  canvas.width = viewPort.width;
  canvas.height = viewPort.height;

  const ctx = canvas.getContext("2d", { alpha: true });
  drawTextOnCanvas(ctx, viewPort);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.format = THREE.RGBAFormat;

  return { canvas, ctx, texture };
}

// Setup mouse tracking
function setupMouseTracking(renderer, mouse, viewPort) {
  renderer.domElement.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX / viewPort.width;
    mouse.y = 1 - e.clientY / viewPort.height;
  });

  renderer.domElement.addEventListener("mouseleave", () => {
    mouse.set(0, 0);
  });
}

// Handle window resize
function setupResizeHandler(
  viewPort,
  camera,
  renderer,
  renderTargets,
  simMaterial,
  canvas,
  ctx,
  textTexture
) {
  window.addEventListener("resize", () => {
    viewPort.width = window.innerWidth;
    viewPort.height = window.innerHeight;

    camera.aspect = viewPort.width / viewPort.height;
    camera.updateMatrix();

    renderer.setSize(viewPort.width, viewPort.height);

    renderTargets.rtA.setSize(viewPort.width, viewPort.height);
    renderTargets.rtB.setSize(viewPort.width, viewPort.height);

    simMaterial.uniforms.uResolution.value.set(viewPort.width, viewPort.height);

    canvas.width = viewPort.width;
    canvas.height = viewPort.height;
    drawTextOnCanvas(ctx, viewPort);
    textTexture.needsUpdate = true;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initSmoothScrolling();

  const viewPort = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  // Setup scenes
  const simScene = new THREE.Scene();
  const scene = new THREE.Scene();

  // Setup camera and renderer
  const camera = createCamera(viewPort);
  const renderer = createRenderer(viewPort);
  document.querySelector(".webgl-container").appendChild(renderer.domElement);

  // Setup render targets
  const mouse = new THREE.Vector2();
  let frame = 0;
  const renderTargets = createRenderTargets(viewPort);

  // Create simulation material
  const simMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTextureA: { value: null },
      uMouse: { value: mouse },
      uResolution: {
        value: new THREE.Vector2(viewPort.width, viewPort.height),
      },
      uTime: { value: 0 },
      uFrame: { value: 0 },
    },
    vertexShader: simulationVertexShader,
    fragmentShader: simulationFragmentShader,
  });

  // Create render material
  const renderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTextureA: { value: null },
      uTextureB: { value: null },
    },
    vertexShader: renderVertexShader,
    fragmentShader: renderFragmentShader,
    transparent: true,
  });

  // Create meshes
  const plane = new THREE.PlaneGeometry(viewPort.width, viewPort.height, 2, 2);
  const simMesh = new THREE.Mesh(plane, simMaterial);
  const renderMesh = new THREE.Mesh(plane, renderMaterial);

  simScene.add(simMesh);
  scene.add(renderMesh);

  // Setup text texture
  const { canvas, ctx, texture: textTexture } = createTextTexture(viewPort);

  // Setup event listeners
  setupMouseTracking(renderer, mouse, viewPort);
  setupResizeHandler(
    viewPort,
    camera,
    renderer,
    renderTargets,
    simMaterial,
    canvas,
    ctx,
    textTexture
  );

  // Animation loop with ping-pong rendering
  function animate() {
    simMaterial.uniforms.uFrame.value = frame++;
    simMaterial.uniforms.uTime.value = performance.now() / 1000;

    // Simulation pass
    simMaterial.uniforms.uTextureA.value = renderTargets.rtA.texture;
    renderer.setRenderTarget(renderTargets.rtB);
    renderer.render(simScene, camera);

    // Render pass
    renderMaterial.uniforms.uTextureA.value = renderTargets.rtB.texture;
    renderMaterial.uniforms.uTextureB.value = textTexture;
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);

    requestAnimationFrame(animate);

    // Swap render targets (ping-pong)
    const temp = renderTargets.rtA;
    renderTargets.rtA = renderTargets.rtB;
    renderTargets.rtB = temp;
  }

  animate();
});
