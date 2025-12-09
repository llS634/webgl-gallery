/*3D interactive------------------------------------------------------------------------------------*/
import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
        import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
        import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

        let camera, scene, renderer, controls;

        const container = document.getElementById('three-container');

        init();
        animate();

        function init() {
            camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
            camera.position.set(2.7, 1.7, 3.1);

            scene = new THREE.Scene();

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setAnimationLoop(animate);
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1;
            container.appendChild(renderer.domElement);

            const environment = new RoomEnvironment();
            const pmremGenerator = new THREE.PMREMGenerator(renderer);
            scene.environment = pmremGenerator.fromScene(environment).texture;
            scene.background = new THREE.Color(0xbbbbbb);

            controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.minDistance = 2;
            controls.maxDistance = 10;
            controls.target.set(0, 1.0, 0);
            controls.maxPolarAngle = Math.PI * 0.55;
            controls.update();

            // DRACO
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

            new GLTFLoader()
                .setDRACOLoader(dracoLoader)
                .load('assets/LAMP.glb', gltf => {
                    const model = gltf.scene;
                    scene.add(model);

                    const box = new THREE.Box3().setFromObject(model);
                    const center = box.getCenter(new THREE.Vector3());
                    model.position.sub(center);
                    model.position.y += 1.1;
                });

            window.addEventListener('resize', onWindowResize);
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function animate() {
            controls.update();
            renderer.render(scene, camera);
        }

/*Tooltip------------------------------------------------------------------------------------*/
    document.addEventListener('mousemove', e => {
    document.documentElement.style.setProperty('--mouse-x', e.clientX + 'px');
    document.documentElement.style.setProperty('--mouse-y', e.clientY + 'px');
});