import './style.css'

import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import SpriteText from 'three-spritetext';


let camera, scene, renderer, birdCamera;
let controls, water, sun, startUp, myText;
let changeCamera = 0;
let chests = []
let enemies = []
let chestModel = null;
let enemyModel = null;
let fontModel = null;
const CHEST_COUNT = 1;
const ENEMY_COUNT = 1;
const MAX_CHESTS = 15;
const MAX_ENEMIES = 10;
let currChests = 0;
let currEnemies = 0;
let collectedChests = 0;
let counter = 0;
let currHealth = 100;
let destroyedEnemies = 0;
let startGame = 0;
let gameState = "menu";
var bullets = [];
var clock = new THREE.Clock();

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
    Scene.scale.set(2, 2, 2);
    Scene.rotation.y = Math.PI/2;
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
    EnemyScene.bullets = [];
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
  birdCamera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000); 
  camera.position.set(0, 0, 100);
  birdCamera.position.set(0, 100, 100);
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
  if(changeCamera == 1)
  {
    controls = new OrbitControls(birdCamera, renderer.domElement);
  }
  else
  {
    controls = new OrbitControls(camera, renderer.domElement); 
  }
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
    if(e.key == "Enter") 
    {
      var bullet = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 10), new THREE.MeshBasicMaterial({color: 0xD4AF37}));
      bullet.position.set(boat.boat.position.x - 1, boat.boat.position.y - 1,boat.boat.position.z - 1);
      bullet.alive = true;
      
      bullet.velocity = new THREE.Vector3(+Math.sin(boat.boat.rotation.y), 0, Math.cos(boat.boat.rotation.y));

      setTimeout(function(){
        bullet.alive = false;
        scene.remove(bullet);
      }, 2000);
      scene.add(bullet);
      bullets.push(bullet);
    }
    if(e.key == "c" && changeCamera == 0)
    {
      changeCamera = 1;
    }
    else if(e.key == "c" && changeCamera == 1)
    {
      changeCamera = 0;
    }
    if(e.key == " " && gameState == "menu")
    {
      gameState = "playing";
    }
  })

  window.addEventListener('keyup', function (e) {
    boat.stop()
  })

  myText = new SpriteText("My Text")
  myText.position.set(0, 10, 0);
  scene.add(myText);
  startUp = new Date().getTime();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  birdCamera.aspect = window.innerWidth / window.innerHeight;
  birdCamera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateCamera() {
  if(boat.boat)
  {
    camera.position.x = boat.boat.position.x - 10;
    camera.position.z = boat.boat.position.z - 40;
    camera.lookAt(boat.boat.position.x, boat.boat.position.y, boat.boat.position.z);  
    birdCamera.position.x = boat.boat.position.x - 10;
    birdCamera.position.z = boat.boat.position.z - 40;
    birdCamera.lookAt(boat.boat.position.x, boat.boat.position.y, boat.boat.position.z);
  }
}

function collide(obj1, obj2) {
  return (
    Math.abs(obj1.position.x - obj2.position.x) < 7 && Math.abs(obj1.position.z - obj2.position.z) < 7
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
          for(var j = 0; j < enemy.enemy.bullets.length; j++)
          {
            scene.remove(enemy.enemy.bullets[j]);
          }
          enemy.enemy = null;
          currEnemies--;
          currHealth = currHealth - 10;
        }
      }
    })
  }
}

function generateChests() {
  if(boat.boat)
  {
    if (currChests < MAX_CHESTS) {
      for (let i = 0; i < CHEST_COUNT; i++) {
        const chest = new Chest(chestModel.clone());
        chests.push(chest);
        currChests++;
      }
    }
  }
}

function generateEnemies() {
  if(boat.boat)
  {
    if (currEnemies < MAX_ENEMIES) {
      for (let i = 0; i < ENEMY_COUNT; i++) {
        const enemy = new Enemy(enemyModel.clone());
        enemies.push(enemy);
        currEnemies++;
      }
    }
  }
}

function moveEnemies() {
  enemies.forEach(enemy => {
    if(enemy.enemy)
    {
      if (enemy.enemy.position.z > boat.boat.position.z) {
        enemy.enemy.position.z -= 0.3;
      }
      else if (enemy.enemy.position.z < boat.boat.position.z) {
        enemy.enemy.position.z += 0.3;
      } 
    }
  })
}

function updateBullets(){
  for(var i =0; i < bullets.length; i++)
  {
    if(bullets[i] == undefined)
    {
      continue;
    }
    if(!bullets[i].alive)
    {
      bullets.splice(i, 1);
      continue;
    }
    bullets[i].position.add(bullets[i].velocity);
  }
}

function destroyEnemy(){
  for(var i =0; i < bullets.length; i++)
  {
    if(bullets[i] == undefined)
    {
      continue;
    }
    enemies.forEach(enemy => {
      if(enemy.enemy && bullets[i] != undefined && bullets[i].alive) 
      {
        if(collide(bullets[i], enemy.enemy))
        {
          scene.remove(enemy.enemy);
          for(var j = 0; j < enemy.enemy.bullets.length; j++)
          {
            scene.remove(enemy.enemy.bullets[j]);
          }
          enemy.enemy = null;
          bullets[i].alive = false;
          scene.remove(bullets[i]);
          bullets.splice(i, 1);
          currEnemies--;
          destroyedEnemies++;
        }
      }
    })
  }
}

function makeEnemiesShoot(){
  enemies.forEach(enemy => {
    if(enemy.enemy)
    {
      var bullet = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 10), new THREE.MeshBasicMaterial({color: 0xFF0000}));
      bullet.position.set(enemy.enemy.position.x - 1, enemy.enemy.position.y + 2,enemy.enemy.position.z - 1);
      bullet.alive = true;
      var randVal1 = Math.random(0, 2* Math.PI);
      bullet.velocity = new THREE.Vector3(Math.sin(randVal1), 0, Math.cos(randVal1));
      var rand2 = Math.random(0, 1);
      if(rand2 < 0.5)
      {
        bullet.velocity.multiplyScalar(-1);
      }

      setTimeout(function(){
        scene.remove(bullet);
        bullet.alive = false;
      }, 2000);
      scene.add(bullet);
      enemy.enemy.bullets.push(bullet);
    }
  })
}

function updateEnemyBullets(){
  enemies.forEach(enemy => {
    if(enemy.enemy)
    {
      for(var i = 0; i < enemy.enemy.bullets.length; i++)
      {
        if(enemy.enemy.bullets[i] == undefined)
        {
          continue;
        }
        if(!enemy.enemy.bullets[i].alive)
        {
          enemy.enemy.bullets.splice(i, 1);
          continue;
        }
        enemy.enemy.bullets[i].position.add(enemy.enemy.bullets[i].velocity);
      }
    }
  })
}

function playerHit(){
  enemies.forEach(enemy => {
    if(enemy.enemy)
    {
      for(var i = 0; i < enemy.enemy.bullets.length; i++)
      {
        if(enemy.enemy.bullets[i] == undefined)
        {
          continue;
        }
        if(collide(boat.boat, enemy.enemy.bullets[i]))
        {
          scene.remove(enemy.enemy.bullets[i]);
          enemy.enemy.bullets.splice(i, 1);
          currHealth = currHealth - 5;
        }
      }
    }
  })
}

function checkGameStates()
{
  if(currHealth <= 0 && gameState == "playing")
  {
    gameState = "over";
  }
  if(gameState == "menu")
  {
    if(new Date().getTime() - startUp > 3000)
      gameState = "playing";
  }
}

function animate() {
  counter++;
  requestAnimationFrame(animate);
  render();
  boat.update();
  updateCamera();
  if (counter % 100 == 0) {
    generateChests();
    generateEnemies();
    counter = 0;
  }
  checkCollisionChest();
  checkCollisionEnemy();
  if(counter % 50 == 0)
  {
    makeEnemiesShoot();
  }
  moveEnemies();
  updateEnemyBullets();
  updateBullets();
  destroyEnemy();
  playerHit();
  checkGameStates();
}

function render() {
  water.material.uniforms['time'].value += 1.0 / 60.0;
  if(changeCamera == 1)
  {
    renderer.render(scene, birdCamera);
  }
  else
  {
    renderer.render(scene, camera);
  }
}