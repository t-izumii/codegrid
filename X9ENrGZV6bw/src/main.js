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
  const gap = 20; // タイル間の隙間(px)

  let itemWidthX = (viewPort.width - gap * (COL - 1)) / COL;
  let itemWidthY = (viewPort.height - gap * (ROW - 1)) / ROW;

  // メッシュのサイズは画面全体のサイズにする
  const meshWidth = viewPort.width;
  const meshHeight = viewPort.height;
  const geometry = new THREE.PlaneGeometry(meshWidth, meshHeight, 2, 2);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
  });

  // 画面全体のサイズのメッシュが、itemWidthX/itemWidthY のサイズで見えるようにするためのスケールを計算
  const scaleX = itemWidthX / meshWidth;
  const scaleY = itemWidthY / meshHeight;

  // colごとにgroupを作成
  const colGroups = [];
  for (let i = 0; i < COL; i++) {
    const group = new THREE.Group();
    colGroups.push(group);
    for (let j = 0; j < ROW; j++) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.set(scaleX, scaleY, 1);
      mesh.position.x = (i - (COL - 1) / 2) * (itemWidthX + gap);
      mesh.position.y = (j - (ROW - 1) / 2) * (itemWidthY + gap);
      group.add(mesh);
    }
    scene.add(group);
  }

  // 各メッシュの初期位置を設定
  colGroups.forEach((colGroup, index) => {
    colGroup.children.forEach((mesh) => {
      if (index % 2 === 0) {
        // 偶数列は下から
        mesh.position.y += -viewPort.height;
      } else {
        // 奇数列は上から
        mesh.position.y += viewPort.height;
      }
    });
  });

  // 0,2,4の列のメッシュを下からアニメーション（stagger付き）
  const evenGroups = [colGroups[0], colGroups[2], colGroups[4]];
  evenGroups.forEach((group) => {
    tl.to(
      group.children.map((mesh) => mesh.position),
      {
        y: (i) => (i - (ROW - 1) / 2) * (itemWidthY + gap),
        duration: 3,
        ease: "power4.inOut",
        stagger: -0.2,
      },
      0, // 最初から開始
    );
  });

  // 1,3の列のメッシュを上からアニメーション（stagger付き）
  const oddGroups = [colGroups[1], colGroups[3]];
  oddGroups.forEach((group) => {
    tl.to(
      group.children.map((mesh) => mesh.position),
      {
        y: (i) => (i - (ROW - 1) / 2) * (itemWidthY + gap),
        duration: 3,
        ease: "power4.inOut",
        stagger: 0.2,
      },
      0, // 最初から開始
    );
  });

  tl.to(
    colGroups.map((group) => group.position),
    {
      y: viewPort.height / 2 + gap / 2,
      duration: 2,
      ease: "power4.inOut",
    },
  );

  // 全メッシュのスケールを1に戻す + 位置も調整してgapを保つ
  let isFirstMesh = true;
  colGroups.forEach((group, i) => {
    group.children.forEach((mesh, j) => {
      // scaleを1に戻す
      tl.to(
        mesh.scale,
        {
          x: 1,
          y: 1,
          duration: 2,
          ease: "power4.inOut",
        },
        isFirstMesh ? "<" : "<", // groupのアニメーションと同時に開始
      );

      // 位置も調整してgapを保つ
      tl.to(
        mesh.position,
        {
          x: (i - (COL - 1) / 2) * (meshWidth + gap),
          y: (j - (ROW - 1) / 2) * (meshHeight + gap),
          duration: 2,
          ease: "power4.inOut",
        },
        "<", // scaleのアニメーションと同時に開始
      );

      isFirstMesh = false;
    });
  });

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
