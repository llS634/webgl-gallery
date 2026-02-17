import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let camera, scene, renderer, controls;
let gltfLoader;

const modelHolder = new THREE.Group();
let currentModel = null;
const gltfCache = new Map();
let isLoadingModel = false;

let texts = {};

/* Language Detection & Loading ------------------------------------------------------------------------------*/
function getUserLanguage() {
    const lang = navigator.language || navigator.userLanguage;
    return lang.startsWith('ru') ? 'ru' : 'en';
}

async function loadLanguage() {
    const lang = getUserLanguage();
    document.documentElement.lang = lang;

    try {
        const response = await fetch(`./lang/${lang}.json`);
        if (!response.ok) throw new Error('Failed to load');
        texts = await response.json();
    } catch {
        const response = await fetch('./lang/en.json');
        texts = await response.json();
        document.documentElement.lang = 'en';
    }
}

/* Gallery Data ------------------------------------------------------------------------------*/
const galleryData = {
    solo: [
        {
            file: "assets/solo/solo-model(elizaveta-sashenkova).glb",
            authorKey: "solo_1_author",
            link: "https://sashenkova.com/",
            descKey: "solo_1_desc"
        },
        {
            file: "assets/solo/solo-model(yellow).glb",
            authorKey: "solo_2_author",
            link: "https://",
            descKey: "solo_2_desc"
        }
    ],
    team: [
        {
            file: "assets/team/team-model(red).glb",
            authorKey: "team_1_author",
            links: ["https://"],
            descKey: "team_1_desc"
        }
    ]
};

let currentMode = 'solo';
let currentIndex = 0;
let isAuthorsOpen = false;

init();

/* Initialization ------------------------------------------------------------------------------*/
async function init() {
    await loadLanguage();
    updateFormTexts();
    updateMenuTexts();
    updateInfoModalTexts();

    setupUI();
    
    const data = galleryData[currentMode];
    const item = data[currentIndex];
    updateUITexts(item);

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    const initThree = () => {
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
        scene.add(modelHolder);

        requestAnimationFrame(() => {
            initThreePart2(isMobile);
        });
    };

    const initThreePart2 = (isMobile) => {
    const environment = new RoomEnvironment();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(environment).texture;
    scene.background = new THREE.Color(0xbbbbbb);
    pmremGenerator.dispose();

        requestAnimationFrame(() => {
            initThreePart3(isMobile);
        });
    };

    const initThreePart3 = (isMobile) => {
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

    updateCameraPosition();

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

        window.addEventListener('resize', onWindowResize);
        animate();
    loadFullLamp();
    };

    if ('requestIdleCallback' in window) {
        requestIdleCallback(initThree, { timeout: 100 });
    } else {
        requestAnimationFrame(initThree);
            }
}

/* 3D Model Management ------------------------------------------------------------------------------*/
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

/* UI Setup & Controls ------------------------------------------------------------------------------*/
function setupUI() {
    const modeToggle = document.getElementById('mode-toggle');

    modeToggle.addEventListener('change', () => {
        currentMode = modeToggle.checked ? 'team' : 'solo';
        currentIndex = 0;
        loadFullLamp();

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

    setupMenu();
}

/* Text Translation ------------------------------------------------------------------------------*/
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

function updateFormTexts() {
    if (!texts.form) return;

    document.querySelectorAll('#exhibit-form [data-translate], #exhibit-submit[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        const value = getNestedValue(texts, key);
        if (value) {
            el.textContent = el.tagName === 'BUTTON' ? value : `[${value}]`;
        }
    });

    document.querySelectorAll('[data-translate-placeholder]').forEach(el => {
        const key = el.getAttribute('data-translate-placeholder');
        const value = getNestedValue(texts, key);
        if (value) {
            el.placeholder = value;
        }
    });
}

function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

function updateThirdSocialLinks() {
    const thirdValue = texts.menu?.social?.third;
    if (!thirdValue) return;

    const value = String(thirdValue).toLowerCase();
    const url = value.includes('tg')
        ? 'https://t.me/maakdes'
        : 'https://x.com/elis_sash';

    const menuThird = document.getElementById('menuSocialThird');
    if (menuThird) {
        menuThird.href = url;
        menuThird.target = '_blank';
        menuThird.rel = 'noopener noreferrer';
    }

    const contactThird = document.getElementById('contactSocialThird');
    if (contactThird) {
        contactThird.href = url;
        contactThird.target = '_blank';
        contactThird.rel = 'noopener noreferrer';
    }
}

/* Menu Management ------------------------------------------------------------------------------*/
let isMenuOpen = false;

function setupMenu() {
    const burgerMenu = document.getElementById('burgerMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    const menuExhibitButton = document.getElementById('menuExhibitButton');
    const exhibitTrigger = document.querySelector('.nav-button');

    if (!burgerMenu || !menuOverlay) return;

    burgerMenu.addEventListener('click', () => {
        toggleMenu();
    });

    menuOverlay.addEventListener('click', (e) => {
        if (e.target === menuOverlay) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isMenuOpen) {
            closeMenu();
        }
    });

    if (menuExhibitButton) {
        menuExhibitButton.addEventListener('click', () => {
            if (exhibitTrigger) {
                exhibitTrigger.click();
            }
        });
    }
}

function toggleMenu() {
    if (isMenuOpen) {
        closeMenu();
    } else {
        openMenu();
    }
}

function openMenu() {
    const burgerMenu = document.getElementById('burgerMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    const menuContainer = document.querySelector('.menu');
    
    if (!burgerMenu || !menuOverlay) return;

    isMenuOpen = true;
    burgerMenu.classList.add('active');
    menuOverlay.classList.add('is-open');
    if (menuContainer) {
        menuContainer.style.zIndex = '1002';
    }
    
    document.body.style.overflow = 'hidden';
    updateMenuTexts();
}

function closeMenu() {
    const burgerMenu = document.getElementById('burgerMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    const menuContainer = document.querySelector('.menu');
    
    if (!burgerMenu || !menuOverlay) return;

    isMenuOpen = false;
    burgerMenu.classList.remove('active');
    menuOverlay.classList.remove('is-open');
    if (menuContainer) {
        menuContainer.style.zIndex = '';
    }
    document.body.style.overflow = '';
}

function updateMenuTexts() {
    if (!texts.menu) return;

    document.querySelectorAll('.menu-overlay [data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        const value = getNestedValue(texts, key);
        if (value) {
            el.textContent = (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'P') ? value : `[${value}]`;
        }
    });

    updateThirdSocialLinks();
}

/* Gallery Navigation & Loading ------------------------------------------------------------------------------*/
async function loadFullLamp() {
    if (isLoadingModel) return;
    
    isLoadingModel = true;
    
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

    if (model && isLoadingModel) {
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.position.y += 1.1;

        if (currentModel) {
            disposeModel(currentModel);
            modelHolder.remove(currentModel);
        }

        currentModel = model;
        modelHolder.add(model);
    }

    hint.classList.remove('visible');
    isLoadingModel = false;
}

/* Animation & Window Resize ------------------------------------------------------------------------------*/
function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
}

function updateCameraPosition() {
    if (!camera) return;
    if (window.innerWidth < 690) {
        camera.position.set(2.7, 1.7, 4.0);
    } else {
        camera.position.set(2.7, 1.7, 3.1);
    }
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateCameraPosition();
}

window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        if (renderer && scene && camera && controls) {
            animate();
        }
    }
});

/* Tooltip ------------------------------------------------------------------------------*/
document.addEventListener('mousemove', e => {
    document.documentElement.style.setProperty('--mouse-x', e.clientX + 'px');
    document.documentElement.style.setProperty('--mouse-y', e.clientY + 'px');
});

/* Icon Interactive Hover ------------------------------------------------------------------------------*/
document.querySelectorAll('.icon-interactive[data-hover]').forEach(img => {
    const original = img.src;
    const hoverSrc = img.dataset.hover;

    img.addEventListener('mouseenter', () => img.src = hoverSrc);
    img.addEventListener('mouseleave', () => img.src = original);
});

/* Info Modal ------------------------------------------------------------------------------*/
const infoModal = document.getElementById('info-modal');
const infoDialog = infoModal?.querySelector('.modal__dialog');
const infoTrigger = document.querySelector('.icon-info');

const openInfoModal = () => {
    if (!infoModal) return;
    infoModal.classList.add('is-open');
    infoModal.setAttribute('aria-hidden', 'false');
    updateInfoModalTexts();
};

const closeInfoModal = () => {
    if (!infoModal) return;
    infoModal.classList.remove('is-open');
    infoModal.setAttribute('aria-hidden', 'true');
};

if (infoTrigger && infoModal) {
    infoTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        openInfoModal();
    });
    
    infoTrigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openInfoModal();
        }
    });
}

if (infoModal && infoDialog) {
    infoModal.addEventListener('click', evt => {
        if (evt.target === infoModal) {
            closeInfoModal();
        }
    });
}

document.addEventListener('keydown', evt => {
    if (evt.key === 'Escape' && infoModal?.classList.contains('is-open')) {
        closeInfoModal();
    }
});

function updateInfoModalTexts() {
    if (!texts.menu) return;

    document.querySelectorAll('#info-modal [data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        const value = getNestedValue(texts, key);
        if (value) {
            el.textContent = value;
        }
    });
}

/* Contact Modal ------------------------------------------------------------------------------*/
const contactModal = document.getElementById('contact-modal');
const contactDialog = contactModal?.querySelector('.modal__dialog');
const contactTrigger = document.querySelector('.icon-contact');

const openContactModal = () => {
    if (!contactModal) return;
    contactModal.classList.add('is-open');
    contactModal.setAttribute('aria-hidden', 'false');
    updateContactModalTexts();
};

const closeContactModal = () => {
    if (!contactModal) return;
    contactModal.classList.remove('is-open');
    contactModal.setAttribute('aria-hidden', 'true');
};

if (contactTrigger && contactModal) {
    contactTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        openContactModal();
    });
    
    contactTrigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openContactModal();
        }
    });
}

if (contactModal && contactDialog) {
    contactModal.addEventListener('click', evt => {
        if (evt.target === contactModal) {
            closeContactModal();
        }
    });
}

document.addEventListener('keydown', evt => {
    if (evt.key === 'Escape' && contactModal?.classList.contains('is-open')) {
        closeContactModal();
    }
});

function updateContactModalTexts() {
    if (!texts.menu) return;

    document.querySelectorAll('#contact-modal [data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        const value = getNestedValue(texts, key);
        if (value) {
            el.textContent = value;
        }
    });

    updateThirdSocialLinks();
}

/* Exhibit Modal & Form ------------------------------------------------------------------------------*/
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

/* Form Validation ------------------------------------------------------------------------------*/
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

/* Form Submission ------------------------------------------------------------------------------*/
if (exhibitForm) {
    exhibitForm.addEventListener('submit', async evt => {
        evt.preventDefault();
        formStatus.textContent = '';
        formStatus.className = 'form-status';

        const allValid = requiredFields.every(validateField);
        if (!allValid) {
            formStatus.textContent = texts.form?.errors?.required || 'Заполните все обязательные поля.';
            formStatus.classList.add('error');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = texts.form?.submitting || 'Отправка...';

        const formData = new FormData(exhibitForm);

        try {
            const response = await fetch(exhibitForm.action, {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                formStatus.textContent = texts.form?.success || 'Готово! Мы скоро свяжемся.';
                formStatus.classList.add('success');
                exhibitForm.reset();
            } else {
                formStatus.textContent = texts.form?.errors?.failed || 'Не удалось отправить. Попробуйте позже.';
                formStatus.classList.add('error');
            }
        } catch (error) {
            formStatus.textContent = texts.form?.errors?.network || 'Произошла ошибка сети.';
            formStatus.classList.add('error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = texts.form?.submit || 'Отправить';
        }
    });
}