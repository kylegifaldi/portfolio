import * as THREE from 'three';

class ControlCenter {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.controlCenter = null;
        this.wireframes = [];
        this.rotationSpeed = 0.003;
        this.targetRotationSpeed = 0.003;
        this.lastCameraPosition = new THREE.Vector3();
        this.isHovering = false;
        this.pulsateIntensity = 0;
        this.hoverTransition = 0; // Add this: 0 = not hovering, 1 = hovering
        this.targetHoverState = false;
        
        // Default options
        this.options = {
            position: new THREE.Vector3(0, 0, 0),
            scale: 0.7,
            colorScheme: 'default',
            title: 'Control Center',
            type: 'projects' // projects, work, or resume
        };
        
        // Override with provided options
        Object.assign(this.options, options);
        
        this.createControlCenter();
    }
  
    createControlCenter() {
        const group = new THREE.Group();
        
        // Create nested geometric wireframes based on the type
        this.createWireframes(group);
        
        // Add interaction points/buttons
        this.addControlPoints(group);
        
        // Add title text
        this.addTitleText(group);
        
        // Position the control center
        group.position.copy(this.options.position);
        
        // Scale the control center
        group.scale.set(
            this.options.scale, 
            this.options.scale, 
            this.options.scale
        );
        
        this.controlCenter = group;
        this.scene.add(group);
        
        // Add user data for raycaster detection
        this.controlCenter.userData = {
            type: 'controlCenter',
            centerType: this.options.type
        };
    }
    
    createWireframes(group) {
        // Different geometries and colors based on type
        const colorSchemes = {
            'default': {
                outer: 0x00ffff,
                middle: 0xff00ff,
                inner: 0xffff00,
                core: 0xffffff
            },
            'work': {
                outer: 0x66ff66,
                middle: 0x00cc88,
                inner: 0x00ffaa,
                core: 0xaaffcc
            },
            'resume': {
                outer: 0xff6633,
                middle: 0xffaa22,
                inner: 0xffcc44,
                core: 0xffeebb
            }
        };
        
        // Get color scheme or use default
        const colors = colorSchemes[this.options.colorScheme] || colorSchemes.default;
        
        // Create outer layer (different geometry per type)
        let outerGeometry;
        
        switch(this.options.type) {
            case 'work':
                // More structured, professional look
                outerGeometry = new THREE.OctahedronGeometry(1, 1);
                break;
            case 'resume':
                // More polished, refined look
                outerGeometry = new THREE.DodecahedronGeometry(1, 0);
                break;
            case 'projects':
            default:
                // More creative, dynamic look
                outerGeometry = new THREE.IcosahedronGeometry(1, 1);
                break;
        }
        
        const outerMaterial = new THREE.MeshBasicMaterial({
            color: colors.outer,
            wireframe: true,
            transparent: true,
            opacity: 0.7
        });
        
        const outer = new THREE.Mesh(outerGeometry, outerMaterial);
        group.add(outer);
        this.wireframes.push(outer);
        
        // Middle layer
        let middleGeometry;
        
        switch(this.options.type) {
            case 'work':
                middleGeometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
                break;
            case 'resume':
                middleGeometry = new THREE.IcosahedronGeometry(0.8, 0);
                break;
            case 'projects':
            default:
                middleGeometry = new THREE.DodecahedronGeometry(0.8, 0);
                break;
        }
        
        const middleMaterial = new THREE.MeshBasicMaterial({
            color: colors.middle,
            wireframe: true,
            transparent: true,
            opacity: 0.7
        });
        
        const middle = new THREE.Mesh(middleGeometry, middleMaterial);
        group.add(middle);
        this.wireframes.push(middle);
        
        // Inner layer
        let innerGeometry;
        
        switch(this.options.type) {
            case 'work':
                innerGeometry = new THREE.TetrahedronGeometry(0.6, 0);
                break;
            case 'resume':
                innerGeometry = new THREE.OctahedronGeometry(0.6, 0);
                break;
            case 'projects':
            default:
                innerGeometry = new THREE.OctahedronGeometry(0.6, 0);
                break;
        }
        
        const innerMaterial = new THREE.MeshBasicMaterial({
            color: colors.inner,
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });
        
        const inner = new THREE.Mesh(innerGeometry, innerMaterial);
        group.add(inner);
        this.wireframes.push(inner);
        
        // Core
        const coreGeometry = new THREE.SphereGeometry(0.3, 12, 12);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: colors.core,
            wireframe: true,
            transparent: true,
            opacity: 0.9
        });
        
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        group.add(core);
        this.wireframes.push(core);
    }
    
    addControlPoints(group) {
        // Different control point styles based on type
        let colors;
        
        switch(this.options.type) {
            case 'work':
                colors = [0x66ff66, 0x44cc44, 0x22aa22, 0x33dd33, 0x55ee55];
                break;
            case 'resume':
                colors = [0xff8833, 0xff6611, 0xffaa22, 0xffbb33, 0xffcc44];
                break;
            case 'projects':
            default:
                colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
                break;
        }
        
        for (let i = 0; i < 5; i++) {
            // Place buttons at pentagonal positions on the outer shape
            const angle = (i / 5) * Math.PI * 2;
            // Position on the xz plane
            const x = Math.sin(angle) * 1.8;
            const z = Math.cos(angle) * 1.8;
            
            // Use different geometries based on type
            let pointGeometry;
            
            switch(this.options.type) {
                case 'work':
                    pointGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
                    break;
                case 'resume':
                    pointGeometry = new THREE.OctahedronGeometry(0.1, 0);
                    break;
                case 'projects':
                default:
                    pointGeometry = new THREE.IcosahedronGeometry(0.1, 1);
                    break;
            }
            
            const pointMaterial = new THREE.MeshBasicMaterial({ 
                color: colors[i],
                wireframe: true,
                transparent: true,
                opacity: 0.8
            });
            
            const point = new THREE.Mesh(pointGeometry, pointMaterial);
            point.position.set(x, 0, z);
            point.userData = { type: 'button', index: i };
            
            // Add a small emissive center to each control point
            const dotGeometry = new THREE.SphereGeometry(0.03, 8, 8);
            const dotMaterial = new THREE.MeshBasicMaterial({
                color: colors[i],
                transparent: true,
                opacity: 0.9
            });
            const dot = new THREE.Mesh(dotGeometry, dotMaterial);
            point.add(dot);
            
            group.add(point);
            this.wireframes.push(point);
        }
    }
    
    addTitleText(group) {
        // Create a canvas for the text
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 500;
        canvas.height = 74;
        
        // Set background to transparent
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Style text based on type
        let textColor;
        switch(this.options.type) {
            case 'work':
                textColor = '#66ff66';
                break;
            case 'resume':
                textColor = '#ff8833';
                break;
            case 'projects':
            default:
                textColor = '#00ffff';
                break;
        }
        
        // Draw text
        ctx.font = 'bold 64px Roboto';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.options.title, canvas.width / 2, canvas.height / 2);
        
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
        const geometry = new THREE.PlaneGeometry(4, 1);
        const textMesh = new THREE.Mesh(geometry, material);
        textMesh.position.y = -2;
        textMesh.rotation.x = -Math.PI / 4; // Tilt up slightly
        
        group.add(textMesh);
    }
    // Modify the setHoverState method to target the transition instead of applying immediately
    setHoverState(isHovering) {
        if (this.targetHoverState !== isHovering) {
            this.targetHoverState = isHovering;
            
            // Only store original values when entering hover state for the first time
            if (isHovering && this.hoverTransition === 0) {
                // Highlight all wireframes - store original values
                this.wireframes.forEach((wireframe, index) => {
                    if (wireframe.material) {
                        // Store original color and opacity
                        wireframe.userData.originalColor = wireframe.material.color.clone();
                        wireframe.userData.originalOpacity = wireframe.material.opacity;
                        wireframe.userData.originalScale = wireframe.scale.clone();
                        
                        // Store unique phase offset for each wireframe
                        wireframe.userData.pulsePhase = index * 0.5; // Different phase for each wireframe
                        wireframe.userData.pulseSpeed = 0.5 + Math.random() * 0.5; // Different speed factor
                    }
                });
                
                // Store original center scale
                this.controlCenter.userData.originalScale = this.controlCenter.scale.clone();
            }
        }
    }
    
    // Replace the transition logic in your update method with this improved version
update(camera) {
    if (!this.controlCenter) return;
    
    // Calculate camera movement for dynamic response
    if (camera) {
        const movement = new THREE.Vector3().subVectors(camera.position, this.lastCameraPosition);
        const movementMagnitude = movement.length();
        
        // Increase rotation speed based on camera movement
        if (movementMagnitude > 0.01) {
            this.targetRotationSpeed = 0.01 + movementMagnitude * 0.1;
            // Cap maximum rotation speed
            if (this.targetRotationSpeed > 0.2) this.targetRotationSpeed = 0.2;
        } else {
            // Gradually return to base rotation speed
            this.targetRotationSpeed = 0.003;
        }
        
        // Smooth rotation speed transitions
        this.rotationSpeed += (this.targetRotationSpeed - this.rotationSpeed) * 0.1;
        
        this.lastCameraPosition.copy(camera.position);
    }
    
    // Smooth transition between hover states
    if (this.targetHoverState) {
        // Transition in: faster
        this.hoverTransition += (1 - this.hoverTransition) * 0.08;
    } else {
        // Transition out: slower
        this.hoverTransition *= 0.9; // This ensures it approaches zero
    }
    
    // Clamp transition value
    this.hoverTransition = Math.max(0, Math.min(1, this.hoverTransition));
    
    // Set the actual hover state based on transition threshold
    this.isHovering = this.hoverTransition > 0.1;
    
    // Apply effects based on hover transition value
    if (this.hoverTransition > 0) {
        // Add base pulsating effect
        this.pulsateIntensity = (Math.sin(Date.now() * 0.003) + 1) * 0.5 * this.hoverTransition;
        
        // Apply smooth transition to wireframes
        this.wireframes.forEach((wireframe, index) => {
            // Only apply to wireframes with stored original values
            if (wireframe.material && wireframe.userData.originalScale) {
                // Calculate unique pulsation for each wireframe using its phase
                const phase = wireframe.userData.pulsePhase || 0;
                const speed = wireframe.userData.pulseSpeed || 1;
                const individualPulse = (Math.sin(Date.now() * 0.003 * speed + phase) + 1) * 0.5;
                
                // Pulse opacity - scale with transition
                const opacityBoost = this.hoverTransition * 0.5; // Max 50% opacity increase
                wireframe.material.opacity = 
                    wireframe.userData.originalOpacity + (individualPulse * 0.2 * this.hoverTransition) + opacityBoost;
                    
                // Pulse scale - each wireframe pulses at its own rate
                const scaleMultiplier = 1 + (individualPulse * 0.2 * this.hoverTransition);
                wireframe.scale.copy(wireframe.userData.originalScale).multiplyScalar(scaleMultiplier);
                
                // Add some subtle color shifting based on pulse and transition
                if (wireframe.userData.originalColor) {
                    const hsl = {h: 0, s: 0, l: 0};
                    wireframe.userData.originalColor.getHSL(hsl);
                    wireframe.material.color.setHSL(
                        hsl.h + (individualPulse * 0.1 * this.hoverTransition), // Subtle hue shift
                        hsl.s, 
                        hsl.l + (individualPulse * 0.1 * this.hoverTransition)  // Brighten slightly
                    );
                }
            }
            
            // Pulse scale for control points
            if (wireframe.userData && wireframe.userData.type === 'button') {
                const dotScale = 1 + (this.pulsateIntensity * 0.5);
                wireframe.children[0].scale.set(dotScale, dotScale, dotScale);
            }
        });
        
        // Smoothly scale the entire control center
        if (this.controlCenter.userData.originalScale) {
            const targetScale = this.controlCenter.userData.originalScale.clone().multiplyScalar(1 + (0.95 * this.hoverTransition));
            this.controlCenter.scale.lerp(targetScale, 0.2);
        }
    } else {
        // When transition is complete, ensure everything is reset to original values
        this.wireframes.forEach(wireframe => {
            if (wireframe.material && wireframe.userData.originalOpacity) {
                wireframe.material.opacity = wireframe.userData.originalOpacity;
                
                if (wireframe.userData.originalColor) {
                    wireframe.material.color.copy(wireframe.userData.originalColor);
                }
                
                if (wireframe.userData.originalScale) {
                    wireframe.scale.copy(wireframe.userData.originalScale);
                }
            }
            
            // Reset control points
            if (wireframe.userData && wireframe.userData.type === 'button' && wireframe.children[0]) {
                wireframe.children[0].scale.set(1, 1, 1);
            }
        });
        
        // Ensure control center returns to original scale
        if (this.controlCenter.userData.originalScale) {
            this.controlCenter.scale.copy(this.controlCenter.userData.originalScale);
        }
    }
    
    // Rotate each wireframe at different speeds and directions
    this.wireframes.forEach((wireframe, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        const speedMultiplier = 1 - (index * 0.2);
        
        wireframe.rotation.x += this.rotationSpeed * 0.3 * direction * speedMultiplier;
        wireframe.rotation.y += this.rotationSpeed * direction * speedMultiplier;
        wireframe.rotation.z += this.rotationSpeed * 0.5 * direction * speedMultiplier;
    });
    
    // Base rotation
    this.controlCenter.rotation.y += this.rotationSpeed * 0.2;
}
}

export { ControlCenter };