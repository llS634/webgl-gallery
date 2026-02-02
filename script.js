import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import customCursorManager from './cursor.js';

let camera, scene, renderer, controls;
let gltfLoader;

const modelHolder = new THREE.Group();
let currentModel = null;
const gltfCache = new Map();

let texts = {};

function getUserLanguage() {
    const lang = navigator.language || navigator.userLanguage;
    return lang.startsWith('ru') ? 'ru' : 'en';
}

async function loadLanguage() {
    const lang = getUserLanguage();
    document.documentElement.lang = lang;

    try {
        const response = await fetch(`./lang/${lang}.json`);
        texts = await response.json();
    } catch {
        const response = await fetch('./lang/en.json');
        texts = await response.json();
        document.documentElement.lang = 'en';
    }
}

const galleryData = {
    solo: [
        {
            file: "assets/solo/solo-model(elizaveta-sashenkova).glb",
            authorKey: "solo_1_author",
            link: "https://",
            descKey: "solo_1_desc"
        },
        {
            file: "assets/solo/solo-model(yellow).glb",
            authorKey: "solo_1_author",
            link: "https://",
            descKey: "solo_2_desc"
        }
    ],
    team: [
        {
            file: "assets/team/team-model(red).glb",
            authorKey: "solo_1_author",
            links: ["https://"],
            descKey: "solo_3_desc"
        }
    ]
};

let currentMode = 'solo';
let currentIndex = 0;
let isAuthorsOpen = false;

init();

async function init() {
    await loadLanguage();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(2.7, 1.7, 3.1);

    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xbbbbbb);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;

    document.getElementById('three-container').appendChild(renderer.domElement);

    const environment = new RoomEnvironment();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(environment).texture;
    scene.background = new THREE.Color(0xbbbbbb);
    pmremGenerator.dispose();

    scene.add(modelHolder);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controls.target.set(0, 1.0, 0);
    controls.maxPolarAngle = Math.PI * 0.55;
    controls.enableZoom = true;
    controls.zoomSpeed = 2.0;
    controls.zoomDampingFactor = 0.15;

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    setupUI();
    loadFullLamp();

    window.addEventListener('resize', onWindowResize);
    animate();
}

function disposeModel(model) {
    model.traverse(obj => {
        if (obj.isMesh) {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        }
    });
}

async function loadGLTF(url) {
    if (gltfCache.has(url)) {
        return gltfCache.get(url).clone(true);
    }

    const gltf = await new Promise(resolve => {
        gltfLoader.load(url, resolve, undefined, () => resolve(null));
    });

    if (!gltf?.scene) return null;

    gltfCache.set(url, gltf.scene);
    return gltf.scene.clone(true);
}

function setupUI() {
    const modeToggle = document.getElementById('mode-toggle');

    modeToggle.addEventListener('change', () => {
        currentMode = modeToggle.checked ? 'team' : 'solo';
        currentIndex = 0;
        loadFullLamp();
        if (isAuthorsOpen) closeAuthorsList();
    });

    document.getElementById('prev').addEventListener('click', e => {
        e.preventDefault();
        const arr = galleryData[currentMode];
        currentIndex = (currentIndex - 1 + arr.length) % arr.length;
        loadFullLamp();
    });

    document.getElementById('next').addEventListener('click', e => {
        e.preventDefault();
        const arr = galleryData[currentMode];
        currentIndex = (currentIndex + 1) % arr.length;
        loadFullLamp();
    });

    document.querySelectorAll('.icon-interactive[data-hover]').forEach(img => {
        const original = img.src;
        const hoverSrc = img.dataset.hover;
        img.addEventListener('mouseenter', () => img.src = hoverSrc);
        img.addEventListener('mouseleave', () => img.src = original);
    });
}

const textElements = [
    { selector: '.text-heading', key: 'text-heading' },
    { selector: '.solo', key: 'solo' },
    { selector: '.team', key: 'team' },
    { selector: '#author-name', keyPrefix: 'authorKey' },
    { selector: '#text-author', keyPrefix: 'descKey' }
];

function updateUITexts(currentGalleryItem = null) {
    textElements.forEach(item => {
        const el = document.querySelector(item.selector);
        if (!el) return;

        if (item.key) {
            el.textContent = texts[item.key] || el.textContent;
        }

        if (item.keyPrefix && currentGalleryItem) {
            const jsonKey = currentGalleryItem[item.keyPrefix];
            el.textContent = texts[jsonKey] || el.textContent;
        }
    });

    document.querySelectorAll('.nav [data-tooltip], .menu, .loading, .logo').forEach(el => {
        const img = el.querySelector('img');
        const className = el.className.trim();
        const keyBaseUnderscore = className.replace(/-/g, "_");
        const keyBaseOriginal = className;

        if (img) {
            img.alt = texts[`${keyBaseUnderscore}_alt`] || texts[`${keyBaseOriginal}_alt`] || img.alt;
        }

        el.dataset.tooltip = texts[keyBaseUnderscore] || texts[keyBaseOriginal] || el.dataset.tooltip;
    });
}

async function loadFullLamp() {
    const data = galleryData[currentMode];
    const item = data[currentIndex];

    document.getElementById('counter').textContent = `${currentIndex + 1}-${data.length}`;
    document.getElementById('author-link').href = item.link || item.links?.[0] || '#';

    updateUITexts(item);

    const hint = document.getElementById('loading');
    hint.classList.add('visible');

    if (currentModel) {
        disposeModel(currentModel);
        modelHolder.remove(currentModel);
        currentModel = null;
    }

    const model = await loadGLTF(item.file);

    if (model) {
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.position.y += 1.1;

        currentModel = model;
        modelHolder.add(model);
    }

    hint.classList.remove('visible');
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/*Tooltip------------------------------------------------------------------------------------*/
document.addEventListener('mousemove', e => {
    document.documentElement.style.setProperty('--mouse-x', e.clientX + 'px');
    document.documentElement.style.setProperty('--mouse-y', e.clientY + 'px');
});

/*Icon-interactive------------------------------------------------------------------------------------*/
document.querySelectorAll('.icon-interactive[data-hover]').forEach(img => {
    const original = img.src;
    const hoverSrc = img.dataset.hover;

    img.addEventListener('mouseenter', () => img.src = hoverSrc);
    img.addEventListener('mouseleave', () => img.src = original);
});

/* Exhibit Modal ------------------------------------------------------------------------------*/
const exhibitModal = document.getElementById('exhibit-modal');
const exhibitDialog = exhibitModal?.querySelector('.modal__dialog');
const exhibitTrigger = document.querySelector('.nav-button');
const exhibitForm = document.getElementById('exhibit-form');
const formStatus = document.getElementById('form-status');
const submitButton = document.getElementById('exhibit-submit');
const requiredFields = exhibitForm ? Array.from(exhibitForm.querySelectorAll('input[required], textarea[required]')) : [];

const openModal = () => {
    if (!exhibitModal) return;
    exhibitModal.classList.add('is-open');
    exhibitModal.setAttribute('aria-hidden', 'false');
};

const closeModal = () => {
    if (!exhibitModal) return;
    exhibitModal.classList.remove('is-open');
    exhibitModal.setAttribute('aria-hidden', 'true');
    if (formStatus) {
        formStatus.textContent = '';
        formStatus.className = 'form-status';
    }
};

if (exhibitTrigger && exhibitModal) {
    exhibitTrigger.addEventListener('click', () => openModal());
}

if (exhibitModal && exhibitDialog) {
    exhibitModal.addEventListener('click', evt => {
        if (evt.target === exhibitModal) {
            closeModal();
        }
    });
}

document.addEventListener('keydown', evt => {
    if (evt.key === 'Escape' && exhibitModal?.classList.contains('is-open')) {
        closeModal();
    }
});

const validateField = field => {
    const isValid = field.value.trim() !== '';
    field.classList.toggle('field-error', !isValid);
    return isValid;
};

requiredFields.forEach(field => {
    field.addEventListener('input', () => {
        if (field.classList.contains('field-error')) {
            validateField(field);
        }
    });
});

if (exhibitForm) {
    exhibitForm.addEventListener('submit', async evt => {
        evt.preventDefault();
        formStatus.textContent = '';
        formStatus.className = 'form-status';

        const allValid = requiredFields.every(validateField);
        if (!allValid) {
            formStatus.textContent = 'Заполните все обязательные поля.';
            formStatus.classList.add('error');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Отправка...';

        const formData = new FormData(exhibitForm);

        try {
            const response = await fetch(exhibitForm.action, {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                formStatus.textContent = 'Готово! Мы скоро свяжемся.';
                formStatus.classList.add('success');
                exhibitForm.reset();
            } else {
                formStatus.textContent = 'Не удалось отправить. Попробуйте позже.';
                formStatus.classList.add('error');
            }
        } catch (error) {
            formStatus.textContent = 'Произошла ошибка сети.';
            formStatus.classList.add('error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Отправить';
        }
    });
}