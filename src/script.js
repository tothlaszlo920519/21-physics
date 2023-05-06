import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "lil-gui";
import * as CANNON from "cannon-es";

/**
 * Debug
 */
const gui = new dat.GUI();

const debugObject = {};

debugObject.createSphere = () => {
  console.log("log create sphere");
};

debugObject.createCube = () => {
  console.log("log create sphere");
};

debugObject.reset = () => {
  for (const shape of myShapes) {
    // Remove
    shape.body.removeEventListener("collide", playHitSound);
    world.removeBody(shape.body);

    // Remove mesh
    scene.remove(shape.mesh);
  }

  myShapes.splice(0, myShapes.length);
};

gui.add(debugObject, "createSphere");
gui.add(debugObject, "createCube");
gui.add(debugObject, "reset");

/**
 * Base
 */
// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

/**
 * Sounds
 */
const hitSound = new Audio("sounds/hit.mp3");
const playHitSound = (collision) => {
  if (collision.contact.getImpactVelocityAlongNormal() > 1.5) {
    hitSound.value = Math.random();
    hitSound.currentTime = 0;
    hitSound.play();
  }
};

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader();
const cubeTextureLoader = new THREE.CubeTextureLoader();

const environmentMapTexture = cubeTextureLoader.load([
  "textures/environmentMaps/0/px.png",
  "textures/environmentMaps/0/nx.png",
  "textures/environmentMaps/0/py.png",
  "textures/environmentMaps/0/ny.png",
  "textures/environmentMaps/0/pz.png",
  "textures/environmentMaps/0/nz.png",
]);

/**
 * Physics
 */
const world = new CANNON.World();
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
world.gravity.set(0, -9.82, 0);

// Materials
// It is the harder way
// const concreteMaterial = new CANNON.Material("concrete");
// const plasticMaterial = new CANNON.Material("plastic");

// const concretePlatiscContactMaterial = new CANNON.ContactMaterial(
//   concreteMaterial,
//   plasticMaterial,
//   {
//     friction: 0.1,
//     restitution: 0.7,
//   }
// );

// simpler way
const defaultMaterial = new CANNON.Material("default");

const defaultContactMaterial = new CANNON.ContactMaterial(
  defaultMaterial,
  defaultMaterial,
  {
    friction: 0.1,
    restitution: 0.7,
  }
);

world.addContactMaterial(defaultContactMaterial);
world.defaultContactMaterial = defaultContactMaterial;

// Floor
const floorShape = new CANNON.Plane();
const floorBody = new CANNON.Body();
floorBody.mass = 0;
floorBody.addShape(floorShape);
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5);
world.addBody(floorBody);

/**
 * Floor
 */
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshStandardMaterial({
    color: "#777777",
    metalness: 0.3,
    roughness: 0.4,
    envMap: environmentMapTexture,
    envMapIntensity: 0.5,
  })
);
floor.receiveShadow = true;
floor.rotation.x = -Math.PI * 0.5;
scene.add(floor);

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.far = 15;
directionalLight.shadow.camera.left = -7;
directionalLight.shadow.camera.top = 7;
directionalLight.shadow.camera.right = 7;
directionalLight.shadow.camera.bottom = -7;
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(-3, 3, 3);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Utils
 */
const sphereGeometry = new THREE.SphereGeometry(1, 20, 20);
const sphereMaterial = new THREE.MeshStandardMaterial({
  metalness: 0.3,
  roughness: 0.4,
  envMap: environmentMapTexture,
});
let previousRadious;

const createSphere = (radius, { x, y, z }) => {
  const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
  mesh.scale.set(radius, radius, radius);
  mesh.castShadow = true;
  mesh.position.set(x, y, z);
  scene.add(mesh);

  // Cannon.js body
  const shape = new CANNON.Sphere(radius);
  const body = new CANNON.Body({
    mass: 1,
    position: new CANNON.Vec3(0, 3, 0),
    shape,
    material: defaultMaterial,
  });
  body.position.copy(mesh.position);
  body.addEventListener("collide", playHitSound);
  world.addBody(body);

  // updatePostiion
  const updatePostiion = () => mesh.position.copy(body.position);

  return {
    updatePostiion,
    mesh,
    body,
  };
};

const myShapes = [];
myShapes.push(createSphere(0.5, new THREE.Vector3(0, 3, 0)));

// Add new spheres on click
debugObject.createSphere = () => {
  myShapes.push(
    createSphere(
      Math.random(),
      new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 10,
        (Math.random() - 0.5) * 10
      )
    )
  );
};

// Cubes
const boxGeometry = new THREE.BoxGeometry(1, 1);
const boxMaterial = new THREE.MeshStandardMaterial({
  metalness: 0.3,
  roughness: 0.4,
  envMap: environmentMapTexture,
});

const createCubes = ({ width, height, depth }, { x, y, z }) => {
  // Three.js part
  const mesh = new THREE.Mesh(boxGeometry, boxMaterial);
  mesh.scale.set(width, height, depth);
  mesh.castShadow = true;
  mesh.position.set(x, y, z);
  scene.add(mesh);

  // Cannon.js part - Physics
  const shape = new CANNON.Box(
    new CANNON.Vec3(width / 2, height / 2, depth / 2)
  );
  const body = new CANNON.Body({
    mass: 1,
    position: new CANNON.Vec3(0, 3, 0),
    shape,
    material: defaultMaterial,
  });
  body.position.copy(mesh.position);
  body.addEventListener("collide", playHitSound);
  world.addBody(body);

  // updatePostiion
  const updatePostiion = () => {
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  };

  return {
    updatePostiion,
    mesh,
    body,
  };
};

// Add new cube on click
debugObject.createCube = () => {
  myShapes.push(
    createCubes(
      {
        width: Math.random(),
        height: Math.random(),
        depth: Math.random(),
      },
      new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 10,
        (Math.random() - 0.5) * 10
      )
    )
  );
};

/**
 * Animate
 */
const clock = new THREE.Clock();
let oldElapsedTime = 0;

const tick = () => {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - oldElapsedTime;
  oldElapsedTime = elapsedTime;

  // Update physics world
  world.step(1 / 60, deltaTime, 3);
  myShapes.forEach((mySphere) => mySphere.updatePostiion());

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
