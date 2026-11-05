import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { generationsOf } from "@/lib/chain";
import type { PersonKind } from "@/lib/data/types";
import { layoutForest, type TreeNode } from "@/lib/silsilaLayout";
import { personImageUrl } from "./Avatar";
import {
  createViewport,
  prefersCalm,
  type SceneApi,
  type SceneOptions,
} from "./sceneViewport";

// `quiet` et `ground` : chaînes pas encore reliées et ornement au sol, présents sans
// rivaliser avec l'arbre.
const PAPER = { ink: 0x000000, inkCss: "#000", paperCss: "#fff", faded: 0xd4d4d4, quiet: 0x9a9a9a, ground: 0xd9d9d9 };
const NIGHT = { ink: 0xffffff, inkCss: "#fff", paperCss: "#111", faded: 0x3a3a3a, quiet: 0x7a7a7a, ground: 0x333333 };
type Palette = typeof PAPER;
const GROW_SECONDS = 2.8;
// Côté de la vignette en pixels : l'arbre ne manipule jamais la photo de 400 px.
const PHOTO_PIXELS = 96;
const PHOTO_FADED = 0.2;

function canvasTexture(draw: (context: CanvasRenderingContext2D) => void) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  context.translate(size / 2, size / 2);
  draw(context);
  const texture = new THREE.CanvasTexture(canvas);
  // Sans mipmaps, le liseré blanc ne se mêle pas au noir : le contour reste net.
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

// Étoile à huit branches, motif classique de la géométrie islamique.
// Pleine pour un cheikh, évidée pour un mouqaddam.
function starTexture(hollow: boolean, palette: Palette) {
  return canvasTexture((context) => {
    const square = (half: number, color: string) => {
      context.fillStyle = color;
      for (const rotation of [0, Math.PI / 4]) {
        context.save();
        context.rotate(rotation);
        context.fillRect(-half, -half, half * 2, half * 2);
        context.restore();
      }
    };
    // Liseré blanc : l'étoile se détache du feuillage, noir comme elle.
    square(25, palette.paperCss);
    square(19, palette.inkCss);
    if (hollow) square(13, palette.paperCss);
  });
}

function dotTexture(palette: Palette) {
  return canvasTexture((context) => {
    context.fillStyle = palette.paperCss;
    context.beginPath();
    context.arc(0, 0, 54, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = palette.inkCss;
    context.beginPath();
    context.arc(0, 0, 40, 0, Math.PI * 2);
    context.fill();
  });
}

// TubeGeometry ne sait pas s'affiner : on construit nous-mêmes les anneaux.
function taperedTube(
  curve: THREE.Curve<THREE.Vector3>,
  segments: number,
  sides: number,
  startRadius: number,
  endRadius: number,
) {
  const frames = curve.computeFrenetFrames(segments, false);
  const positions: number[] = [];
  const indices: number[] = [];

  for (let ring = 0; ring <= segments; ring++) {
    const t = ring / segments;
    const center = curve.getPointAt(t);
    const radius = THREE.MathUtils.lerp(startRadius, endRadius, t);

    for (let side = 0; side <= sides; side++) {
      const angle = (side / sides) * Math.PI * 2;
      const normal = new THREE.Vector3()
        .addScaledVector(frames.normals[ring], Math.cos(angle))
        .addScaledVector(frames.binormals[ring], Math.sin(angle));
      positions.push(
        center.x + normal.x * radius,
        center.y + normal.y * radius,
        center.z + normal.z * radius,
      );
    }
  }

  for (let ring = 0; ring < segments; ring++) {
    for (let side = 0; side < sides; side++) {
      const a = ring * (sides + 1) + side;
      const b = a + sides + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
}

function inkMesh(geometries: THREE.BufferGeometry[], color: number, side: THREE.Side = THREE.FrontSide) {
  if (geometries.length === 0) return null;
  const merged = mergeGeometries(geometries, false);
  geometries.forEach((geometry) => geometry.dispose());
  // Matière non éclairée : l'arbre est une silhouette à l'encre, sans ombre.
  return new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ color, side }));
}

function buildBranches(nodes: TreeNode[], color: number) {
  const geometries = nodes.flatMap((node) => {
    if (!node.curve || !node.parent) return [];
    const leaf = node.children.length === 0;
    return taperedTube(
      node.curve,
      leaf ? 10 : 16,
      leaf ? 5 : 9,
      node.parent.radius * (leaf ? 0.4 : 0.92),
      node.radius * (leaf ? 0.45 : 1),
    );
  });
  return inkMesh(geometries, color);
}

// Racines : le tronc s'évase puis s'enfonce sous le médaillon.
function buildRoots(root: TreeNode | undefined, color: number) {
  if (!root?.children.length) return null;
  const count = 7;
  const geometries = Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 + 0.4;
    const reach = 3.2 + (index % 3) * 1.1;
    const outward = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const curve = new THREE.QuadraticBezierCurve3(
      root.position.clone().add(new THREE.Vector3(0, 1.3, 0)),
      root.position.clone().addScaledVector(outward, reach * 0.3),
      root.position.clone().addScaledVector(outward, reach).add(new THREE.Vector3(0, -0.5, 0)),
    );
    return taperedTube(curve, 12, 6, root.radius * 0.55, 0.012);
  });
  return inkMesh(geometries, color);
}

// Feuille en amande, dessinée à plat de la base (0, 0) à la pointe (0, 1).
const LEAF_OUTLINE = [
  [0, 0],
  [0.2, 0.22],
  [0.26, 0.5],
  [0.14, 0.78],
  [0, 1],
  [-0.14, 0.78],
  [-0.26, 0.5],
  [-0.2, 0.22],
];

function leafAt(base: THREE.Vector3, axis: THREE.Vector3, turn: number, size: number) {
  const frame = new THREE.Matrix4();
  const y = axis.clone().normalize();
  const x = new THREE.Vector3(y.z, turn, -y.x).cross(y).normalize();
  frame.makeBasis(x, y, new THREE.Vector3().crossVectors(x, y));
  frame.scale(new THREE.Vector3(size, size, size)).setPosition(base);

  const positions = LEAF_OUTLINE.flatMap(([px, py]) => new THREE.Vector3(px, py, 0).applyMatrix4(frame).toArray());
  const indices = LEAF_OUTLINE.slice(2).flatMap((_, index) => [0, index + 1, index + 2]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
}

// Feuillage de l'arbre de vie : par paires le long des rameaux, en bouquet au bout.
function buildLeaves(nodes: TreeNode[], scale: number, color: number) {
  const size = scale * 0.62;
  const geometries = nodes.flatMap((node) => {
    if (!node.curve || !node.parent || node.radius > 0.3) return [];
    const curve = node.curve;
    const length = curve.getLength();
    // Sur un rameau terminal, le feuillage garde le bout : le cœur de l'arbre reste aéré.
    const bare = node.children.length === 0 ? 0.6 : 0.3;
    const pairs = Math.max(Math.round((length * (1 - bare)) / (scale * 0.6)), 2);
    const leaves: THREE.BufferGeometry[] = [];

    for (let pair = 1; pair <= pairs; pair++) {
      const t = bare + ((1 - bare) * pair) / pairs;
      const base = curve.getPointAt(Math.min(t, 1));
      const tangent = curve.getTangentAt(Math.min(t, 1));
      const twist = (pair * 2.399 + node.depth) % (Math.PI * 2);
      const out = new THREE.Vector3(Math.cos(twist), 0.35, Math.sin(twist)).normalize();
      const across = new THREE.Vector3().crossVectors(tangent, out).normalize();
      for (const side of [1, -1]) {
        const axis = tangent.clone().multiplyScalar(0.75).addScaledVector(across, side);
        leaves.push(leafAt(base, axis, side * 0.6, size * (0.7 + 0.3 * Math.sin(pair * 1.7) ** 2)));
      }
    }
    return leaves;
  });
  return inkMesh(geometries, color, THREE.DoubleSide);
}

// Réduit la photo et la découpe en rond, avec un filet noir pour la détacher du feuillage.
async function photoTexture(node: TreeNode, ring: string) {
  const response = await fetch(personImageUrl(node.person));
  if (!response.ok) throw new Error(`Photo indisponible : ${node.person.id}`);
  const bitmap = await createImageBitmap(await response.blob(), {
    resizeWidth: PHOTO_PIXELS,
    resizeHeight: PHOTO_PIXELS,
    resizeQuality: "high",
  });

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = PHOTO_PIXELS;
  const context = canvas.getContext("2d")!;
  const center = PHOTO_PIXELS / 2;
  const disc = () => {
    context.beginPath();
    context.arc(center, center, center - 3, 0, Math.PI * 2);
  };
  context.save();
  disc();
  context.clip();
  context.drawImage(bitmap, 0, 0);
  context.restore();
  disc();
  context.lineWidth = 3;
  context.strokeStyle = ring;
  context.stroke();
  bitmap.close();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildPoints(nodes: TreeNode[], kinds: PersonKind[], material: THREE.PointsMaterial) {
  const group = nodes.filter((node) => kinds.includes(node.person.kind));
  const positions = new Float32Array(group.length * 3);
  group.forEach((node, index) => node.position.toArray(positions, index * 3));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(geometry, material);
}

// Médaillon au sol : une étoile {16/5} inscrite dans deux cercles.
function buildMedallion(radius: number, color: number) {
  const points: THREE.Vector3[] = [];
  const at = (index: number, scale = 1) => {
    const angle = (index / 16) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * radius * scale, 0, Math.sin(angle) * radius * scale);
  };
  for (let index = 0; index < 16; index++) points.push(at(index), at(index + 5));
  for (let index = 0; index < 96; index++) {
    const step = 16 / 96;
    points.push(at(index * step), at((index + 1) * step));
    points.push(at(index * step, 1.08), at((index + 1) * step, 1.08));
  }
  return new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color }),
  );
}

export function createScene(options: SceneOptions): SceneApi {
  const nodes = layoutForest(options.persons);
  const calm = prefersCalm();
  const palette = options.dark ? NIGHT : PAPER;

  // Le cadrage suit l'arbre principal : les chaînes à compléter restent en périphérie.
  const box = new THREE.Box3();
  nodes.filter((node) => node.connected).forEach((node) => box.expandByPoint(node.position));
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(sphere.radius, 6);
  const home = new THREE.Vector3(sphere.center.x, Math.max(sphere.center.y - radius * 0.14, 3), sphere.center.z);
  const scale = radius / 11;

  const dot = dotTexture(palette);
  const solidStar = starTexture(false, palette);
  const hollowStar = starTexture(true, palette);
  // Fond blanc sous chaque photo : estompée, elle ne laisse pas voir l'étoile en dessous.
  const backdrop = canvasTexture((context) => {
    context.fillStyle = palette.paperCss;
    context.beginPath();
    context.arc(0, 0, 60, 0, Math.PI * 2);
    context.fill();
  });
  const textures: THREE.Texture[] = [dot, solidStar, hollowStar, backdrop];

  let display = options.display ?? "photo";
  let disposed = false;
  const photoSize = scale * 1.05;
  const photos = new Map<TreeNode, { group: THREE.Group; sprite: THREE.Sprite }>();
  const deepest = Math.max(...nodes.map((node) => node.depth), 1);
  const generations = generationsOf(options.persons);
  let generation = options.generation ?? null;
  // Ce qui reste dessiné quand on isole une personne ou une génération.
  let kept: Set<TreeNode> | null = null;
  const showsPhoto = (node: TreeNode) => display === "photo" && photos.has(node);
  const isShown = (node: TreeNode) => !kept || kept.has(node);
  const inGeneration = (node: TreeNode) => generation === null || generations.get(node.person.id) === generation;
  const photoOpacity = (node: TreeNode) => {
    const lit = chain ? chain.has(node) : inGeneration(node);
    return lit ? 1 : PHOTO_FADED;
  };

  // Une photo manquante laisse simplement l'étoile et le nom à leur place.
  async function addPhoto(node: TreeNode) {
    const texture = await photoTexture(node, palette.inkCss);
    if (disposed) {
      texture.dispose();
      return;
    }
    textures.push(texture);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false }),
    );
    sprite.renderOrder = 4;
    sprite.material.opacity = photoOpacity(node);
    const backing = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: backdrop, transparent: true, depthWrite: false, depthTest: false }),
    );
    backing.renderOrder = 3;
    const group = new THREE.Group();
    group.add(backing, sprite);
    group.position.copy(node.position);
    group.scale.setScalar(photoSize);
    photos.set(node, { group, sprite });
    scene.add(group);
  }

  // Chemin de la chaîne choisie, parcouru par un point qui descend du Prophète ﷺ.
  const pathGroup = new THREE.Group();
  const pathMaterial = new THREE.MeshBasicMaterial({ color: palette.ink, depthTest: false });
  const pulse = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: dot, transparent: true, depthWrite: false, depthTest: false }),
  );
  pulse.scale.setScalar(scale * 0.9);
  pulse.visible = false;
  let pathCurve: THREE.CurvePath<THREE.Vector3> | null = null;
  // La chaîne choisie et, quand on l'isole, tout ce qui part de la personne.
  let chain: Set<TreeNode> | null = null;
  let focused: TreeNode | null = null;
  let isolated = false;
  const isolation = new THREE.Group();

  function descendants(node: TreeNode, found: TreeNode[] = []) {
    for (const child of node.children) {
      found.push(child);
      descendants(child, found);
    }
    return found;
  }

  function clearIsolation() {
    isolation.traverse((object) => {
      const item = object as THREE.Mesh;
      item.geometry?.dispose();
      (item.material as THREE.Material | undefined)?.dispose?.();
    });
    isolation.clear();
  }

  // Les branches qui mènent à une génération : on voit d'où elle vient, et rien après.
  function generationBranches() {
    if (generation === null) return null;
    const branches = new Set<TreeNode>();
    for (const node of nodes) {
      if (!inGeneration(node)) continue;
      for (let cursor: TreeNode | null = node; cursor; cursor = cursor.parent) branches.add(cursor);
    }
    return branches;
  }

  // On retrace les seules branches gardées plutôt que de redécouper le maillage commun.
  function showBranches() {
    clearIsolation();
    kept = isolated ? chain : generationBranches();
    for (const ink of [branches, young, leaves]) if (ink) ink.visible = !kept;
    if (roots) roots.visible = !kept || kept.has(trunk[0]);
    pointSets.forEach((set) => (set.visible = !kept));
    if (!kept) return;

    const group = [...kept];
    const parts = [buildBranches(group, palette.ink), buildLeaves(group, scale, palette.ink), ...pointSet(group, 1)];
    for (const part of parts) if (part) isolation.add(part);
  }

  function refreshFocus() {
    showPath(focused);
    chain = null;
    if (focused) {
      chain = new Set();
      for (let cursor: TreeNode | null = focused; cursor; cursor = cursor.parent) chain.add(cursor);
      if (isolated) descendants(focused).forEach((node) => chain!.add(node));
    }
    photos.forEach(({ sprite }, owner) => {
      sprite.material.opacity = photoOpacity(owner);
    });
    showBranches();
  }

  function showPath(node: TreeNode | null) {
    pathGroup.children.forEach((child) => (child as THREE.Mesh).geometry.dispose());
    pathGroup.clear();
    pathCurve = null;
    pulse.visible = false;
    if (!node) return;

    const links: TreeNode[] = [];
    for (let cursor: TreeNode | null = node; cursor?.parent; cursor = cursor.parent) links.unshift(cursor);
    if (links.length === 0) return;

    const curve = new THREE.CurvePath<THREE.Vector3>();
    for (const link of links) {
      curve.add(link.curve!);
      const thread = new THREE.Mesh(
        taperedTube(link.curve!, 12, 6, link.parent!.radius * 0.92, link.radius),
        pathMaterial,
      );
      thread.renderOrder = 1;
      pathGroup.add(thread);
    }
    pathCurve = curve;
    pulse.visible = !calm;
  }

  const { scene, api } = createViewport<TreeNode>({
    ...options,
    nodes,
    radius,
    home,
    homeDirection: new THREE.Vector3(0.55, 0.2, 0.8).normalize(),
    fit: 1.2,
    maxPolarAngle: Math.PI * 0.53,
    labelDelay: GROW_SECONDS * 0.75,
    labelLift: () => 0,
    outwardLabels: true,
    labelHidden: (node) => showsPhoto(node) || !isShown(node) || !inGeneration(node),
    pickable: isShown,
    focusFrame() {
      if (!isolated || !chain) return null;
      const box = new THREE.Box3();
      chain.forEach((node) => box.expandByPoint(node.position));
      const frame = box.getBoundingSphere(new THREE.Sphere());
      // Un peu d'air autour : les noms et les photos ne touchent pas le titre.
      frame.radius = Math.max(frame.radius * 1.2, 6);
      return frame;
    },
    labelClearance: (node) => (showsPhoto(node) ? photoSize / 2 : 0),
    focusDistance: (_node, homeDistance) => homeDistance * 0.5,
    onChoose(node) {
      // Plus personne de choisi : il n'y a plus rien à isoler.
      const leaving = isolated && !node;
      if (leaving) isolated = false;
      focused = node;
      refreshFocus();
      if (leaving) api.overview();
      // Tout est de la même encre : le reste de l'arbre s'efface pour laisser ressortir la chaîne.
      for (const ink of [branches, leaves, roots]) {
        (ink?.material as THREE.MeshBasicMaterial | undefined)?.color.setHex(node ? palette.faded : palette.ink);
      }
    },
    onFrame(elapsed) {
      const linear = Math.min(elapsed / GROW_SECONDS, 1);
      const progress = 1 - (1 - linear) ** 3;
      for (const ink of [branches, young, leaves]) {
        if (!ink) continue;
        const count = ink.geometry.index!.count;
        ink.geometry.setDrawRange(0, Math.floor((count * progress) / 3) * 3);
      }
      for (const set of pointSets) {
        set.geometry.setDrawRange(0, Math.ceil(set.geometry.attributes.position.count * progress));
      }
      photos.forEach(({ group }, owner) => {
        group.visible = display === "photo" && isShown(owner) && owner.depth <= progress * deepest;
      });
      if (!calm) medallion.rotation.y = -elapsed * 0.02;
      if (pathCurve && pulse.visible) {
        pathCurve.getPointAt((elapsed / 3.2) % 1, pulse.position);
      }
    },
    onDispose() {
      disposed = true;
      clearIsolation();
      showPath(null);
      pathMaterial.dispose();
      textures.forEach((texture) => texture.dispose());
    },
  });

  scene.add(isolation, pathGroup, pulse);

  const trunk = nodes.filter((node) => node.connected);
  const branches = buildBranches(trunk, palette.ink);
  const young = buildBranches(nodes.filter((node) => !node.connected), palette.quiet);
  const leaves = buildLeaves(trunk, scale, palette.ink);
  const roots = buildRoots(trunk[0], palette.ink);
  for (const ink of [branches, young, leaves, roots]) if (ink) scene.add(ink);
  const medallion = buildMedallion(Math.max(radius * 0.34, 5), palette.ground);
  scene.add(medallion);

  const pointMaterial = (size: number, map: THREE.Texture, opacity = 1) =>
    new THREE.PointsMaterial({
      size: scale * size,
      map,
      opacity,
      transparent: true,
      alphaTest: opacity * 0.5,
      depthWrite: false,
      depthTest: false,
    });
  const pointSet = (group: TreeNode[], opacity: number) => {
    const sets = [
      buildPoints(group, ["member"], pointMaterial(0.7, dot, opacity)),
      buildPoints(group, ["mouqaddam"], pointMaterial(1.5, hollowStar, opacity)),
      buildPoints(group, ["cheikh", "prophet"], pointMaterial(2.6, solidStar, opacity)),
    ];
    sets.forEach((set) => (set.renderOrder = 2));
    return sets;
  };
  const pointSets = [...pointSet(trunk, 1), ...pointSet(nodes.filter((node) => !node.connected), 0.45)];
  pointSets.forEach((set) => scene.add(set));

  nodes
    .filter((node) => node.person.hasImage)
    .forEach((node) => addPhoto(node).catch((error) => console.error(error)));

  if (generation !== null) refreshFocus();

  return {
    ...api,
    setGeneration(next) {
      generation = next;
      refreshFocus();
    },
    setDisplay(next) {
      display = next;
    },
    setIsolated(next) {
      isolated = next;
      api.select(focused?.person.id ?? null);
      if (!next) api.overview();
    },
  };
}
