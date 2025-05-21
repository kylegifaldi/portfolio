import * as THREE from 'three';
import { ControlCenter } from './ControlCenter.js';
import { DisplayState } from './entities/ScreenState.js';
import { createSun } from './spaceelements/sun/Sun.js';

const placeholderCanvas = document.createElement('canvas');
placeholderCanvas.width = 1024;
placeholderCanvas.height = 720;
const ctx = placeholderCanvas.getContext('2d');


class ProjectScreens {
    constructor(scene, camera, controls) {
        this.lastUpdateTime = 0;

        // Core properties
        this.scene = scene;
        this.camera = camera;
        this.controls = controls;

        this.originalCameraPosition = camera.position.clone();
        this.originalControlsTarget = null;
        this.isZoomedIn = false;
        this.currentFocusedScreen = -1;
        this.displays = {};
        this.currentCenteredScreen = -1;
        this.currentActiveCenter = null;
        this.scaleTransitionSpeed = 0.1;
        this.hoveringScreen = null;
        
        // Store position of each control center
        this.centerPositions = {
            'projects': new THREE.Vector3(-40, -2, 2),
            'skills': new THREE.Vector3(-10, -2, 2),
            'resume': new THREE.Vector3(20, -2, 2)
        };
        
        // Initialize screen states for each center
        this.displaystates = {
            'projects': new DisplayState(),
            'skills': new DisplayState(),
            'resume': new DisplayState()
        };
        
        // Initialize screen data
        this.initializeScreenData();
    }
    
    // ------------------------------
    // DATA INITIALIZATION
    // ------------------------------
    
    async initializeScreenData() {
        const projectsResponse = await fetch('./js/config/projectscreens/projects.json');
        const skillsResponse = await fetch('./js/config/projectscreens/skills.json');
        const resumeResponse = await fetch('./js/config/projectscreens/resume.json');
        
        this.displaysData = {
            'projects': await projectsResponse.json(),
            'skills': await skillsResponse.json(),
            'resume': await resumeResponse.json()
        };

    }
    
    update(camera, time) {
        if (!this.isZoomedIn || !this.currentActiveCenter) return;
        // Inside your update method where you're updating skill nodes
        
        // Update the sun shader if it's the skills visualization
        if (this.currentActiveCenter === 'skills') {

            const displays = this.displays[this.currentActiveCenter];
            if (displays && displays.length > 0) {
                const currentTime = time * 0.001; // Convert to seconds
                const deltaTime = this.lastUpdateTime === 0 ? 0.016 : currentTime - this.lastUpdateTime;
                this.lastUpdateTime = currentTime*.5; // Store last update time in milliseconds

                displays.forEach((skillGroup) => {
                    // Update sun if it exists
                    if (skillGroup.userData.sun) {
                        skillGroup.userData.sun.update(currentTime);
                    }
                    
                    // Update each skill node in the group
                    skillGroup.children.forEach((skillNode) => {
                        // Skip the sun which is usually the first child
                        if (skillNode === skillGroup.userData.sun) return;
                        
                        if (skillNode.userData) {
                            // Get animation data from userData
                            const data = skillNode.userData;
                            
                            // In your update method inside the skillNode processing loop
                            if (data.orbitSpeed && data.orbitAngle !== undefined && data.orbitRadius) {
                                // Calculate new angle based on time and orbit speed
                                const newAngle = data.orbitAngle + deltaTime * data.orbitSpeed;
                                
                                // Calculate new position based on orbit, including tilt and eccentricity
                                const distance = data.orbitRadius;
                                const tilt = data.orbitTilt || 0;
                                const eccentricity = data.orbitEccentricity || 0;
                                
                                skillNode.position.set(
                                    Math.sin(newAngle) * distance * (1 - eccentricity * Math.cos(newAngle)),
                                    Math.sin(newAngle) * distance * tilt,
                                    Math.cos(newAngle) * distance * (1 - eccentricity * Math.cos(newAngle))
                                );
                                
                                // Store the updated angle
                                data.orbitAngle = newAngle;
                            }
      
                            
                            // Make the central sphere with skill image face the camera
                            if (data.sphere) {
                                // Make only the sphere face the camera, not the whole node
                                data.sphere.lookAt(camera.position);
                            }
                            
                            // Make the text label face the camera too
                            // The text label is the last child in the skillNode
                            const textMesh = skillNode.children[skillNode.children.length - 1];
                            if (textMesh && textMesh.geometry && textMesh.geometry.type === 'PlaneGeometry') {
                                textMesh.lookAt(camera.position);
                            }
                        }
                    });
                });
            }
        }
        

        

        // if projects is active center, and screen is centered, update the screen states
        if (this.currentActiveCenter === 'projects') {
            const displays = this.displays[this.currentActiveCenter];
            if (displays && displays.length > 0) {
                const centeredScreenIndex = this.findCenteredScreen(camera, displays);
                if (centeredScreenIndex !== -1 && centeredScreenIndex !== this.currentCenteredScreen) {
                    // Update the current centered screen
                    this.currentCenteredScreen = centeredScreenIndex;
                    
                    // Update the screen states
                    displays.forEach((screen, index) => {
                        if (index === centeredScreenIndex) {
                            // Scale up the centered screen
                            this.displaystates[this.currentActiveCenter].currentScales[index] = this.displaystates[this.currentActiveCenter].expandScale;
                            this.handleScreenClick(index);

                        }
                        else{
                            // Scale down the other displays
                            this.displaystates[this.currentActiveCenter].currentScales[index] = this.displaystates[this.currentActiveCenter].normalScale;
                        }
                    });
                            

                    
                }
            }
        }


        // Update the scale of all displays
        // update screen size if it doesn't match it's current scale
        const displays = this.displays[this.currentActiveCenter];
        if (displays && displays.length > 0) {
            displays.forEach((screen, index) => {
                const targetScale = this.displaystates[this.currentActiveCenter].currentScales[index];
                const currentScale = (screen.scale.x + screen.scale.y + screen.scale.z) / 3;
                if (Math.abs(currentScale - targetScale) > 0.01) {
                    // Lerp the scale
                    screen.scale.setScalar(THREE.MathUtils.lerp(currentScale, targetScale, this.scaleTransitionSpeed));
                }
                
            });
        }

    }
    
    // ------------------------------
    // SCREEN MANAGEMENT
    // ------------------------------
    
    activateCenter(centerType) {
        if (!this.displaysData[centerType]) return false;
        
        // If this center is already active, do nothing
        if (this.currentActiveCenter === centerType && this.displays[centerType]) {
            return true;
        }
        
        // Hide any currently active displays
        this.hideAlldisplays();
        
        // Set the new active center
        this.currentActiveCenter = centerType;
        
        // Create displays for this center if they don't exist
        if (!this.displays[centerType] && centerType !== 'resume') {
            this.createCenterDisplays(centerType);
        }

        // if resume, then download resume file
        if (centerType === 'resume') {
            const resumeData = this.displaysData[centerType];
            const resumeUrl = resumeData[0].url;
            const resumeName = resumeData[0].title;
            const link = document.createElement('a');
            
            link.href = resumeUrl;
            link.innerText = resumeName;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        // Show the displays for this center
        if (this.displays[centerType] instanceof THREE.Group) {
            // For Group objects (like skills visualization)
            this.displays[centerType].visible = true;
        } else if (Array.isArray(this.displays[centerType])) {
            // For arrays of displays (like projects, resume)
            // if center is not resume
            if (centerType !== 'resume') {
                this.displays[centerType].forEach(screen => {
                    screen.visible = true;
                });
            }
        }
        
        return true;
    }
    
    hideAlldisplays() {
        Object.keys(this.displays).forEach(centerType => {
            if (this.displays[centerType]) {
                // Check if it's a special visualization (like skills) or regular displays
                if (this.displays[centerType] instanceof THREE.Group) {
                    // For Group objects (like skills visualization)
                    this.displays[centerType].visible = false;
                } else if (Array.isArray(this.displays[centerType])) {
                    // For arrays of displays (like projects, resume)
                    this.displays[centerType].forEach(screen => {
                        screen.visible = false;
                    });
                }
                // Reset the displays
                this.displays[centerType] = null;
            }
        });

    }
    
    createCenterDisplays(centerType) {
        const projectData = this.displaysData[centerType];
        if (!projectData) return;
        
        const radius = 70; // Distance from center
        const displays = [];
        
        projectData.forEach(async (project, index) => {
            // Calculate position around a circle
            const angle = (index / projectData.length) * Math.PI * 2;
            const x = Math.sin(angle) * radius;
            const z = Math.cos(angle) * radius;
            
            // Create screen
            var display;
            if (centerType === 'skills') {
                // Create a special visualization for skills
                display = await this.createSkillSpheres(project, index);
                display.position.set(x, 0, z);
            }
            else {
                // Create a regular screen
                display = this.createScreen(project, index);
            }
            display.position.set(x, 0, z);
            // Look at center
            display.lookAt(0, 0, 0);
            
            this.scene.add(display);
            displays.push(display);
            
            // Initialize state tracking
            this.displaystates[centerType].currentScales[index] = this.displaystates[centerType].normalScale;
        });

        setTimeout(() => {
            this.controls.enabled = true; // Enable controls after displays are created
        }, 1000);
        
        // Store displays for this center
        this.displays[centerType] = displays;

        
        
        return displays;
    }

    async createSkillSpheres(skillCategory, index) {
        // create a group for each skillCategory
        const skillGroup = new THREE.Group();
       
        // create a glowing star 
        const sun = await createSun();
        sun.position.set(0, 0, 0);
        //sun.scale.set(10.5, 10.5, 10.5);
        skillGroup.add(sun);

        // Store the sun in userData for updating
        skillGroup.userData = {
            ...skillGroup.userData,
            sun: sun
        };


        const skills = skillCategory.skills;
        console.log("creating skill category for: ", skillCategory.category);
        console.log("skills: ", skills);


        skills.forEach((skill, skillIndex) => {
            // Create skill group to contain all elements
            const skillNode = new THREE.Group();
            

            // Create the central sphere for the skill image
            const sphereGeometry = new THREE.SphereGeometry(5, 32, 32);
            const sphereMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xffffff, // Start with white material
                transparent: true,
                opacity: 0.9
            });
            
            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            skillNode.add(sphere);
            
            // Load the skill image
            const skillImage = new Image();
            const skillName = skill.replace(/\s+/g, '_').toLowerCase();
            
            // Try jpg first, then png, then fallback
            skillImage.onerror = function() {
                skillImage.src = `./assets/img/skills/${skillName}.png`;
                
                // Second error handler for png fallback
                skillImage.onerror = function() {
                    console.error(`Failed to load image for skill: ${skillName}`);
                    skillImage.src = `./assets/img/skills/code.png`; // Generic code icon as fallback
                };
            };
            
            skillImage.onload = function() {
                const texture = new THREE.Texture(skillImage);
                texture.needsUpdate = true;
                
                // Apply the texture to the sphere
                sphere.material.map = texture;
                sphere.material.needsUpdate = true;
                
                // Add a subtle environment map for reflection
                const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128);
                const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
                sphere.material.envMap = cubeRenderTarget.texture;
                sphere.material.reflectivity = 0.3;
                sphere.material.combine = THREE.MixOperation;
            };
            
            // Start loading the image
            skillImage.src = `./assets/img/skills/${skillName}.jpg`;
            
            // Add skill name as text below
            const textCanvas = document.createElement('canvas');
            textCanvas.width = 856;
            textCanvas.height = 224;
            const ctx = textCanvas.getContext('2d');
            
            // Draw a transparent background

            
            // Draw the skill name
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(skill, 428, 160);
            // make ctx background transparent
            ctx.fillStyle = 'rgba(0, 0, 0, 0)';
            ctx.opacity = 0;
            
            // Create texture from canvas
            const textTexture = new THREE.CanvasTexture(textCanvas);
            const textMaterial = new THREE.MeshBasicMaterial({
                map: textTexture,
                transparent: true,
                side: THREE.DoubleSide
            });
            
            // Create a plane for the text
            const textGeometry = new THREE.PlaneGeometry(30, 6);
            const textMesh = new THREE.Mesh(textGeometry, textMaterial);
            textMesh.position.y = -15;
            skillNode.add(textMesh);
            
            // Position the entire skill node
            const angle = (skillIndex / skills.length) * Math.PI * 2;
            const distance = 35 + skillIndex * 0.5 + (Math.random() * 105); // Randomize distance a bit
            skillNode.position.set(
                Math.sin(angle) * distance,
                Math.cos(angle) * distance * 0.2, // Flatten the orbit a bit
                Math.cos(angle) * distance
            );
            
            // Make the skill node look at the center
            skillNode.lookAt(0, 0, 0);
            
            // Add animation data
            skillNode.userData = {
                sphere: sphere,
                rotationSpeed: 0.003 + (Math.random() * 0.002),
                pulseSpeed: 0.5 + (Math.random() * 1.0),
                pulseAmount: 0.1 + (Math.random() * 0.1),
                orbitSpeed: 0.0005 + (Math.random() * 0.0005),
                orbitRadius: distance + (Math.random() * 500), // Randomize orbit radius
                orbitAngle: angle,
                skillName: skill
            };
            
            // Add to the skill group
            skillGroup.add(skillNode);



            
            // Generate a random orbit inclination for each skill
            const orbitTilt = Math.random() * 0.3; // Random tilt between 0 and 0.3 radians
            const orbitEccentricity = 0.3 + Math.random() * 0.4; // Slight eccentricity for elliptical orbits
            
            // Create visible orbit path
            const orbitPoints = [];
            const orbitSegments = 64;
            for (let i = 0; i < orbitSegments + 1; i++) {
                const orbitAngle = (i / orbitSegments) * Math.PI * 2;
                // Apply orbit tilt and eccentricity to create varied orbit shapes
                const x = Math.sin(orbitAngle) * distance * (1 - orbitEccentricity * Math.cos(orbitAngle));
                const y = Math.sin(orbitAngle) * distance * orbitTilt;
                const z = Math.cos(orbitAngle) * distance * (1 - orbitEccentricity * Math.cos(orbitAngle));
                orbitPoints.push(new THREE.Vector3(x, y, z));
            }
            
            const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
            const orbitMaterial = new THREE.LineBasicMaterial({
                color: new THREE.Color(0x444444),
                transparent: true,
                opacity: 0.5
            });
            const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
            skillGroup.add(orbitLine);
            
            // Position the skill on its orbit
            skillNode.position.set(
                Math.sin(angle) * distance * (1 - orbitEccentricity * Math.cos(angle)),
                Math.sin(angle) * distance * orbitTilt,
                Math.cos(angle) * distance * (1 - orbitEccentricity * Math.cos(angle))
            );
            
            // Store orbit parameters in userData for animation
            skillNode.userData = {
                sphere: sphere,
                rotationSpeed: 0.003 + (Math.random() * 0.002),
                pulseSpeed: 0.5 + (Math.random() * 1.0),
                pulseAmount: 0.1 + (Math.random() * 0.1),
                orbitSpeed: 0.0005 + (Math.random() * 0.0005),
                orbitRadius: distance,
                orbitAngle: angle,
                orbitTilt: orbitTilt,  // Store tilt parameter
                orbitEccentricity: orbitEccentricity,  // Store eccentricity
                skillName: skill
            };
        });

        return skillGroup;
    }
    
    createScreen(project, index) {
        // Create container for screen
        const screenGroup = new THREE.Group();
        
        // Create the TV frame
        // frame geometry should match normal desktop screen size
        const frameGeometry = new THREE.BoxGeometry(14.2, 8, 0);
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            roughness: 1,
            transparent: true,
            opacity: 0,
            side: THREE.BackSide // Only render the back side
        });

        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        screenGroup.add(frame);
        
        // Create front side (video display)
        const frontSide = new THREE.Group();
        screenGroup.add(frontSide);
        
        // Create the screen/display area
        const screenGeometry = new THREE.PlaneGeometry(14, 8);
        
        // Fallback color in case video fails to load
        const fallbackMaterial = new THREE.MeshBasicMaterial({ 
            color: new THREE.Color().setHSL(index * 0.1, 0.8, 0.5)
        });
        
        let screenMaterial = fallbackMaterial;
        
        // Check if type is video or pdf
        if (project.type === 'pdf') {
            
        } else {
            this.setupVideoScreen(screenGroup, project, fallbackMaterial);
            if (screenGroup.userData.videoTexture) {
                screenMaterial = new THREE.MeshBasicMaterial({ 
                    map: screenGroup.userData.videoTexture
                });
            }
        }
        
        const screen = new THREE.Mesh(screenGeometry, screenMaterial);
        screen.position.z = 0.11;
        frontSide.add(screen);
        
        
        // Store data with the mesh for interaction
        screenGroup.userData = { 
            ...screenGroup.userData,
            projectUrl: project.url,
            projectTitle: project.title,
            projectDescription: project.description,
            project: project, // Store the entire project object
            index: index,
            frontSide: frontSide
        };
        
        return screenGroup;
    }
    
    // ------------------------------
    // VIDEO MANAGEMENT
    // ------------------------------
    
    setupVideoScreen(screenGroup, project, fallbackMaterial) {
        try {
            // Create a video element
            const video = document.createElement('video');
            video.src = project.videoUrl;
            video.crossOrigin = 'anonymous';
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            video.load();
            
            // Create video texture
            const videoTexture = new THREE.VideoTexture(video);
            videoTexture.minFilter = THREE.LinearFilter;
            videoTexture.magFilter = THREE.LinearFilter;
            
            // Store video reference for control
            screenGroup.userData.video = video;
            screenGroup.userData.videoTexture = videoTexture;
            
            video.addEventListener('canplaythrough', () => {
                video.play().catch(e => {
                    console.log('Auto-play blocked, video will play on user interaction', e);
                });
            });
            
            video.addEventListener('error', (e) => {
                console.error('Video error:', e);
                // Use fallback if video fails
                if (screenGroup.children[1] && screenGroup.children[1].children[0]) {
                    screenGroup.children[1].children[0].material = fallbackMaterial;
                }
            });
        } catch (error) {
            console.error('Error setting up video:', error);
        }
    }
    
    pauseAllVideos() {
        if (!this.currentActiveCenter || !this.displays[this.currentActiveCenter]) return;
        
        this.displays[this.currentActiveCenter].forEach(screen => {
            if (screen.userData.video) {
                screen.userData.video.pause();
            }
        });
    }
    
    playVideo(index) {
        if (!this.currentActiveCenter || !this.displays[this.currentActiveCenter]) return;
        
        const displays = this.displays[this.currentActiveCenter];
        if (index < 0 || index >= displays.length) return;
        
        const screen = displays[index];
        if (screen.userData.video) {
            screen.userData.video.play().catch(e => {
                console.log('Could not play video', e);
            });
        }
    }

    positiondisplaysAroundCenter(centerType, centerPosition) {
        // Make sure displays exist
        if (!this.displays[centerType]) {
            return;
        }
        
        const displays = this.displays[centerType];
        const projectData = this.displaysData[centerType];
        const radius = 10; // Distance from center
        const heightOffset = 0; // Height above center
        
        // Reposition all displays to orbit around the specified center
        displays.forEach((screen, index) => {
            // Calculate position around a circle
            const angle = (index / projectData.length) * Math.PI * 2;
            const x = centerPosition.x + Math.sin(angle) * radius;
            const y = centerPosition.y + heightOffset; // Position above center
            const z = centerPosition.z + Math.cos(angle) * radius;
            
            // Set new position
            screen.position.set(x, y, z);
            
            // Make screen look at same-height target to prevent tilting down
            const lookTarget = new THREE.Vector3(
                centerPosition.x, 
                y, // Use the same y value as the screen
                centerPosition.z
            );
            screen.lookAt(lookTarget);
        });
    }
    
    zoomToCenter(centerType) {
        if (!this.displaysData[centerType]) return false;

        // Store original camera position if not already zoomed in
        if (!this.isZoomedIn) {
            this.originalCameraPosition = this.camera.position.clone();
            this.originalCameraRotation = this.camera.rotation.clone();
            this.originalControlsTarget = this.controls.target.clone();
            this.originalCameraLook = this.camera.getWorldDirection(new THREE.Vector3()).clone();
        }
        
        // Activate this center's displays
        this.activateCenter(centerType);
        // return if centerType is resume
        if (centerType === 'resume') {
            return;
        }
        
        // Get the center position
        const centerPosition = this.centerPositions[centerType] || new THREE.Vector3(0, 0, 0);
        this.controls.target.copy(centerPosition.add(new THREE.Vector3(0, 1, 1)));

        this.isZoomedIn = true;
        
        // Disable controls temporarily
        if (this.controls) {
            this.controls.enabled = false;
        }
        
        // Position displays around the proper center
        this.positiondisplaysAroundCenter(centerType, centerPosition);
        
        // Calculate target position for camera
        const cameraOffset = new THREE.Vector3(0, 5, 5); // Slightly above and back
        const targetPosition = centerPosition.clone().add(cameraOffset);
        
        // Create animation
        const duration = 300; // ms
        const startTime = Date.now();

        // get current cameraLook
        const currentCameraLook = this.camera.getWorldDirection(new THREE.Vector3()).clone();

        // define target camera Look at first screen
        const targetScreen = this.displays[centerType][0];
        const targetScreenLook = targetScreen.position.clone().add(new THREE.Vector3(0, 0, 1));
        
        // Define animation function
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease in-out cubic
            const ease = progress < 0.5 
                ? 4 * progress * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            
            // Move camera
            this.camera.position.lerpVectors(this.originalCameraPosition, targetPosition, ease);
            this.camera.lookAt.lerpVectors(currentCameraLook, targetScreenLook, ease);
            // Continue animation if not complete
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {

                // Re-enable controls after animation completes
                if (this.controls) {
                    setTimeout(() => {
                        this.controls.enabled = true;
                    }, 1000);
                    this.controls.enabled = true;
                    
                    // Set appropriate orbit controls for viewing displays
                    this.controls.minDistance = 8;
                    this.controls.maxDistance = 20;
                    
                    // Set the orbit control target to the center
                    //this.camera.lookAt(targetScreenLook);
                }
            }
        };
        
        // Start animation
        animate();
        return true;
    }

    showInfoPanel(project) {
        console.log("showing info panel for project: ", project)
        const panel = document.getElementById('info-panel');
        const title = document.getElementById('info-title');
        const description = document.getElementById('info-description');
        const link = document.getElementById('info-link');
    
        // Update panel content
        title.textContent = project.title;
        description.textContent = project.description;
        link.href = project.url;
    
        // Show the panel
        panel.classList.remove('hidden');
        panel.style.display = 'block';
    }
    
    hideInfoPanel() {
        const panel = document.getElementById('info-panel');
        panel.classList.add('hidden');
        panel.style.display = 'none';
    }
    
    // Call this in your screen click handler
    handleScreenClick(screenIndex) {
        console.log("handing screen click: ", screenIndex)
        if (!this.currentActiveCenter) return false;
        
        const displays = this.displays[this.currentActiveCenter];
        if (!displays || screenIndex < 0 || screenIndex >= displays.length) return false;
        const project = this.displaysData[this.currentActiveCenter][screenIndex];
        console.log("trying to show info panel for project: ", project)

        this.showInfoPanel(project);
        return true;
    }
    
    zoomOut() {
        // reset the  this.displays[centerType]
        if (!this.isZoomedIn) return;
        this.hideInfoPanel();
        this.isZoomedIn = false;
        
        // Disable controls temporarily
        if (this.controls) {
            this.controls.enabled = false;
        }
        
        // Check if we have a valid center to return to
        if (!this.currentActiveCenter || !this.centerPositions[this.currentActiveCenter]) {
            console.warn("Missing center position for zoom out");
            // Use a fallback position if necessary
            this.currentActiveCenter = Object.keys(this.centerPositions)[0];
        }

        // Store target position
        const targetPosition = this.centerPositions[this.currentActiveCenter].clone();
        
        // Store start position
        const startPosition = this.camera.position.clone();
        
        // Create animation to return to original position
        const duration = 800; // ms - a bit longer for smoother transition
        const startTime = Date.now();

        // Also store original camera direction and target center
        const startDirection = this.camera.getWorldDirection(new THREE.Vector3());
        const centerPosition = this.centerPositions[this.currentActiveCenter].clone();

        // Define animation function
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use easing for smoother motion
            const ease = progress < 0.5 
                ? 4 * progress * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            
            // Lerp camera position
            this.camera.position.lerpVectors(startPosition, this.originalCameraPosition, ease);
            //this.controls.target.copy(this.originalControlsTarget);
            // lerp vector controls target
            this.controls.target.lerpVectors(this.controls.target, this.originalControlsTarget, ease);
            // Animate camera looking direction
            // Calculate the direction vector from camera to center
            const direction = new THREE.Vector3().subVectors(centerPosition, this.camera.position).normalize();
            
            // Slerp between start direction and target direction
            const currentDirection = new THREE.Vector3().copy(startDirection);
            currentDirection.lerp(direction, ease).normalize();
            
            // Compute the look-at point
            const lookPoint = new THREE.Vector3().copy(this.camera.position).addScaledVector(currentDirection, 10);
            this.camera.lookAt(lookPoint);
            
            // If animation is still in progress
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete
                this.hideAlldisplays();
                

                
                // Reset current active center
                this.currentActiveCenter = null;
                
                // Re-enable orbit controls when returning to scroll view
                if (this.controls) {
                    setTimeout(() => {
                        this.controls.enabled = true;
                    }, 300);
                }
            }
        };
        
        // Start animation
        animate();
    }

    createDetailedInfoPanel() {
        // First, add HTML structure to your index.html
        if (!document.getElementById('project-info-panel')) {
            const panel = document.createElement('div');
            panel.id = 'project-info-panel';
            panel.className = 'project-info-panel hidden';
            panel.innerHTML = `
                <div class="panel-content">
                    <div class="panel-header">
                        <h2 class="project-title"></h2>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="panel-body">
                        <div class="project-media"></div>
                        <div class="project-description"></div>
                        <div class="project-tech-stack"></div>
                        <div class="project-links">
                            <a href="#" target="_blank" class="live-link">Visit Project</a>
                            <a href="#" target="_blank" class="repo-link">GitHub Repo</a>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(panel);
    
            // Add event listener for close button
            panel.querySelector('.close-btn').addEventListener('click', () => {
                this.hideDetailedInfoPanel();
            });
        }
    
        this.detailedInfoPanel = document.getElementById('project-info-panel');
    }
    
    showDetailedInfoPanel(projectIndex) {
        if (!this.detailedInfoPanel) {
            this.createDetailedInfoPanel();
        }
    
        // Get project data
        const project = this.displaysData[this.currentActiveCenter][projectIndex];
        if (!project) return;
    
        // Update panel content
        const panel = this.detailedInfoPanel;
        panel.querySelector('.project-title').textContent = project.title;
        
        // Handle description (can include HTML)
        const descriptionEl = panel.querySelector('.project-description');
        descriptionEl.innerHTML = project.detailedDescription || project.description;
    
        // Handle tech stack if available
        const techStackEl = panel.querySelector('.project-tech-stack');
        if (project.techStack && project.techStack.length) {
            techStackEl.innerHTML = '<h3>Technologies</h3><ul>' + 
                project.techStack.map(tech => `<li>${tech}</li>`).join('') + 
                '</ul>';
        } else {
            techStackEl.innerHTML = '';
        }
    
        // Handle media (video, images, etc.)
        const mediaEl = panel.querySelector('.project-media');
        if (project.videoUrl) {
            mediaEl.innerHTML = `<video src="${project.videoUrl}" controls autoplay loop muted></video>`;
        } else if (project.imageUrl) {
            mediaEl.innerHTML = `<img src="${project.imageUrl}" alt="${project.title}">`;
        } else {
            mediaEl.innerHTML = '';
        }
    
        // Update links
        const liveLink = panel.querySelector('.live-link');
        if (project.url) {
            liveLink.href = project.url;
            liveLink.style.display = 'inline-block';
        } else {
            liveLink.style.display = 'none';
        }
    
        const repoLink = panel.querySelector('.repo-link');
        if (project.repoUrl) {
            repoLink.href = project.repoUrl;
            repoLink.style.display = 'inline-block';
        } else {
            repoLink.style.display = 'none';
        }
    
        // Show panel with animation
        panel.classList.remove('hidden');
        
        // Temporarily disable orbit controls to prevent interference
        if (this.controls) {
            this.controls.enabled = false;
        }
    }
    
    hideDetailedInfoPanel() {
        if (this.detailedInfoPanel) {
            this.detailedInfoPanel.classList.add('hidden');
            
            // Re-enable controls
            if (this.controls) {
                setTimeout(() => {
                    this.controls.enabled = true;
                }, 300);
            }
        }
    }

    // ------------------------------
    // INTERACTION & DETECTION
    // ------------------------------
    
    findCenteredScreen(camera, displays) {
        if (!displays || displays.length === 0) return -1;
        
        // Camera direction vector
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(camera.quaternion);
        
        let bestDot = -1;
        let centeredIndex = -1;
        
        // Check each screen
        displays.forEach((screen, index) => {
            // Get direction to this screen from camera
            const screenDirection = new THREE.Vector3();
            screenDirection.subVectors(screen.position, camera.position).normalize();
            
            // Calculate dot product (higher means more centered)
            const dot = cameraDirection.dot(screenDirection);
            
            // If this is the most centered screen so far, remember it
            if (dot > bestDot && dot > 0.7) { // Screen must be reasonably in front
                bestDot = dot;
                centeredIndex = index;
            }
        });
        
        return centeredIndex;
    }
    
    applyOpacityToScreenElements(screen, opacity) {
        const applyToMaterial = (material) => {
            if (material.transparent !== undefined) {
                material.transparent = true;
            }
            if (material.opacity !== undefined) {
                material.opacity = opacity;
            }
        };
        
        // Process the screen and all its children recursively
        screen.traverse((child) => {
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(applyToMaterial);
                } else {
                    applyToMaterial(child.material);
                }
            }
        });
    }
    
    // ------------------------------
    // USER INTERACTION HANDLERS
    // ------------------------------
    
    // Modify the handleControlCenterClick method to handle special visualizations
    handleControlCenterClick(centerType) {
        // If already zoomed in, zoom out
        if (this.isZoomedIn) {
            this.zoomOut();
            return true;
        }

        
        // Otherwise activate the center and zoom to the overview
        if (centerType && this.displaysData[centerType]) {
            return this.zoomToCenter(centerType);
        }
        
        return false;
    }

    
    
    handleInfoPanelClick(point) {
        if (!this.isZoomedIn || !this.infoPanel || !this.infoPanel.visible) return false;
        
        const canvas = this.infoCanvas;
        
        // Check if click is within "Visit Project" button
        const visitButtonTop = canvas.height - 120;
        const visitButtonBottom = canvas.height - 50;
        const visitButtonLeft = canvas.width/2 - 150;
        const visitButtonRight = canvas.width/2 + 150;
        
        if (point.x >= visitButtonLeft && point.x <= visitButtonRight && 
            point.y >= visitButtonTop && point.y <= visitButtonBottom) {
            // Open project URL
            if (this.currentActiveCenter && this.currentFocusedScreen !== -1) {
                const projectData = this.displaysData[this.currentActiveCenter][this.currentFocusedScreen];
                if (projectData && projectData.url) {
                    window.open(projectData.url, '_blank');
                }
            }
            return true;
        }
        
        // Check if click is within "Back" button
        const backButtonTop = canvas.height - 200;
        const backButtonBottom = canvas.height - 150;
        const backButtonLeft = canvas.width/2 - 100;
        const backButtonRight = canvas.width/2 + 100;
        
        if (point.x >= backButtonLeft && point.x <= backButtonRight && 
            point.y >= backButtonTop && point.y <= backButtonBottom) {
            // Return to gallery view
            if (this.currentFocusedScreen !== -1) {
                this.zoomToCenter(this.currentActiveCenter);
                this.currentFocusedScreen = -1;
            }
            return true;
        }
        
        return false;
    }


}

export { ProjectScreens };