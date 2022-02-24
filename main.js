import './style.css'

import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let camera, scene, renderer;
let controls, water, sun;
let chests = []
let enemies = []
let chestModel = null;
let enemyModel = null;
const CHEST_COUNT = 1;
const ENEMY_COUNT = 1;
const MAX_CHESTS = 20;
const MAX_ENEMIES = 20;
let currChests = 0;
let currEnemies = 0;
let collectedChests = 0;
let counter = 0;
let currHealth = 100;

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
    if (this.boat) {
      this.speed.vel = 0;
      this.speed.rot = 0;
    }
  }
}

class Chest {
  constructor(Scene) {
    scene.add(Scene);
    Scene.scale.set(3, 3, 3);
    Scene.position.set(boat.boat.position.x + random(0, 100), -0.4, boat.boat.position.z + random(-100, 100));
    this.chest = Scene;
  }
}

class Enemy {
  constructor(EnemyScene) {
    scene.add(EnemyScene);
    EnemyScene.scale.set(2, 3, 2);
    EnemyScene.rotation.y = Math.PI / 2;
    EnemyScene.position.set(boat.boat.position.x + random(0, 100), -0.4, boat.boat.position.z + random(-100, 100));
    this.enemy = EnemyScene;
  }
}

async function loadModel(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => {
      resolve(gltf.scene);
    })
  })
}

chestModel = await loadModel("textures/scene.gltf");
enemyModel = await loadModel("textures/motorboat/scene.gltf");
const boat = new Boat();

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
  camera.position.x = boat.boat.position.x - 10;
  camera.position.z = boat.boat.position.z - 40;
  camera.lookAt(boat.boat.position.x, boat.boat.position.y, boat.boat.position.z);
}

function collide(obj1, obj2) {
  return (
    Math.abs(obj1.position.x - obj2.position.x) < 10 && Math.abs(obj1.position.z - obj2.position.z) < 10
  )
}

function checkCollisionChest() {
  if (boat.boat) {
    chests.forEach(chest => {
      if (chest.chest) {
        if (collide(boat.boat, chest.chest)) {
          scene.remove(chest.chest);
          chest.chest = null;
          currChests--;
          collectedChests++;
        }
      }
    })
  }
}

function checkCollisionEnemy() {
  if (boat.boat) {
    enemies.forEach(enemy => {
      if (enemy.enemy) {
        if (collide(boat.boat, enemy.enemy)) {
          scene.remove(enemy.enemy);
          enemy.enemy = null;
          currEnemies--;
          currHealth = currHealth - 20;
        }
      }
    })
  }
}

function generateChests() {
  if (currChests < MAX_CHESTS) {
    for (let i = 0; i < CHEST_COUNT; i++) {
      const chest = new Chest(chestModel.clone());
      chests.push(chest);
      currChests++;
    }
  }
}

function generateEnemies() {
  if (currEnemies < MAX_ENEMIES) {
    for (let i = 0; i < ENEMY_COUNT; i++) {
      const enemy = new Enemy(enemyModel.clone());
      enemies.push(enemy);
      currEnemies++;
    }
  }
}

function moveEnemies() {
  enemies.forEach(enemy => {
    //console.log(enemy);
    // var d = - boat.boat.position.x + enemy.enemy.position.x;
    // if (enemy.enemy.position.x > boat.boat.position.x) {
    //   enemy.enemy.position.x -= Math.min(0.1, d);
    // }
    // else if (enemy.enemy.position.x < boat.boat.position.x) {
    //   enemy.enemy.position.x += Math.min(0.1, d);
    // }
    // if (enemy.enemy.position.x > boat.boat.position.x) {
    //   enemy.enemy.position.x -= 0.1;
    // }
    // else if (enemy.enemy.position.x < boat.boat.position.x) {
    //   enemy.enemy.position.x += 0.1;
    // }
    // var d2 = - boat.boat.position.z + enemy.enemy.position.z;
    if(enemy.enemy)
    {
      if (enemy.enemy.position.z > boat.boat.position.z) {
        enemy.enemy.position.z -= 0.1;
      }
      else if (enemy.enemy.position.z < boat.boat.position.z) {
        enemy.enemy.position.z += 0.1;
      }
    }
  })
}

function checkGameStates()
{
  if(currHealth <= 0)
  {
    // End the game
  }
}

function animate() {
  counter++;
  requestAnimationFrame(animate);
  render();
  boat.update();
  if (boat.boat) {
    updateCamera();
  }
  if (counter % 100 == 0) {
    generateChests();
    generateEnemies();
    counter = 0;
  }
  checkCollisionChest();
  checkCollisionEnemy();
  moveEnemies();
  checkGameStates();
}

function render() {
  water.material.uniforms['time'].value += 1.0 / 60.0;
  renderer.render(scene, camera);
}