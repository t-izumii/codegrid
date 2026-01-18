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

document.addEventListener("DOMContentLoaded", () => {
  gsap.registerPlugin(ScrollTrigger, SplitText);

  const lenis = new Lenis();
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));

  const viewPort = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  const simScene = new THREE.Scene();
  const scene = new THREE.Scene();
  const fov = 50;
  const fovRad = (fov / 2) * (Math.PI / 180);
  let distance = viewPort.height / 2 / Math.tan(fovRad);

  const camera = new THREE.PerspectiveCamera(
    fov,
    viewPort.width / viewPort.height,
    0.1,
    10000,
  );
  camera.position.z = distance;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setClearColor(0x000000, 1);
  renderer.setSize(viewPort.width, viewPort.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputEncoding = THREE.LinearEncoding;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.0;

  document.querySelector(".webgl-container").appendChild(renderer.domElement);

  const mouse = new THREE.Vector2();
  let frame = 0;
  const options = {
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    stencilBuffer: false,
    depthBuffer: false,
  };

  let rtA = new THREE.WebGLRenderTarget(
    viewPort.width,
    viewPort.height,
    options,
  );
  let rtB = new THREE.WebGLRenderTarget(
    viewPort.width,
    viewPort.height,
    options,
  );

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

  const renderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTextureA: { value: null },
      uTextureB: { value: null },
    },
    vertexShader: renderVertexShader,
    fragmentShader: renderFragmentShader,
    transparent: true,
  });

  const plane = new THREE.PlaneGeometry(viewPort.width, viewPort.height, 2, 2);
  const simMesh = new THREE.Mesh(plane, simMaterial);
  const renderMesh = new THREE.Mesh(plane, renderMaterial);

  simScene.add(simMesh);
  scene.add(renderMesh);

  const canvas = document.createElement("canvas");
  canvas.width = viewPort.width;
  canvas.height = viewPort.height;

  const ctx = canvas.getContext("2d", { alpha: true });
  ctx.fillStyle = "#fb74277";
  ctx.fillRect(0, 0, viewPort.width, viewPort.height);

  const fontSize = 100;
  ctx.fillStyle = "#fef4b8";
  ctx.font = `bold ${fontSize}px PP Neue Montreal`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.textRendering = "geometricPrecision";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillText("PNRM CREATIVE", viewPort.width / 2, viewPort.height / 2);

  const textTexture = new THREE.CanvasTexture(canvas);
  textTexture.minFilter = THREE.LinearFilter;
  textTexture.magFilter = THREE.LinearFilter;
  textTexture.format = THREE.RGBAFormat;

  window.addEventListener("resize", () => {
    viewPort.width = window.innerWidth;
    viewPort.height = window.innerHeight;
    camera.aspect = viewPort.width / viewPort.height;
    camera.updateMatrix();
    renderer.setSize(viewPort.width, viewPort.height);
    rtA.setSize(viewPort.width, viewPort.height);
    rtB.setSize(viewPort.width, viewPort.height);
    simMaterial.uniforms.uResolution.value.set(viewPort.width, viewPort.height);

    canvas.width = viewPort.width;
    canvas.height = viewPort.height;

    ctx.fillStyle = "#fb74277";
    ctx.fillRect(0, 0, viewPort.width, viewPort.height);

    textTexture.needsUpdate = true;
  });

  renderer.domElement.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX / viewPort.width;
    mouse.y = 1 - e.clientY / viewPort.height;
  });

  renderer.domElement.addEventListener("mouseLeave", (e) => {
    mouse.set(0, 0);
  });

  function animate() {
    simMaterial.uniforms.uFrame.value = frame++;
    simMaterial.uniforms.uTime.value = performance.now() / 1000;

    simMaterial.uniforms.uTextureA.value = rtA.texture;
    renderer.setRenderTarget(rtB);
    renderer.render(simScene, camera);

    renderMaterial.uniforms.uTextureA.value = rtB.texture;
    renderMaterial.uniforms.uTextureB.value = textTexture;

    renderer.setRenderTarget(null);
    renderer.render(scene, camera);

    requestAnimationFrame(animate);

    const temp = rtA;
    rtA = rtB;
    rtB = temp;
  }
  animate();
});
