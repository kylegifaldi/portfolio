import * as THREE from 'three';
var originalControlsTarget = null; // Store original controls target
// Create a placeholder texture initially
var placeholderCanvas = document.createElement('canvas');
placeholderCanvas.width = 1024;
placeholderCanvas.height = 720;
var ctx = placeholderCanvas.getContext('2d');

class ProjectScreens {
    constructor(scene, camera, controls) {
        this.scene = scene;
        this.camera = camera;
        this.controls = controls;
        this.originalCameraPosition = camera.position.clone();
        this.isZoomedIn = false;
        this.currentFocusedScreen = -1;
        this.screens = {};
        this.currentCenteredScreen = -1;
        this.currentActiveCenter = null; // Which center is currently active
        
        // Store position of each control center
        this.centerPositions = {
            'projects': new THREE.Vector3(-40, -2, 2),
            'work': new THREE.Vector3(-10, -2, 2),
            'resume': new THREE.Vector3(20, -2, 2)
        };
        // Create different content for each center
        this.screensData = {
            'projects': [
                { 
                    title: 'Personal Project 1', 
                    url: 'https://example.com/project1', 
                    videoUrl: './assets/video/demo.mp4',
                    description: 'An innovative web application that helps users track their daily activities and improve productivity through insightful analytics and customizable dashboards.'
                },
                { 
                    title: 'Personal Project 2', 
                    url: 'https://example.com/project2', 
                    videoUrl: './assets/video/tabs-demo.mp4',
                    description: 'Advanced tab management system with intuitive drag-and-drop interface, allowing for seamless organization of content across multiple categories.'
                },
                { 
                    title: 'Personal Project 3', 
                    url: 'https://example.com/project3', 
                    videoUrl: './assets/video/subtitle-demo.mp4',
                    description: 'Interactive 3D visualization tool for data analysis, enabling users to explore complex datasets in an engaging and informative manner.'
                },
                { 
                    title: 'Personal Project 4', 
                    url: 'https://example.com/project4', 
                    videoUrl: './assets/video/preview-and-dynamically-add-new-conditions.mp4',
                    description: 'A web-based game that combines strategy and puzzle-solving elements, providing a unique gaming experience with rich graphics and sound.'
                },
            ],
            'work': [
                { 
                    title: 'Professional Work 1', 
                    url: 'https://example.com/work1', 
                    videoUrl: './assets/video/demo.mp4',
                    description: 'Enterprise solution that streamlined business operations by automating complex workflows and providing real-time analytics dashboards.'
                },
                { 
                    title: 'Professional Work 2', 
                    url: 'https://example.com/work2', 
                    videoUrl: './assets/video/demo.mp4',
                    description: 'Client-facing web application with focus on accessibility and performance, delivering critical information in an intuitive interface.'
                },
                // Add more work projects...
            ],
            'resume': [
                { 
                    title: 'Education', 
                    url: 'https://example.com/education', 
                    document: './assets/pdf/resume.pdf',
                    type: 'pdf',
                    description: 'Bachelor of Science in Computer Science from Example University, graduated with honors. Specialized in web technologies and human-computer interaction.'
                }
            ]
        };
        
        // Track screen state for each center
        this.screenStates = {
            'projects': {
                currentCenteredScreen: -1,
                expandScale: 1.5,
                normalScale: 1.0,
                currentScales: [],
                flippedScreens: {}
            },
            'work': {
                currentCenteredScreen: -1,
                expandScale: 1.5,
                normalScale: 1.0,
                currentScales: [],
                flippedScreens: {}
            },
            'resume': {
                currentCenteredScreen: -1,
                expandScale: 1.5,
                normalScale: 1.0,
                currentScales: [],
                flippedScreens: {}
            }
        };
        
        // Initialize but don't create screens yet - they'll be created on demand
        this.scaleTransitionSpeed = 0.1;
        
        // Create info panel that will be reused
        //this.createInfoPanel();
    }
    
    // Method to activate a specific center's screens
    activateCenter(centerType) {
        if (!this.screensData[centerType]) return false;
        
        // If this center is already active, do nothing
        if (this.currentActiveCenter === centerType && this.screens[centerType]) {
            return true;
        }
        
        // Hide any currently active screens
        this.hideAllScreens();
        
        // Set the new active center
        this.currentActiveCenter = centerType;
        
        // Create screens for this center if they don't exist
        if (!this.screens[centerType]) {
            this.createScreens(centerType);
        }
        
        // Show the screens for this center
        this.screens[centerType].forEach(screen => {
            screen.visible = true;
        });
        
        return true;
    }
    
    // Hide all screens from all centers
    hideAllScreens() {
        Object.keys(this.screens).forEach(centerType => {
            if (this.screens[centerType]) {
                this.screens[centerType].forEach(screen => {
                    screen.visible = false;
                });
            }
        });
    }
    
    createScreens(centerType) {
        const projectData = this.screensData[centerType];
        if (!projectData) return;
        
        const radius = 5; // Distance from center
        const screens = [];
        
        projectData.forEach((project, index) => {
            // Calculate position around a circle
            const angle = (index / projectData.length) * Math.PI * 2;
            const x = Math.sin(angle) * radius;
            const z = Math.cos(angle) * radius;
            
            // Create screen
            const screen = this.createScreen(project, index);
            screen.position.set(x, 0, z);
            
            // Look at center
            screen.lookAt(0, 0, 0);
            
            this.scene.add(screen);
            screens.push(screen);
            
            // Initialize state tracking
            this.screenStates[centerType].currentScales[index] = this.screenStates[centerType].normalScale;
            this.screenStates[centerType].flippedScreens[index] = false;
        });
        
        // Store screens for this center
        this.screens[centerType] = screens;
        
        return screens;
    }
    
    // Add these methods after the createScreens method

createScreen(project, index) {
    // Create container for screen
    const screenGroup = new THREE.Group();
    
    // Create the TV frame
    const frameGeometry = new THREE.BoxGeometry(12, 8, 0);
    const frameMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        roughness: 0.8
    });
    // make the backside of the screen transparent
    frameMaterial.transparent = true;
    frameMaterial.opacity = 0.2;
    frameMaterial.side = THREE.BackSide; // Only render the back side
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    screenGroup.add(frame);
    
    // Create front side (video display)
    const frontSide = new THREE.Group();
    screenGroup.add(frontSide);
    
    // Create the screen/display area
    const screenGeometry = new THREE.PlaneGeometry(12, 8);
    
    // Fallback color in case video fails to load
    const fallbackMaterial = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color().setHSL(index * 0.1, 0.8, 0.5)
    });
    
    let screenMaterial = fallbackMaterial;
    
    // Replace the PDF section in your createScreen method with:

    // check if type is video or pdf
    if (project.type === 'pdf') {

        // Draw loading message
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, placeholderCanvas.width, placeholderCanvas.height);
        ctx.font = 'bold 36px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Loading PDF...', placeholderCanvas.width/2, placeholderCanvas.height/2);
        
        // Create initial texture with loading screen
        const pdfTexture = new THREE.CanvasTexture(placeholderCanvas);
        screenMaterial = new THREE.MeshBasicMaterial({ 
            map: pdfTexture
        });
        
        // Store the canvas in userData for later updates
        screenGroup.userData.pdfCanvas = placeholderCanvas;
        screenGroup.userData.pdfContext = ctx;
        screenGroup.userData.pdfTexture = pdfTexture;
        screenGroup.userData.isPdf = true;
        screenGroup.userData.pdfLoaded = false;
        screenGroup.userData.currentPage = 1;
        console.log("Screen group before passing: ", screenGroup);
        
        // Load PDF.js if not already loaded
        if (typeof pdfjsLib === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
            script.onload = () => {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
                this.loadPdf(project.document, k );
            };
            document.head.appendChild(script);
        } else {
            // PDF.js already loaded
            this.loadPdf(project.document, screenGroup);
        }
    }
        else{
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
            
            // Create material with video texture
            screenMaterial = new THREE.MeshBasicMaterial({ 
                map: videoTexture
            });
            
            // Store video reference for control
            screenGroup.userData.video = video;
            
            video.addEventListener('canplaythrough', () => {
                video.play().catch(e => {
                    console.log('Auto-play blocked, video will play on user interaction', e);
                });
            });
            
            video.addEventListener('error', (e) => {
                console.error('Video error:', e);
                screen.material = fallbackMaterial;
            });
        } catch (error) {
            console.error('Error setting up video:', error);
        }
    }
    
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.z = 0.11;
    frontSide.add(screen);
    
    // Add title bar
    const titleBarGeometry = new THREE.BoxGeometry(2.7, 0.3, 0.1);
    const titleBarMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.5
    });
    const titleBar = new THREE.Mesh(titleBarGeometry, titleBarMaterial);
    titleBar.position.y = -1.0;
    titleBar.position.z = 0.11;
    //frontSide.add(titleBar);
    
    // Add title text
    this.addTitleText(project.title, titleBar);
    
    // Store data with the mesh for interaction
    screenGroup.userData = { 
        projectUrl: project.url,
        projectTitle: project.title,
        projectDescription: project.description,
        index: index,
        frontSide: frontSide
    };
    
    return screenGroup;
}

// Fix the loadPdf method to properly handle context errors

loadPdf(url, screenGroup) {
    // First, verify that canvas and context are valid
    if (!screenGroup.userData.pdfCanvas || !screenGroup.userData.pdfContext) {
        console.error('Canvas or context is missing for PDF rendering');
        console.log('ScreenGroup:', screenGroup);

        return;
    }
    
    const loadingTask = pdfjsLib.getDocument(url);
    
    loadingTask.promise.then(pdf => {
        console.log('PDF loaded successfully');
        screenGroup.userData.pdf = pdf;
        screenGroup.userData.pdfLoaded = true;
        screenGroup.userData.numPages = pdf.numPages;
        
        // Render first page
        this.renderPdfPage(screenGroup, 1);
        
        // Add navigation controls to the screen
        this.addPdfControls(screenGroup);
    }).catch(error => {
        console.error('Error loading PDF:', error);
        
        // Double-check canvas and context before using
        const canvas = screenGroup.userData.pdfCanvas;
        const ctx = screenGroup.userData.pdfContext;
        
        if (canvas && ctx) {
            // Show error on canvas
            ctx.fillStyle = '#500';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = 'bold 28px Arial';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Error loading PDF', canvas.width/2, canvas.height/2 - 20);
            ctx.font = '24px Arial';
            ctx.fillText('Please try again later', canvas.width/2, canvas.height/2 + 20);
            
            // Ensure texture is updated
            if (screenGroup.userData.pdfTexture) {
                screenGroup.userData.pdfTexture.needsUpdate = true;
            }
        } else {
            console.error('Cannot show PDF error - canvas or context missing');
        }
    });
}

// Add safety checks to renderPdfPage method

renderPdfPage(screenGroup, pageNum) {
    // Verify all required properties exist
    if (!screenGroup || 
        !screenGroup.userData || 
        !screenGroup.userData.pdfLoaded ||
        !screenGroup.userData.pdf ||
        !screenGroup.userData.pdfCanvas ||
        !screenGroup.userData.pdfContext) {
        console.error('Missing required PDF properties for rendering');
        return;
    }
    
    const pdf = screenGroup.userData.pdf;
    const canvas = screenGroup.userData.pdfCanvas;
    const ctx = screenGroup.userData.pdfContext;
    
    // Clear canvas
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Validate page number
    pageNum = Math.max(1, Math.min(pageNum, pdf.numPages));
    screenGroup.userData.currentPage = pageNum;
    
    // Get the page
    pdf.getPage(pageNum).then(page => {
        // Calculate scale to fit the canvas
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(
            canvas.width / viewport.width,
            canvas.height / viewport.height
        ) * 0.9; // 90% to leave some margin
        
        const scaledViewport = page.getViewport({ scale });
        
        // Position in center of canvas
        const offsetX = (canvas.width - scaledViewport.width) / 2;
        const offsetY = (canvas.height - scaledViewport.height) / 2;
        
        // Render the page
        const renderContext = {
            canvasContext: ctx,
            viewport: scaledViewport,
            transform: [1, 0, 0, 1, offsetX, offsetY]
        };
        
        page.render(renderContext).promise.then(() => {
            // Draw page number
            ctx.font = '18px Arial';
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.fillText(`Page ${pageNum} of ${pdf.numPages}`, canvas.width/2, canvas.height - 20);
            
            // Update the texture
            if (screenGroup.userData.pdfTexture) {
                screenGroup.userData.pdfTexture.needsUpdate = true;
            }
        }).catch(error => {
            console.error('Error rendering PDF page:', error);
            this.showPdfError(screenGroup, 'Error rendering PDF page');
        });
    }).catch(error => {
        console.error('Error getting PDF page:', error);
        this.showPdfError(screenGroup, 'Error loading PDF page');
    });
}

// Add a helper method to show PDF errors
showPdfError(screenGroup, message) {
    if (!screenGroup || !screenGroup.userData) return;
    
    const canvas = screenGroup.userData.pdfCanvas;
    const ctx = screenGroup.userData.pdfContext;
    
    if (!canvas || !ctx) return;
    
    // Clear canvas with error color
    ctx.fillStyle = '#500';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Show error message
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, canvas.width/2, canvas.height/2 - 20);
    ctx.font = '24px Arial';
    ctx.fillText('Please try again later', canvas.width/2, canvas.height/2 + 20);
    
    // Update texture
    if (screenGroup.userData.pdfTexture) {
        screenGroup.userData.pdfTexture.needsUpdate = true;
    }
}

addTitleText(title, parent) {
    // Create a canvas for the text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 64;
    
    // Set background to transparent
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw text
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Create material with texture
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    // Create plane for text
    const geometry = new THREE.PlaneGeometry(2.6, 0.25);
    const textMesh = new THREE.Mesh(geometry, material);
    textMesh.position.z = 0.06; // Slightly in front of title bar
    
    parent.add(textMesh);
    return textMesh;
}

findCenteredScreen(camera, screens) {
    if (!screens || screens.length === 0) return -1;
    
    // Camera direction vector
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(camera.quaternion);
    
    let bestDot = -1;
    let centeredIndex = -1;
    
    // Check each screen
    screens.forEach((screen, index) => {
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

pauseAllVideos() {
    if (!this.currentActiveCenter || !this.screens[this.currentActiveCenter]) return;
    
    this.screens[this.currentActiveCenter].forEach(screen => {
        if (screen.userData.video) {
            screen.userData.video.pause();
        }
    });
}

playVideo(index) {
    if (!this.currentActiveCenter || !this.screens[this.currentActiveCenter]) return;
    
    const screens = this.screens[this.currentActiveCenter];
    if (index < 0 || index >= screens.length) return;
    
    const screen = screens[index];
    if (screen.userData.video) {
        screen.userData.video.play().catch(e => {
            console.log('Could not play video', e);
        });
    }
}

// Method to zoom directly to a specific screen
zoomToScreen(screenIndex) {
    if (!this.currentActiveCenter) return false;
    
    const screens = this.screens[this.currentActiveCenter];
    if (!screens || screenIndex < 0 || screenIndex >= screens.length) return false;
    
    const screen = screens[screenIndex];
    
    // Store which screen we're viewing
    this.currentFocusedScreen = screenIndex;
    this.isZoomedIn = true;
    
    // Pause all videos except the focused one
    this.pauseAllVideos();
    this.playVideo(screenIndex);
    
    // Disable controls temporarily during animation
    if (this.controls) {
        this.controls.enabled = false;
    }
    
    // Store original positions
    this.originalScreenPositions = screens.map(s => s.position.clone());
    
    // Calculate target position for camera
    const offset = new THREE.Vector3(0, 0, 4); // Position in front of the screen
    const targetPosition = screen.position.clone().add(offset);
    
    // Create animation
    const duration = 1200; // ms
    const startTime = Date.now();
    
    // Define animation function
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease in-out cubic
        const ease = progress < 0.5 
            ? 4 * progress * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        // Move camera closer to the screen
        this.camera.position.lerpVectors(this.camera.position, targetPosition, ease);
        
        // Make camera look at the screen
        this.camera.lookAt(screen.position);
        
        // Fade out other screens gradually
        screens.forEach((s, i) => {
            if (i !== screenIndex) {
                // Calculate distance factor for smooth fade based on distance from focused screen
                const distFactor = 1 - Math.min(1, ease * 2);
                
                // Apply opacity to elements
                this.applyOpacityToScreenElements(s, distFactor);
            }
        });
        
        // Continue animation if not complete
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Re-enable controls after animation completes
            if (this.controls) {
                this.controls.enabled = true;
                
                // Limit orbit controls while focused on a single screen
                this.controls.minDistance = 2;
                this.controls.maxDistance = 6;
                this.controls.target.copy(screen.position);
            }
        }
    };
    
    // Start animation
    animate();
    return true;
}

// Helper method to apply opacity to all elements of a screen
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

// Method to handle screen clicks
handleScreenClick(screenIndex) {
    if (!this.currentActiveCenter) return false;
    
    // If already focusing on a screen, return to center view
    if (this.currentFocusedScreen !== -1) {
        this.zoomToCenter(this.currentActiveCenter);
        this.currentFocusedScreen = -1;
        return true;
    }
    
    // Otherwise zoom to the clicked screen
    return this.zoomToScreen(screenIndex);
}

createInfoPanel() {
    // Create a panel to display project information when zoomed to a screen
    const panelGeometry = new THREE.PlaneGeometry(5, 3);
    const panelMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x222222,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    
    this.infoPanel = new THREE.Mesh(panelGeometry, panelMaterial);
    this.infoPanel.visible = false; // Hide initially
    this.scene.add(this.infoPanel);
    
    // Create text canvas for the panel
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 768;
    
    // Store canvas and context for updating later
    this.infoCanvas = canvas;
    this.infoContext = ctx;
    
    // Create texture for the canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    // Create material and plane for text
    const textMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 1
    });
    
    const textGeometry = new THREE.PlaneGeometry(4.8, 2.8);
    this.infoText = new THREE.Mesh(textGeometry, textMaterial);
    this.infoText.position.z = 0.01; // Slightly in front of panel
    this.infoPanel.add(this.infoText);
}

updateInfoPanel(project) {
    if (!this.infoContext || !this.infoCanvas) return;
    
    const ctx = this.infoContext;
    const canvas = this.infoCanvas;
    
    // Clear canvas
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(project.title, canvas.width/2, 100);
    
    // Add description
    ctx.font = '32px Arial';
    this.wrapText(ctx, project.description, canvas.width/2, 200, 900, 48);
    
    // Add "Visit Project" button
    ctx.fillStyle = '#00aaff';
    ctx.fillRect(canvas.width/2 - 150, canvas.height - 120, 300, 70);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('Visit Project', canvas.width/2, canvas.height - 75);
    
    // Add "Back" button
    ctx.fillStyle = '#666666';
    ctx.fillRect(canvas.width/2 - 100, canvas.height - 200, 200, 50);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.fillText('Return to Gallery', canvas.width/2, canvas.height - 170);
    
    // Update texture
    this.infoText.material.map.needsUpdate = true;
}

wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    
    ctx.fillText(line, x, y);
    return y;
}

// Method to handle info panel clicks
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
            const projectData = this.screensData[this.currentActiveCenter][this.currentFocusedScreen];
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
    // Method to handle control center click - updated to support multiple centers
    handleControlCenterClick(centerType) {
        // If already zoomed in, zoom out
        if (this.isZoomedIn) {
            this.zoomOut();
            return true;
        }
        
        // Otherwise activate the center and zoom to the overview
        if (centerType && this.screensData[centerType]) {
            return this.zoomToCenter(centerType);
        }
        
        return false;
    }

    // Update zoomToCenter to use the stored positions
    zoomToCenter(centerType) {
        if (!this.screensData[centerType]) return false;
        // Store original camera position if not already zoomed in
        if (!this.isZoomedIn) {
            this.originalCameraPosition = this.camera.position.clone();
            this.originalCameraRotation = this.camera.rotation.clone();
            this.originalControlsTarget = this.controls.target.clone(); // Store original target
            this.originalCameraLook = this.camera.getWorldDirection(new THREE.Vector3()).clone(); // Store original camera look direction
        }
        
        // Activate this center's screens
        this.activateCenter(centerType);
        
        // Get the center position
        const centerPosition = this.centerPositions[centerType] || new THREE.Vector3(0, 0, 0);
        
        
        this.isZoomedIn = true;
        
        // Disable controls temporarily
        if (this.controls) {
            this.controls.enabled = false;
        }
        
        // Position screens around the proper center
        this.positionScreensAroundCenter(centerType, centerPosition);
        
        // Calculate target position for camera
        // We want to be behind and slightly above the center, looking at it
        const cameraOffset = new THREE.Vector3(0, 2, 5); // Slightly above and back
        const targetPosition = centerPosition.clone().add(cameraOffset);
        
        // Create animation
        const duration = 300; // ms
        const startTime = Date.now();
        
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
            
            // Make camera look at the center
            this.camera.lookAt(centerPosition);
            
            // Continue animation if not complete
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Re-enable controls after animation completes
                if (this.controls) {
                    this.controls.enabled = true;
                    
                    // Set appropriate orbit controls for viewing screens
                    this.controls.minDistance = 8;
                    this.controls.maxDistance = 20;
                    
                    // Set the orbit control target to the center
                    this.controls.target.copy(centerPosition);
                }
            }
        };
        
        // Start animation
        animate();
        return true;
    }

// Add this new method to position screens around the selected center
positionScreensAroundCenter(centerType, centerPosition) {
    // Make sure screens exist
    if (!this.screens[centerType]) {
        return;
    }
    
    const screens = this.screens[centerType];
    const projectData = this.screensData[centerType];
    const radius = 8; // Distance from center
    
    // Reposition all screens to orbit around the specified center
    screens.forEach((screen, index) => {
        // Calculate position around a circle
        const angle = (index / projectData.length) * Math.PI * 2;
        const x = centerPosition.x + Math.sin(angle) * radius;
        const y = centerPosition.y; // Same height
        const z = centerPosition.z + Math.cos(angle) * radius;
        
        // Set new position
        screen.position.set(x, y, z);
        
        // Make screen look at center
        screen.lookAt(centerPosition);
    });
}
// Update the zoomOut method to correctly handle the center positions
zoomOut() {
    if (!this.isZoomedIn) return;
    
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
    const targetPosition = new THREE.Vector3(
        this.centerPositions[this.currentActiveCenter].x,
        this.centerPositions[this.currentActiveCenter].y,
        this.centerPositions[this.currentActiveCenter].z
    );
    
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
        this.camera.position.lerpVectors(startPosition, targetPosition, ease);
        
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
            this.hideAllScreens();
            
            // Update controls target (if needed) to match our final look direction
            if (this.controls) {
                this.controls.target.copy(centerPosition);
            }
            
            // Reset current active center
            this.currentActiveCenter = null;
            
            // Re-enable orbit controls when returning to scroll view
            if (this.controls) {
                // You may want to re-enable controls after a short delay to prevent unwanted interaction
                setTimeout(() => {
                    this.controls.enabled = true;
                }, 300);
            }
        }
    };
    
    // Start animation
    animate();
}

    // Update method to check which screen is centered
    update(camera) {
        if (!this.isZoomedIn || !this.currentActiveCenter) return;
        
        const screens = this.screens[this.currentActiveCenter];
        if (!screens) return;
        
        // Get state for current center
        const state = this.screenStates[this.currentActiveCenter];
        
        // Find centered screen
        const centeredScreenIndex = this.findCenteredScreen(camera, screens);
        
        // Update centered screen if changed
        if (centeredScreenIndex !== -1 && centeredScreenIndex !== state.currentCenteredScreen) {
            state.currentCenteredScreen = centeredScreenIndex;
        } else if (centeredScreenIndex === -1 && state.currentCenteredScreen !== -1) {
            state.currentCenteredScreen = -1;
        }
        
        // Update screen scales
        screens.forEach((screen, i) => {
            // Target scale based on if screen is centered
            const targetScale = (i === state.currentCenteredScreen) ? 
                state.expandScale : state.normalScale;
            
            // Smooth transition
            state.currentScales[i] += (targetScale - state.currentScales[i]) * this.scaleTransitionSpeed;
            
            // Apply scale
            screen.scale.set(
                state.currentScales[i], 
                state.currentScales[i], 
                state.currentScales[i]
            );
            
            // Subtle floating movement
            screen.position.y = Math.sin(Date.now() * 0.001 + i) * 0.1;
        });
    }
    

}

export { ProjectScreens };