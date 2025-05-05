import * as THREE from 'three';
import { OrbitControls } from "../jsm/controls/OrbitControls.js";
import { ControlCenter } from './ControlCenter.js';
import { ProjectScreens } from './ProjectScreens.js';
import {  createStarField, updateShootingStars, createShootingStars } from './SpaceTheme.js';
//import { gsap } from 'gsm/all'; // Optional - for smoother animations
import { getNebula, createNebulas, updateNebulas } from "./getNebula.js";
import { setupStarInteraction, updateStarInteractions } from './StarInteraction.js';

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
//camera.position.set(0, 0, 40); // Position camera further back to see all centers
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let hoveredControlCenter = null;

// Add to your constants section:



// Add this after your other global variable declarations

// Star interaction variables
let cursorWorldPosition = new THREE.Vector3();


let currentCenterIndex = 0;
let isScrolling = false;
let scrollTimeout;
let scrollCooldown = false;


// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Controls
var controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.rotateSpeed = 0.5;
controls.enablePan = true;
controls.minDistance = 0;
controls.maxDistance = 400;
controls.enabled = true; // Disable orbit controls initially

// // change the focus of the controls zoom to be a distance past the last control center
controls.target.set(-30, 0, 0); // Set the target to a point in front of the last control center

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);

// Space theme
//const shootingStars = createShootingStars(scene);
const shootingStars = createShootingStars(scene); // Add this line
const starField = createStarField(scene);

var lineGroup = setupStarInteraction(scene, starField); // Initialize star interaction


// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(0, 1, 2);
scene.add(directionalLight);

// Add point lights
const pointLight1 = new THREE.PointLight(0xffffbb, 1, 15);
pointLight1.position.set(5, 3, 5);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0xbbffff, 1, 15);
pointLight2.position.set(-5, 3, 5);
scene.add(pointLight2);

const nebulas = createNebulas(scene);


// Initialize the three control centers
const projectsCenter = new ControlCenter(scene, {
    position: new THREE.Vector3(-30, 0, 0),
    scale: 0.7,
    colorScheme: 'default',
    title: 'Projects',
    type: 'projects'
});

const workCenter = new ControlCenter(scene, {
    position: new THREE.Vector3(0, 0, 0),
    scale: 0.7,
    colorScheme: 'work',
    title: 'Work Experience',
    type: 'work'
});

const resumeCenter = new ControlCenter(scene, {
    position: new THREE.Vector3(30, 0, 0),
    scale: 0.7,
    colorScheme: 'resume',
    title: 'Resume',
    type: 'resume'
});

// Store all control centers in an array for easier access
const controlCenters = [projectsCenter, workCenter, resumeCenter];

// Initialize project screens manager - now only need one for all centers
const projectScreens = new ProjectScreens(scene, camera, controls);

projectScreens.centerPositions = {
    'projects': projectsCenter.options.position.clone(),
    'work': workCenter.options.position.clone(),
    'resume': resumeCenter.options.position.clone()
};



const cameraPath = {
    direction: new THREE.Vector3(1, 0, 0), // Path direction (along X-axis)
    basePosition: new THREE.Vector3(-60, 5, 20), // Starting position
    spacing: 30, // Distance between centers
    lookOffset: new THREE.Vector3(0, 5, -1) // Camera always looks this direction
};

cameraPath.basePosition = new THREE.Vector3(
    projectsCenter.options.position.x - 10, // Position camera before the first center
    -2, // Slightly above eye level
    2 // Distance away from the centers
);

// Initialize camera at the first position
camera.position.copy(cameraPath.basePosition.clone());
// Always face the same direction (forward along Z axis)
camera.lookAt(camera.position.clone().add(cameraPath.lookOffset));


// Add scroll event listener
window.addEventListener('wheel', (event) => {
    // return if zoomed in
    if (projectScreens.isZoomedIn) return;
    controls.enabled = false;
    // Prevent scroll handling during animations or cooldown
    if (isScrolling || scrollCooldown || projectScreens.isZoomedIn) return;
    
    // Clear any existing timeout
    clearTimeout(scrollTimeout);
    
    // Set a small timeout to debounce scroll events
    scrollTimeout = setTimeout(() => {
        // Determine scroll direction
        const scrollDirection = event.deltaY > 0 ? 1 : -1;
        
        // Calculate new index
        const newIndex = Math.max(0, Math.min(controlCenters.length - 1, currentCenterIndex + scrollDirection));
        
        // Only move if the index changed
        if (newIndex !== currentCenterIndex) {
            // Move to the new control center
            moveToControlCenter(newIndex);
            currentCenterIndex = newIndex;
        }
    }, 50); // 50ms debounce
});
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
    
    // Highlight the current control center
    //controlCenters.forEach((center, i) => {
    //    center.setHoverState(i === index);
    //});
    
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
    const duration = 700; // 1.5 seconds
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
        
        // Update lookAt - keep forward direction during transition
        //tempLookAt.lerpVectors(startLookAt, targetLookAt, ease);
        //camera.lookAt(tempLookAt);

        // Update controls target position
        controls.target.lerpVectors(startControlsTarget, targetControlsTarget, ease);

        // face the control center towards the camera
        const controlCenter = controlCenters[index].controlCenter;
        const controlCenterPosition = controlCenter.position.clone();   
        const cameraDirection = camera.position.clone().sub(controlCenterPosition).normalize();
        const targetDirection = new THREE.Vector3(0, 0, 1); // Assuming the control center faces along the Z-axis
        const angle = Math.acos(cameraDirection.dot(targetDirection));
        const axis = new THREE.Vector3(0, 1, 0).crossVectors(targetDirection, cameraDirection).normalize();
        const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        controlCenter.quaternion.slerp(quaternion, ease);

        
        if (progress < 1) {
            requestAnimationFrame(animateCamera);
        } else {
            // Animation complete
            camera.position.copy(targetPosition);
            //camera.lookAt(targetLookAt);
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

    // once the camera is zoomed in, disable controls
    setTimeout(() => {
        if (!scrollCooldown) {
            controls.enabled = true;
        }
    }, 2500); // Disable after animation completes
}
// Add mousemove event listener
window.addEventListener('mousemove', (event) => {
    // Update mouse position
    // Update mouse position (keep your existing code)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update raycaster
    raycaster.setFromCamera(mouse, camera);
    
    // Project cursor position into 3D space for star interaction
    cursorWorldPosition.set(mouse.x, mouse.y, 0.5);
    cursorWorldPosition.unproject(camera);
    
    // Create a direction vector from camera to cursor position
    const directionVector = cursorWorldPosition.clone().sub(camera.position).normalize();
    
    // Scale the position to a fixed distance from camera 
    // (this helps make interaction distance consistent)
    cursorWorldPosition.copy(camera.position).addScaledVector(
        directionVector, 
        35 // Consistent interaction distance
    );
    
    // Check for intersections with all control centers
    let intersectedCenter = null;
    
    controlCenters.forEach(center => {
        const intersects = raycaster.intersectObject(center.controlCenter, true);
        if (intersects.length > 0) {
            intersectedCenter = center;
        }
    });
    
    // Update hover states
    controlCenters.forEach(center => {
        const isHovering = center === intersectedCenter;
        if (isHovering !== center.isHovering) {
            center.setHoverState(isHovering);
        }
    });
    
    // Update cursor
    document.body.style.cursor = intersectedCenter ? 'pointer' : 'default';
    
    // Update hover reference
    hoveredControlCenter = intersectedCenter;
});

// Update click handler
window.addEventListener('click', (event) => {
    // Update mouse and raycaster
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    
    // If already zoomed in, check for info panel click
    if (projectScreens.isZoomedIn && projectScreens.infoPanel) {
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
                // Disable controls when zooming out
                //controls.enabled = false;
            } else {
                // Enable controls when zooming in
                setTimeout(() => {
                    controls.enabled = true;
                }, 1500); // Enable after animation completes
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
    
    // Check for other object clicks (screens, etc.)
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
        let object = intersects[0].object;
        
        // Traverse up to find object with userData
        while (object && !object.userData.projectUrl && !object.userData.type) {
            object = object.parent;
        }
        
        if (object && object.userData.projectUrl) {
            // Handle screen clicks
            const screenIndex = object.userData.index;
            if (screenIndex !== undefined) {
                //window.open(object.userData.projectUrl, '_blank');
            }
        }
    }
});
let lastTime = 0;

function animate(time) {
    requestAnimationFrame(animate);
    const deltaTime = lastTime ? time - lastTime : 16.7;
    lastTime = time;
    updateNebulas(nebulas, deltaTime);

    
    // Update shooting stars
    //if (shootingStars && shootingStars.update) {
        updateShootingStars();
    //}
    
    // Update controls
    controls.update();
    
    // Update all control centers
    controlCenters.forEach(center => {
        center.update(camera);
    });
    
    // Update project screens
    projectScreens.update(camera);
    
    // Animate background
    if (starField) {
        starField.rotation.y += 0.0001;
        starField.rotation.x += 0.00005;
        //updateStarInteractions(starField, deltaTime, lineGroup, cursorWorldPosition);
    }
    
    renderer.render(scene, camera);
}

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
// Add this after your other event listeners, before animate()
moveToControlCenter(0); // Start at the first control center
animate();