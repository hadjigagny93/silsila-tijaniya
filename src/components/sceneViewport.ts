import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { PublicPerson } from "@/lib/data/types";

export type { SceneApi, SceneOptions, TreeDisplay } from "./sceneTypes";
import type { SceneApi, SceneOptions } from "./sceneTypes";
import { prefersCalm } from "./sceneTypes";

export { prefersCalm };

export type SceneNode = {
  person: PublicPerson;
  position: THREE.Vector3;
  connected: boolean;
};

type ViewportOptions<T extends SceneNode> = SceneOptions & {
  nodes: T[];
  radius: number;
  home: THREE.Vector3;
  homeDirection: THREE.Vector3;
  fit: number;
  maxPolarAngle: number;
  labelDelay: number;
  // Hauteur du nom au-dessus du point, pour ne pas écrire sur un astre.
  labelLift(node: T): number;
  // Noms écrits à côté du point, vers l'extérieur, pour ne pas barrer le tronc.
  outwardLabels?: boolean;
  // Vrai quand le nom permanent cède la place à autre chose, comme une photo.
  labelHidden?(node: T): boolean;
  // Rayon de ce qui entoure le point, que le nom survolé doit contourner.
  labelClearance?(node: T): number;
  // Faux pour ce qui est masqué : on ne doit pas pouvoir le survoler ni le choisir.
  pickable?(node: T): boolean;
  // Zone à cadrer quand un point est choisi, si elle dépasse le point lui-même.
  focusFrame?(node: T): THREE.Sphere | null;
  focusDistance(node: T, homeDistance: number): number;
  onChoose(node: T | null): void;
  onFrame(elapsed: number): void;
  onDispose(): void;
};


export function glowTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  const glow = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  glow.addColorStop(0, "rgba(255, 255, 255, 1)");
  glow.addColorStop(0.25, "rgba(255, 255, 255, 0.65)");
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export function buildMotes(radius: number, height: number, texture: THREE.Texture, color: number) {
  const positions = new Float32Array(260 * 3);
  for (let index = 0; index < 260; index++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * radius;
    positions.set(
      [Math.cos(angle) * distance, Math.random() * height, Math.sin(angle) * distance],
      index * 3,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: radius * 0.012,
      map: texture,
      color,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
}

// Socle commun aux vues 3D : caméra, sélection, noms, zoom et boucle de rendu.
export function createViewport<T extends SceneNode>(options: ViewportOptions<T>) {
  const { container, labels, nodes, radius, home, homeDirection, onSelect } = options;
  const byId = new Map(nodes.map((node) => [node.person.id, node]));
  const calm = prefersCalm();

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, Math.max(800, radius * 30));
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.maxPolarAngle = options.maxPolarAngle;
  controls.autoRotate = !calm;
  controls.autoRotateSpeed = 0.45;

  // Noms permanents : les cheikhs. Les autres apparaissent au survol.
  const steady = nodes
    .filter((node) => node.person.kind === "prophet" || node.person.kind === "cheikh")
    .sort((a, b) => Number(b.connected) - Number(a.connected))
    .map((node) => {
      const element = document.createElement("span");
      element.className = "tree-label";
      element.textContent = node.person.displayName;
      labels.appendChild(element);
      return { node, element };
    });
  const pointed = document.createElement("span");
  pointed.className = "tree-label tree-label-active";
  labels.appendChild(pointed);

  let selected: T | null = null;
  let hovered: T | null = null;
  let width = 1;
  let height = 1;
  let homeDistance = 1;

  const tween = {
    active: false,
    t: 0,
    fromTarget: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
    fromCamera: new THREE.Vector3(),
    toCamera: new THREE.Vector3(),
  };
  // La caméra accompagne un astre choisi pendant qu'il se déplace.
  const followed = new THREE.Vector3();
  const drift = new THREE.Vector3();

  function flyTo(target: THREE.Vector3, cameraPosition: THREE.Vector3) {
    tween.active = !calm;
    tween.t = 0;
    tween.fromTarget.copy(controls.target);
    tween.toTarget.copy(target);
    tween.fromCamera.copy(camera.position);
    tween.toCamera.copy(cameraPosition);
    if (calm) {
      controls.target.copy(target);
      camera.position.copy(cameraPosition);
    }
  }

  function homeCamera() {
    return home.clone().addScaledVector(homeDirection, homeDistance);
  }

  function resize() {
    width = Math.max(container.clientWidth, 1);
    height = Math.max(container.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);

    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    homeDistance = ((radius / Math.sin(halfFov)) * options.fit) / Math.min(camera.aspect, 1) ** 0.6;
    controls.minDistance = Math.max(radius * 0.04, 1.5);
    controls.maxDistance = homeDistance * 1.5;
    if (!selected && !tween.active) {
      controls.target.copy(home);
      camera.position.copy(homeCamera());
    }
  }

  const probe = new THREE.Vector3();

  function project(position: THREE.Vector3) {
    probe.copy(position).project(camera);
    return { x: (probe.x * 0.5 + 0.5) * width, y: (-probe.y * 0.5 + 0.5) * height, behind: probe.z > 1 };
  }

  const up = new THREE.Vector3();
  const lifted = new THREE.Vector3();

  function labelPoint(node: T) {
    up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    return project(lifted.copy(node.position).addScaledVector(up, options.labelLift(node)));
  }

  function pick(x: number, y: number, tolerance: number) {
    let best: T | null = null;
    let bestDistance = tolerance;
    for (const node of nodes) {
      if (options.pickable && !options.pickable(node)) continue;
      const screen = project(node.position);
      if (screen.behind) continue;
      const distance = Math.hypot(screen.x - x, screen.y - y);
      if (distance < bestDistance) {
        best = node;
        bestDistance = distance;
      }
    }
    return best;
  }

  function select(id: string | null) {
    selected = id ? (byId.get(id) ?? null) : null;
    options.onChoose(selected);
    if (!selected) return;
    followed.copy(selected.position);
    controls.autoRotate = false;
    const direction = camera.position.clone().sub(controls.target).normalize();
    const frame = options.focusFrame?.(selected);
    const target = frame?.center ?? selected.position;
    const distance = frame
      ? (frame.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * options.fit
      : options.focusDistance(selected, homeDistance);
    flyTo(target, target.clone().addScaledVector(direction, distance));
  }

  function onMove(event: PointerEvent) {
    if (event.pointerType === "touch" || event.buttons) return;
    const bounds = renderer.domElement.getBoundingClientRect();
    hovered = pick(event.clientX - bounds.left, event.clientY - bounds.top, 16);
    renderer.domElement.style.cursor = hovered ? "pointer" : "grab";
  }

  let pressX = 0;
  let pressY = 0;
  function onDown(event: PointerEvent) {
    pressX = event.clientX;
    pressY = event.clientY;
  }
  function onUp(event: PointerEvent) {
    if (Math.hypot(event.clientX - pressX, event.clientY - pressY) > 6) return;
    const bounds = renderer.domElement.getBoundingClientRect();
    const tolerance = event.pointerType === "touch" ? 28 : 16;
    const node = pick(event.clientX - bounds.left, event.clientY - bounds.top, tolerance);
    select(node?.person.id ?? null);
    onSelect(node?.person.id ?? null);
  }
  function onLeave() {
    hovered = null;
  }
  function stopFlight() {
    tween.active = false;
    controls.autoRotate = false;
  }

  // La molette doit faire défiler la page ; ctrl + molette (ou le pincement) zoome.
  function onWheel(event: WheelEvent) {
    if (!event.ctrlKey && !event.metaKey) event.stopPropagation();
  }

  renderer.domElement.addEventListener("pointermove", onMove);
  renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointerup", onUp);
  renderer.domElement.addEventListener("pointerleave", onLeave);
  container.addEventListener("wheel", onWheel, { capture: true });
  controls.addEventListener("start", stopFlight);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  // Le côté d'un nom ne change qu'une fois franchie cette marge, sinon il sauterait
  // d'un bord à l'autre à chaque passage devant l'axe pendant la rotation.
  const sides = new Map<HTMLElement, number>();

  function placeLabel(element: HTMLElement, screen: { x: number; y: number }, halfWidth: number, clearance = 0) {
    if (!options.outwardLabels) {
      element.style.transform = `translate(${screen.x}px, ${screen.y}px) translate(-50%, -170%)`;
      return screen;
    }
    const offCenter = screen.x - project(home).x;
    const side = Math.abs(offCenter) > 30 ? Math.sign(offCenter) : (sides.get(element) ?? 1);
    sides.set(element, side);
    // Près d'un bord, le nom repasse de l'autre côté plutôt que de sortir de l'écran.
    const reach = side * (halfWidth + 11 + clearance);
    const fits = Math.abs(screen.x + reach - width / 2) + halfWidth < width / 2;
    const x = THREE.MathUtils.clamp(screen.x + (fits ? reach : -reach), halfWidth, width - halfWidth);
    element.style.transform = `translate(${x}px, ${screen.y}px) translate(-50%, -50%)`;
    return { x, y: screen.y };
  }

  function updateLabels(ready: boolean) {
    const taken: { x: number; y: number; halfWidth: number }[] = [];
    // Sur téléphone, le titre et la recherche occupent toute la largeur du haut.
    const topOverlay = container.parentElement?.querySelector<HTMLElement>("[data-tree-top]");
    const safeTop = width < 640 && topOverlay ? topOverlay.offsetHeight : 0;
    const active = hovered ?? selected;

    if (active) {
      const screen = labelPoint(active);
      pointed.textContent = active.person.displayName;
      pointed.style.opacity = screen.behind ? "0" : "1";
      const halfWidth = pointed.offsetWidth / 2;
      const depth = camera.position.distanceTo(active.position);
      const pixels = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * depth);
      const clearance = (options.labelClearance?.(active) ?? 0) * pixels;
      taken.push({ ...placeLabel(pointed, screen, halfWidth, clearance), halfWidth });
    } else {
      pointed.style.opacity = "0";
    }

    // Du haut de la chaîne vers le bas : les noms les plus anciens restent prioritaires.
    for (const { node, element } of steady) {
      const screen = labelPoint(node);
      const halfWidth = element.offsetWidth / 2;
      const spot = placeLabel(element, screen, halfWidth);
      const crowded = taken.some(
        (other) =>
          Math.abs(other.x - spot.x) < other.halfWidth + halfWidth + 8 &&
          Math.abs(other.y - spot.y) < (options.outwardLabels ? 17 : 24),
      );
      const hidden = options.labelHidden?.(node) ?? false;
      const visible = !screen.behind && !crowded && !hidden && node !== active && ready && screen.y > safeTop + 24;
      element.style.opacity = visible ? "1" : "0";
      if (visible) taken.push({ ...spot, halfWidth });
    }
  }

  const start = performance.now();
  let last = start;

  function tick(now: number) {
    const delta = (now - last) / 1000;
    last = now;
    // La première image peut être horodatée juste avant `start`.
    const elapsed = Math.max((now - start) / 1000, 0);
    options.onFrame(calm ? Number.MAX_SAFE_INTEGER : elapsed);

    if (selected) {
      drift.copy(selected.position).sub(followed);
      followed.copy(selected.position);
      camera.position.add(drift);
      controls.target.add(drift);
      tween.fromTarget.add(drift);
      tween.toTarget.add(drift);
      tween.fromCamera.add(drift);
      tween.toCamera.add(drift);
    }

    if (tween.active) {
      tween.t = Math.min(tween.t + delta / 1.1, 1);
      const eased = tween.t * tween.t * (3 - 2 * tween.t);
      controls.target.lerpVectors(tween.fromTarget, tween.toTarget, eased);
      camera.position.lerpVectors(tween.fromCamera, tween.toCamera, eased);
      if (tween.t === 1) tween.active = false;
    }

    controls.update();
    renderer.render(scene, camera);
    updateLabels(calm || elapsed > options.labelDelay);
  }

  // Pas de rendu quand la scène est hors de l'écran.
  let running = false;
  function setRunning(next: boolean) {
    if (next === running) return;
    running = next;
    last = performance.now();
    renderer.setAnimationLoop(next ? tick : null);
  }
  const visibility = new IntersectionObserver(([entry]) => setRunning(entry.isIntersecting));
  visibility.observe(container);

  const api: SceneApi = {
    select,
    zoom(factor) {
      stopFlight();
      const offset = camera.position.clone().sub(controls.target).multiplyScalar(factor);
      const distance = THREE.MathUtils.clamp(offset.length(), controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).add(offset.setLength(distance));
    },
    overview() {
      flyTo(home, homeCamera());
    },
    reset() {
      select(null);
      onSelect(null);
      flyTo(home, homeCamera());
      controls.autoRotate = !calm;
    },
    dispose() {
      setRunning(false);
      visibility.disconnect();
      resizeObserver.disconnect();
      container.removeEventListener("wheel", onWheel, { capture: true });
      controls.dispose();
      options.onDispose();
      scene.traverse((object) => {
        const item = object as THREE.Mesh;
        item.geometry?.dispose();
        (item.material as THREE.Material | undefined)?.dispose?.();
      });
      renderer.dispose();
      renderer.domElement.remove();
      labels.replaceChildren();
    },
  };

  return { scene, api };
}
