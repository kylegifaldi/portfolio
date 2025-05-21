import * as THREE from 'three';
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { ControlCenter } from './ControlCenter.js';
import { ProjectScreens } from './ProjectScreens.js';
import { createStarField, updateShootingStars, createShootingStars } from './SpaceTheme.js';
import { getNebula, createNebulas, updateNebulas } from "./getNebula.js";
import { setupStarInteraction, updateStarInteractions } from './StarInteraction.js';
import { navigation } from './Navigation.js';

// ---------------
// GLOBAL VARIABLES
// ---------------
let hoveredControlCenter = null;
let cursorWorldPosition = new THREE.Vector3();
let currentCenterIndex = 0;
let isScrolling = false;
let scrollTimeout;
let scrollCooldown = false;
let lastTime = 0;
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let hoveredSkillNode = null;

// ---------------
// SCENE SETUP
// ---------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);

// ---------------
// CAMERA SETUP
// ---------------
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// ---------------
// RENDERER SETUP
// ---------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ---------------
// CONTROLS SETUP
// ---------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.rotateSpeed = 0.5;
controls.enablePan = true;
controls.minDistance = 0;
controls.maxDistance = 400;
controls.enabled = true;
controls.target.set(-30, 0, 0);

// ---------------
// LIGHTING SETUP
// ---------------
// Ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(0, 1, 2);
scene.add(directionalLight);

// Point lights
const pointLight1 = new THREE.PointLight(0xffffbb, 1, 15);
pointLight1.position.set(5, 3, 5);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0xbbffff, 1, 15);
pointLight2.position.set(-5, 3, 5);
scene.add(pointLight2);

// ---------------
// SPACE ENVIRONMENT
// ---------------
const starField = createStarField(scene);
const shootingStars = createShootingStars(scene);
const nebulas = createNebulas(scene);
const lineGroup = setupStarInteraction(scene, starField);

// ---------------
// CONTROL CENTERS
// ---------------
// Initialize the three control centers
const projectsCenter = new ControlCenter(scene, {
    position: new THREE.Vector3(-30, 0, 0),
    scale: 0.7,
    colorScheme: 'default',
    title: 'PROJECTS',
    type: 'projects'
});

const workCenter = new ControlCenter(scene, {
    position: new THREE.Vector3(0, 0, 0),
    scale: 0.7,
    colorScheme: 'skills',
    title: 'SKILLS',
    type: 'skills'
});

const resumeCenter = new ControlCenter(scene, {
    position: new THREE.Vector3(30, 0, 0),
    scale: 0.7,
    colorScheme: 'resume',
    title: 'RESUME',
    type: 'resume'
});

// Store all control centers in an array for easier access
const controlCenters = [projectsCenter, workCenter, resumeCenter];

// ---------------
// PROJECT SCREENS
// ---------------
// Initialize project screens manager
const projectScreens = new ProjectScreens(scene, camera, controls);

projectScreens.centerPositions = {
    'projects': projectsCenter.options.position.clone(),
    'skills': workCenter.options.position.clone(),
    'resume': resumeCenter.options.position.clone()
};

// ---------------
// CAMERA PATH SETUP
// ---------------
const cameraPath = {
    direction: new THREE.Vector3(1, 0, 0),
    basePosition: new THREE.Vector3(-60, 5, 20),
    spacing: 30,
    lookOffset: new THREE.Vector3(0, 5, -1)
};

cameraPath.basePosition = new THREE.Vector3(
    projectsCenter.options.position.x - 10,
    -2,
    2
);

// Initialize camera at the first position
camera.position.copy(cameraPath.basePosition.clone());
camera.lookAt(camera.position.clone().add(cameraPath.lookOffset));

// ---------------
// EVENT HANDLERS
// ---------------
// Wheel event for scrolling between centers
window.addEventListener('wheel', handleWheel);

// Mouse move for hover effects
window.addEventListener('mousemove', handleMouseMove);

// Click event for interactions
window.addEventListener('click', handleClick);

// Window resize handler
window.addEventListener('resize', handleResize);

// ---------------
// FUNCTIONS
// ---------------
function handleWheel(event) {
    if (projectScreens.isZoomedIn) return;
    controls.enabled = false;
    
    if (isScrolling || scrollCooldown || projectScreens.isZoomedIn) return;
    
    clearTimeout(scrollTimeout);
    
    scrollTimeout = setTimeout(() => {
        const scrollDirection = event.deltaY > 0 ? 1 : -1;
        const newIndex = Math.max(0, Math.min(controlCenters.length - 1, currentCenterIndex + scrollDirection));
        
        if (newIndex !== currentCenterIndex) {
            moveToControlCenter(newIndex);
            currentCenterIndex = newIndex;

            navigation.updateActiveDot(newIndex);

        }
    }, 50);
}
function handleMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    
    // Initialize cursor state variables
    let intersectedCenter = null;
    let shouldShowPointer = false;
    
    // Reset hovering screen at the start of each check
    projectScreens.hoveringScreen = null;
    
    // Check for control center intersections
    controlCenters.forEach(center => {
        const intersects = raycaster.intersectObject(center.controlCenter, true);
        if (intersects.length > 0) {
            intersectedCenter = center;
            shouldShowPointer = true;
        }
    });

    // Handle hover for regular project screens
    // Update the section in handleMouseMove for regular project screens
    // Handle hover for regular project screens
    if (projectScreens.currentActiveCenter && 
             projectScreens.screens[projectScreens.currentActiveCenter]) {
        
        const screens = projectScreens.screens[projectScreens.currentActiveCenter];
        
        // Reset hoveringScreen at the start of each check
        projectScreens.hoveringScreen = null;
        
        // Make sure screens is iterable before using forEach
        if (Array.isArray(screens)) {
            screens.forEach(screen => {
                const screenIntersects = raycaster.intersectObject(screen, true);
                if (screenIntersects.length > 0) {
                    projectScreens.hoveringScreen = screen;
                    shouldShowPointer = true;
                    
                }
            });
        }
    }
    // Update cursor
    document.body.style.cursor = shouldShowPointer ? 'pointer' : 'default';
    
    // Update hover reference
    hoveredControlCenter = intersectedCenter;
    
    // Update control center hover states
    controlCenters.forEach(center => {
        center.setHoverState(center === hoveredControlCenter);
    });
}

function handleClick(event) {
    console.log('Click event detected');
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // If already zoomed in, check for info panel click
    if (projectScreens.isZoomedIn) {
        // Check for info panel interactions
        console.log('Checking for info panel interactions: ', projectScreens.infoPanel);
        if (projectScreens.infoPanel) {
            const infoPanelIntersects = raycaster.intersectObject(projectScreens.infoPanel);
            
            if (infoPanelIntersects.length > 0) {
                // Handle info panel click
                const point = infoPanelIntersects[0].point;
                const canvas = projectScreens.infoCanvas;
                
                // Map 3D coordinates to 2D canvas coordinates
                const canvasX = ((point.x - projectScreens.infoPanel.position.x) / 2.4 + 0.5) * canvas.width;
                const canvasY = (-(point.y - projectScreens.infoPanel.position.y) / 1.4 + 0.5) * canvas.height;
                
                if (projectScreens.handleInfoPanelClick({x: canvasX, y: canvasY})) {
                    return; // Click was handled by info panel
                }
            }
        }
        
        console.log('Current active center: ', projectScreens.currentActiveCenter);
        console.log('Current focused screen: ', projectScreens.currentFocusedScreen);
        
       
        // Check if a control center was clicked while zoomed in
        let clickedCenter = null;
        controlCenters.forEach(center => {
            const intersects = raycaster.intersectObject(center.controlCenter, true);
            if (intersects.length > 0) {
                clickedCenter = center;
            }
        });
        
        if (clickedCenter) {
            // If we're already zoomed in, zoom out
            if (projectScreens.isZoomedIn) {
                projectScreens.zoomOut();
            } else {
                // Enable controls when zooming in
                setTimeout(() => {
                    controls.enabled = true;
                }, 1500);
            }
            return;
        }
    } else {
        // Not zoomed in, check if a control center was clicked
        let clickedCenter = null;
        controlCenters.forEach(center => {
            const intersects = raycaster.intersectObject(center.controlCenter, true);
            if (intersects.length > 0) {
                clickedCenter = center;
            }
        });
        
        if (clickedCenter) {
            // Zoom to the clicked center's content
            projectScreens.handleControlCenterClick(clickedCenter.options.type);
            return;
        }
    }
}
function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


    // Add this function to create connecting lines
function createConnectingLines() {
    const lineGroup = new THREE.Group();
    
    // Create lines between centers
    for (let i = 0; i < controlCenters.length - 1; i++) {
        const startPos = controlCenters[i].options.position;
        const endPos = controlCenters[i+1].options.position;
        
        // Create a curved line
        const curve = new THREE.QuadraticBezierCurve3(
            startPos.clone(),
            new THREE.Vector3(
                (startPos.x + endPos.x) / 2,
                (startPos.y + endPos.y) / 2,// - 5, // Curve downward
                (startPos.z + endPos.z) / 2
            ),
            endPos.clone()
        );
        
        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // Get color from the starting control center
        let centerColor;
        switch(controlCenters[i].options.type) {
            case 'projects':
                centerColor = new THREE.Color(0x00ffff);
                break;
            case 'skills':
                centerColor = new THREE.Color(0x66ff66);
                break;
            case 'resume':
                centerColor = new THREE.Color(0xff8833);
                break;
            default:
                centerColor = new THREE.Color(0xffffff);
        }
        
        const material = new THREE.LineBasicMaterial({ 
            color: centerColor,
            transparent: true,
            opacity: 0.2
        });
        
        const line = new THREE.Line(geometry, material);
        lineGroup.add(line);
     
    }
    
    scene.add(lineGroup);
    return lineGroup;
}

// Create the lines
const connectingLines = createConnectingLines();

function moveToControlCenter(index) {
    if (index < 0 || index >= controlCenters.length) return;

    // Disable further scrolling during animation
    isScrolling = true;
    
    // Calculate target position based on linear path
    const targetPosition = cameraPath.basePosition.clone().addScaledVector(
        cameraPath.direction,
        index * cameraPath.spacing
    );
    
    // Camera always looks in the same direction
    const targetLookAt = targetPosition.clone().add(cameraPath.lookOffset);
    
    // Create a temporary vector for lookAt calculations during animation
    const tempLookAt = new THREE.Vector3();
    
    // Store initial values
    const startPosition = camera.position.clone();
    const startDirection = new THREE.Vector3();
    camera.getWorldDirection(startDirection);
    const startLookAt = camera.position.clone().add(startDirection);
    
    const startControlsTarget = controls.target.clone();
    const targetControlsTarget = new THREE.Vector3(
        controlCenters[index].options.position.x + 40,
        controlCenters[index].options.position.y,
        controlCenters[index].options.position.z + 10
    );

    // Duration and easing
    const duration = 700;
    const startTime = Date.now();
    
    function animateCamera() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease in-out cubic
        const ease = progress < 0.5 
            ? 4 * progress * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        // Update camera position - move smoothly
        camera.position.lerpVectors(startPosition, targetPosition, ease);
        
        // Update controls target position
        controls.target.lerpVectors(startControlsTarget, targetControlsTarget, ease);

        // Face the control center towards the camera
        const controlCenter = controlCenters[index].controlCenter;
        const controlCenterPosition = controlCenter.position.clone();   
        const cameraDirection = camera.position.clone().sub(controlCenterPosition).normalize();
        const targetDirection = new THREE.Vector3(0, 0, 1);
        const angle = Math.acos(cameraDirection.dot(targetDirection));
        const axis = new THREE.Vector3(0, 1, 0).crossVectors(targetDirection, cameraDirection).normalize();
        const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        controlCenter.quaternion.slerp(quaternion, ease);
        
        if (progress < 1) {
            requestAnimationFrame(animateCamera);
        } else {
            // Animation complete
            camera.position.copy(targetPosition);
            isScrolling = false;
            
            // Set a cooldown to prevent accidental scroll triggering
            scrollCooldown = true;
            setTimeout(() => {
                scrollCooldown = false;
            }, 500);
        }
    }
    
    // Start animation
    animateCamera();

    // Once the camera is zoomed in, enable controls
    setTimeout(() => {
        if (!scrollCooldown) {
            controls.enabled = true;
        }
    }, 2500);
}

function animate(time) {
    requestAnimationFrame(animate);
    const deltaTime = lastTime ? time - lastTime : 16.7;
    lastTime = time;
    
    // Update scene elements
    updateNebulas(nebulas, deltaTime);
    updateShootingStars();
    controls.update();
    
    // Update all control centers
    controlCenters.forEach(center => {
        center.update(camera);
    });


    
    // Update project screens
    projectScreens.update(camera, time);
    
    // Animate background
    if (starField) {
        starField.rotation.y += 0.0001;
        starField.rotation.x += 0.00005;
        // Uncomment if needed:
        // updateStarInteractions(starField, deltaTime, lineGroup, cursorWorldPosition);
    }
    
    renderer.render(scene, camera);
}

// ---------------
// INITIALIZATION
// ---------------
moveToControlCenter(0); // Start at the first control center
animate();