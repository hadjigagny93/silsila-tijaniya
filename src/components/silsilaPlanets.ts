import * as THREE from "three";
import { BODY, layoutOrbits, moveOrbits, type OrbitNode } from "@/lib/silsilaOrbits";
import {
  buildMotes,
  createViewport,
  glowTexture,
  prefersCalm,
  type SceneApi,
  type SceneOptions,
} from "./sceneViewport";

const WHITE = 0xffffff;
const GOLD = 0xffcf70;
const ACCENT = 0x8db9f2;
const FORM_SECONDS = 2.4;

type Ring = {
  owner: OrbitNode;
  shell: number;
  line: THREE.LineLoop;
  material: THREE.LineBasicMaterial;
};

// Chaque lignée reçoit une part du spectre, qu'elle partage entre ses disciples :
// une famille spirituelle garde des teintes voisines, de génération en génération.
function assignTints(
  node: OrbitNode,
  from: number,
  to: number,
  tints: Map<OrbitNode, THREE.Color>,
) {
  tints.set(node, new THREE.Color().setHSL((((from + to) / 2) % 360) / 360, 0.9, 0.68));
  let start = from;
  const total = node.weight - 1;
  for (const child of node.children) {
    const span = ((to - from) * child.weight) / total;
    assignTints(child, start, start + span, tints);
    start += span;
  }
}

export function createScene(options: SceneOptions): SceneApi {
  const { main, nodes } = layoutOrbits(options.persons);
  const calm = prefersCalm();
  const radius = Math.max(main.extent, 6);

  // Plus un astre a transmis, plus il brille. Même un disciple reste bien visible.
  const peak = Math.log(Math.max(main.weight, 2));
  const brightness = (node: OrbitNode) => 0.55 + 0.45 * (Math.log(node.weight) / peak);

  const tints = new Map<OrbitNode, THREE.Color>();
  assignTints(main, 25, 285, tints);
  tints.get(main)!.set(GOLD);
  const others = nodes.filter((node) => !node.parent && node !== main);
  others.forEach((system, index) => {
    const span = 80 / others.length;
    assignTints(system, 300 + index * span, 300 + (index + 1) * span, tints);
  });

  const dot = glowTexture();
  const matrix = new THREE.Matrix4();
  const shade = new THREE.Color();

  // Orbites : un seul cercle partagé, déplacé et agrandi pour chaque anneau.
  const circle = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 128 }, (_, index) => {
      const angle = (index / 128) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    }),
  );
  const ringBright = new THREE.LineBasicMaterial({ color: ACCENT });
  const ringOpacity = (owner: OrbitNode) => (owner.depth < 2 ? 0.5 : 0.3);
  const rings: Ring[] = nodes.flatMap((owner) =>
    owner.shells.map((shell, index) => {
      const material = new THREE.LineBasicMaterial({
        color: tints.get(owner),
        transparent: true,
        opacity: ringOpacity(owner),
      });
      const line = new THREE.LineLoop(circle, material);
      line.quaternion.copy(shell.tilt);
      return { owner, shell: index, line, material };
    }),
  );

  // Chaîne choisie : un fil relie chaque astre à son centre, et une lumière le parcourt.
  let chain: OrbitNode[] = [];
  const thread = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: ACCENT, depthTest: false }),
  );
  thread.renderOrder = 1;
  thread.frustumCulled = false;
  const pulse = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: dot,
      color: WHITE,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  pulse.scale.setScalar(BODY * 2);
  pulse.visible = false;

  function paint(level: (node: OrbitNode) => number) {
    const colors = glow.geometry.attributes.color as THREE.BufferAttribute;
    nodes.forEach((node, index) => {
      const value = level(node);
      const tint = tints.get(node)!;
      planets.setColorAt(index, shade.copy(tint).multiplyScalar(value));
      shade.copy(tint).multiplyScalar(value ** 2.5);
      colors.setXYZ(index, shade.r, shade.g, shade.b);
    });
    planets.instanceColor!.needsUpdate = true;
    colors.needsUpdate = true;
  }

  function showChain(node: OrbitNode | null) {
    chain = [];
    for (let cursor = node; cursor; cursor = cursor.parent) chain.unshift(cursor);
    thread.geometry.dispose();
    thread.geometry = new THREE.BufferGeometry().setFromPoints(chain.map((link) => link.position));
    thread.visible = chain.length > 1;
    pulse.visible = chain.length > 1 && !calm;

    const inChain = new Set(chain);
    // Le reste de l'univers s'efface pour faire ressortir la chaîne choisie.
    paint(node ? (body) => (inChain.has(body) ? 1 : brightness(body) * 0.25) : brightness);

    for (const { owner, shell, line, material } of rings) {
      const onChain = chain.some((link) => link.parent === owner && link.shell === shell);
      material.opacity = ringOpacity(owner) * (node ? 0.3 : 1);
      line.material = onChain ? ringBright : material;
    }
  }

  const { scene, api } = createViewport<OrbitNode>({
    ...options,
    nodes,
    radius,
    home: new THREE.Vector3(),
    homeDirection: new THREE.Vector3(0.1, 0.62, 0.78).normalize(),
    fit: 0.95,
    maxPolarAngle: Math.PI,
    labelDelay: FORM_SECONDS * 0.7,
    labelLift: (node) => node.body,
    // On reste à distance : la place de l'astre dans son système compte plus que l'astre.
    focusDistance: (node, homeDistance) => Math.max(node.extent * 5, homeDistance * 0.5),
    onChoose: showChain,
    onFrame(elapsed) {
      const linear = Math.min(elapsed / FORM_SECONDS, 1);
      const spread = 1 - (1 - linear) ** 3;
      const time = calm ? 0 : elapsed;
      moveOrbits(nodes, time, spread);

      const glowing = glow.geometry.attributes.position as THREE.BufferAttribute;
      nodes.forEach((node, index) => {
        matrix.makeScale(node.body, node.body, node.body).setPosition(node.position);
        planets.setMatrixAt(index, matrix);
        node.position.toArray(glowing.array, index * 3);
      });
      planets.instanceMatrix.needsUpdate = true;
      glowing.needsUpdate = true;
      planets.computeBoundingSphere();

      for (const { owner, shell, line } of rings) {
        line.position.copy(owner.position);
        line.scale.setScalar(owner.shells[shell].radius * spread);
      }

      if (chain.length > 1) {
        const line = thread.geometry.attributes.position as THREE.BufferAttribute;
        chain.forEach((link, index) => link.position.toArray(line.array, index * 3));
        line.needsUpdate = true;
        const travel = ((time / 3.2) % 1) * (chain.length - 1);
        const step = Math.min(Math.floor(travel), chain.length - 2);
        pulse.position.lerpVectors(chain[step].position, chain[step + 1].position, travel - step);
      }

      stars.rotation.y = calm ? 0 : elapsed * 0.006;
    },
    onDispose() {
      dot.dispose();
      ringBright.dispose();
      rings.forEach(({ material }) => material.dispose());
    },
  });

  // Matière non éclairée : aucune ombre ne vient brouiller la luminosité de chaque astre.
  const planets = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 24, 16),
    new THREE.MeshBasicMaterial({ color: WHITE }),
    Math.max(nodes.length, 1),
  );
  planets.count = nodes.length;
  scene.add(planets);

  const glowGeometry = new THREE.BufferGeometry();
  glowGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(nodes.length * 3), 3));
  glowGeometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(nodes.length * 3), 3));
  const glow = new THREE.Points(
    glowGeometry,
    new THREE.PointsMaterial({
      size: BODY * 12,
      map: dot,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  glow.frustumCulled = false;
  scene.add(glow);
  paint(brightness);

  rings.forEach(({ line }) => scene.add(line));
  scene.add(thread, pulse);

  const stars = buildMotes(radius * 2.2, radius * 2.4, dot, 0xbcd0ff);
  stars.position.y = -radius * 1.2;
  scene.add(stars);

  // Une chaîne passe aussi par le Prophète ﷺ, qui n'est pas un astre de cette vue :
  // le choisir revient au centre.
  const known = new Set(nodes.map((node) => node.person.id));
  return {
    ...api,
    select: (id) => api.select(id && !known.has(id) ? main.person.id : id),
  };
}
