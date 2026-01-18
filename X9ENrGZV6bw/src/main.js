import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

document.addEventListener("DOMContentLoaded", () => {
  gsap.registerPlugin(ScrollTrigger, SplitText);

  const lenis = new Lenis();
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));

  let tl = gsap.timeline({ delay: 0 });

  const viewPort = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

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
  console.log(viewPort.height);
  camera.position.z = distance;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 1);
  renderer.setSize(viewPort.width, viewPort.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputEncoding = THREE.LinearEncoding;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.0;

  document.querySelector(".webgl-container").appendChild(renderer.domElement);

  const COL = 5;
  const ROW = 4;
  const gap = 40; // タイル間の隙間(px)

  // 各タイルの表示サイズを計算
  let itemWidthX = (viewPort.width - gap * (COL - 1)) / COL;
  let itemWidthY = (viewPort.height - gap * (ROW - 1)) / ROW;

  // メッシュのサイズは画面全体のサイズにする
  const meshWidth = viewPort.width;
  const meshHeight = viewPort.height;
  const geometry = new THREE.PlaneGeometry(meshWidth, meshHeight, 2, 2);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
  });

  // colごとにgroupを作成
  const colGroups = new THREE.Group();

  // colGroupsにscaleを適用して、各タイルが適切なサイズで見えるようにする
  const scaleX = (itemWidthX / meshWidth) * 1.25;
  const scaleY = (itemWidthY / meshHeight) * 1.25;
  colGroups.scale.set(scaleX, scaleY, 1);

  for (let i = 0; i < COL; i++) {
    const group = new THREE.Group();
    for (let j = 0; j < ROW; j++) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.x = (i - (COL - 1) / 2) * (meshWidth + gap);
      mesh.position.y = (j - (ROW - 1) / 2) * (meshHeight + gap);
      group.add(mesh);
    }
    colGroups.add(group);
  }

  scene.add(colGroups);

  // 各メッシュの初期位置を設定
  // scaleが変わっても確実に画面外に隠すため、余裕を持った移動距離にする
  colGroups.children.forEach((colGroup, index) => {
    colGroup.children.forEach((mesh) => {
      if (index % 2 === 0) {
        // 偶数列は下から
        mesh.position.y += -meshHeight * ROW;
      } else {
        // 奇数列は上から
        mesh.position.y += meshHeight * ROW;
      }
    });
  });

  // 0,2,4の列のメッシュを下からアニメーション（stagger付き）
  const evenGroups = [
    colGroups.children[0],
    colGroups.children[2],
    colGroups.children[4],
  ];
  evenGroups.forEach((group) => {
    tl.to(
      group.children.map((mesh) => mesh.position),
      {
        y: (i) => (i - (ROW - 1) / 2) * (meshHeight + gap),
        duration: 3,
        ease: "power4.inOut",
        stagger: -0.2,
      },
      0, // 最初から開始
    );
  });

  // 1,3の列のメッシュを上からアニメーション（stagger付き）
  const oddGroups = [colGroups.children[1], colGroups.children[3]];
  oddGroups.forEach((group) => {
    tl.to(
      group.children.map((mesh) => mesh.position),
      {
        y: (i) => (i - (ROW - 1) / 2) * (meshHeight + gap),
        duration: 3,
        ease: "power4.inOut",
        stagger: 0.2,
      },
      0, // 最初から開始
    );
  });

  tl.to(
    colGroups.position,
    {
      y: viewPort.height / 2 + gap / 2,
      duration: 3,
      ease: "power4.inOut",
    },
    "-=2",
  );

  tl.to(
    colGroups.scale,
    {
      x: 1,
      y: 1,
      duration: 3,
      ease: "power4.inOut",
      stagger: -0.2,
    },
    "<",
  );

  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    viewPort.width = window.innerWidth;
    viewPort.height = window.innerHeight;
    camera.aspect = viewPort.width / viewPort.height;
    camera.updateMatrix();
    renderer.setSize(viewPort.width, viewPort.height);
  });
});
