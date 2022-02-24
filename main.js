import './style.css'

import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let camera, scene, renderer;
let controls, water, sun;

const loader = new GLTFLoader();

function random(min, max) {
  return Math.random() * (max - min) + min;
}

class Boat {
  constructor() {
    loader.load("textures/ship.glb", (gltf) => {
      scene.add(gltf.scene);
      gltf.scene.scale.set(15, 20, 15);
      gltf.scene.position.set(0, 4, 0);
      this.boat = gltf.scene
      this.speed = {
        vel: 0,
        rot: 0
      }
    })
  }

  update() {
    if (this.boat) {
      this.boat.rotation.y += this.speed.rot;
      this.boat.translateZ(this.speed.vel);
    }
  }

  stop() {
    this.speed.vel = 0;
    this.speed.rot = 0;
  }
}



class Chest {
  constructor(Scene) {
    scene.add(Scene);
    Scene.scale.set(3, 3, 3);
    Scene.position.set(random(-200, 200), -0.4, random(-200, 200));
    this.chest = Scene 
  }
}

async function loadModel(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => {
      resolve(gltf.scene);
    })
  })
}


let chestModel = null;
async function createChest() {
  if (!chestModel) {
    chestModel = await loadModel("textures/scene.gltf");
  }
  return new Chest(chestModel.clone());
}

const boat = new Boat();

let chests = []
const CHEST_COUNT = 10

init();
animate();


async function init() {
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
  camera.position.set(0, 0, 100);
  sun = new THREE.Vector3();

  const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

  water = new Water(
    waterGeometry,
    {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load('textures/waternormals.jpg', function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: scene.fog !== undefined
    }
  );

  water.rotation.x = - Math.PI / 2;

  scene.add(water);

  // Skybox

  const sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;

  skyUniforms['turbidity'].value = 10;
  skyUniforms['rayleigh'].value = 2;
  skyUniforms['mieCoefficient'].value = 0.005;
  skyUniforms['mieDirectionalG'].value = 0.8;

  const parameters = {
    elevation: 2,
    azimuth: 180
  };

  const pmremGenerator = new THREE.PMREMGenerator(renderer);

  function updateSun() {
    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);
    sun.setFromSphericalCoords(1, phi, theta);
    sky.material.uniforms['sunPosition'].value.copy(sun);
    water.material.uniforms['sunDirection'].value.copy(sun).normalize();
    scene.environment = pmremGenerator.fromScene(sky).texture;
  }

  updateSun();
  controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 10, 0);
  controls.minDistance = 40.0;
  controls.maxDistance = 200.0;
  controls.update();

  const waterUniforms = water.material.uniforms;
  
  for (let i = 0; i < CHEST_COUNT; i++) {
    const chest = await createChest();
    chests.push(chest);
  }

  window.addEventListener('resize', onWindowResize);

  window.addEventListener('keydown', function (e) {
    if (e.key == "w") {
      boat.speed.vel = 1;
    }
    if (e.key == "s") {
      boat.speed.vel = -1;
    }
    if (e.key == "a") {
      boat.speed.rot = +0.03;
    }
    if (e.key == "d") {
      boat.speed.rot = -0.03;
    }
  })

  window.addEventListener('keyup', function (e) {
    boat.stop()
  })

}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateCamera() {
  camera.position.x = boat.boat.position.x - 10.0;
  camera.position.z = boat.boat.position.z -40.0;
  camera.lookAt(boat.boat.position.x, boat.boat.position.y, boat.boat.position.z);
}

function collide(obj1, obj2) {
  return (
    Math.abs(obj1.position.x - obj2.position.x) < 10 && Math.abs(obj1.position.z - obj2.position.z) < 10
  )
}

function checkCollision() {
  if (boat.boat) {
    chests.forEach(chest => {
      if (chest.chest) {
        if (collide(boat.boat, chest.chest)) {
          scene.remove(chest.chest);
          chest.chest = null;
        }
      }
    })
  }
}

function animate() {
  requestAnimationFrame(animate);
  render();
  updateCamera();
  boat.update();
  checkCollision();
}

function render() {
  water.material.uniforms['time'].value += 1.0 / 60.0;
  renderer.render(scene, camera);
}