import * as THREE from 'three';
let raycasterForStars = new THREE.Raycaster();
let connectedStars = [];
let connectorLines = [];
let breakEffects = [];
const CURSOR_INTERACTION = {
    RADIUS: 15,              // Detection radius in world units
    MAX_CONNECTIONS: 6,    // Maximum number of stars that can connect
    LINE_COLOR: 0x66ccff,   // Color of connector lines
    LINE_WIDTH: 1,          // Width of connector lines
    SPRING_STRENGTH: 0.03,  // How strongly stars are pulled (0-1)
    SPRING_DAMPING: 0.9,    // Damping factor (lower = more bounce)
    BREAK_DISTANCE: .4,      // Distance at which connections break
    CONNECTION_SPEED: 0.02, // How quickly connections form (0-1)
    RETURN_SPEED: 0.02      // How quickly stars return to original position
};
export function setupStarInteraction(scene, starField) {
    // Create a group for all connector lines
    const lineGroup = new THREE.Group();
    scene.add(lineGroup);
    
    // Create vertices for stars
    if (starField) {
        starField.children.forEach(pointSystem => {
            // Store original positions for each star
            if (pointSystem.geometry && pointSystem.geometry.attributes.position) {
                const positions = pointSystem.geometry.attributes.position.array;
                const starCount = positions.length / 3;
                
                // Store original position as user data for each point system
                if (!pointSystem.userData.originalPositions) {
                    pointSystem.userData.originalPositions = new Float32Array(positions.length);
                    pointSystem.userData.originalPositions.set(positions);
                    
                    // Initialize velocities array for physics
                    pointSystem.userData.velocities = new Array(starCount).fill().map(() => new THREE.Vector3());
                    
                    // Create array to track which stars are connected
                    pointSystem.userData.isConnected = new Array(starCount).fill(false);
                    
                    // Create array to track connection strength (for animation)
                    pointSystem.userData.connectionStrength = new Array(starCount).fill(0);
                }
            }
        });
    }
    return lineGroup;
}


export function updateStarInteractions(starField, deltaTime, lineGroup, cursorWorldPosition) {
    // Clear any existing connector lines
    while (lineGroup.children.length > 0) {
        const line = lineGroup.children[0];
        lineGroup.remove(line);
        if (line.geometry) line.geometry.dispose();
        if (line.material) line.material.dispose();
    }
    
    // Reset connected stars count
    let connectedCount = 0;
    
    // Only process if starField exists
    if (!starField) return;
    
    // Ensure the world matrix is updated
    starField.updateMatrixWorld(true);
    
    // Create matrix world inverse once
    const starFieldMatrixWorldInverse = new THREE.Matrix4().copy(starField.matrixWorld).invert();
    
    starField.children.forEach(pointSystem => {
        if (!pointSystem.geometry || 
            !pointSystem.geometry.attributes.position || 
            !pointSystem.userData.originalPositions) {
            return;
        }
        
        const positions = pointSystem.geometry.attributes.position.array;
        const originalPositions = pointSystem.userData.originalPositions;
        const velocities = pointSystem.userData.velocities;
        const isConnected = pointSystem.userData.isConnected;
        const connectionStrength = pointSystem.userData.connectionStrength;
        const starCount = positions.length / 3;
        
        // Convert cursor position to star field's local space using the pre-calculated inverse
        const localCursorPosition = cursorWorldPosition.clone().applyMatrix4(starFieldMatrixWorldInverse);
        
        let needsUpdate = false;
        const connectorPoints = [];
        
        for (let i = 0; i < starCount; i++) {
            const i3 = i * 3;
            
            // Extract star position
            const starPosition = new THREE.Vector3(
                positions[i3], 
                positions[i3 + 1], 
                positions[i3 + 2]
            );
            
            // Extract original position
            const originalPosition = new THREE.Vector3(
                originalPositions[i3], 
                originalPositions[i3 + 1], 
                originalPositions[i3 + 2]
            );
            
            // Calculate distance to cursor
            const distanceToCursor = starPosition.distanceTo(localCursorPosition);
            
            // Check if star is within interaction radius
            if (distanceToCursor < CURSOR_INTERACTION.RADIUS && 
                connectedCount < CURSOR_INTERACTION.MAX_CONNECTIONS) {
                
                // Gradually increase connection strength
                connectionStrength[i] = Math.min(1, connectionStrength[i] + CURSOR_INTERACTION.CONNECTION_SPEED);
                
                if (!isConnected[i] && connectionStrength[i] > 0.5) {
                    isConnected[i] = true;
                    connectedCount++;
                }
                
                if (isConnected[i]) {
                    // Calculate spring force
                    const force = localCursorPosition.clone().sub(starPosition)
                        .multiplyScalar(CURSOR_INTERACTION.SPRING_STRENGTH * connectionStrength[i]);
                    
                    // Apply to velocity
                    velocities[i].add(force);
                    
                    // Prepare to draw connector line
                    if (connectionStrength[i] > 0.2) {
                        // Transform star position back to world space for line drawing
                        const worldStarPos = new THREE.Vector3(
                            positions[i3], 
                            positions[i3 + 1], 
                            positions[i3 + 2]
                        ).applyMatrix4(starField.matrixWorld);
                        
                        // Store points for line
                        connectorPoints.push({
                            star: worldStarPos,
                            strength: connectionStrength[i],
                            index: i
                        });
                    }
                    
                    // Check if connection should break
                    if (distanceToCursor > CURSOR_INTERACTION.BREAK_DISTANCE) {
                        isConnected[i] = false;
                    }
                }
            } else {
                // Star is out of range or max connections reached
                isConnected[i] = false;
                connectionStrength[i] = Math.max(0, connectionStrength[i] - CURSOR_INTERACTION.CONNECTION_SPEED);
                
                // Calculate return force to original position
                const returnForce = originalPosition.clone().sub(starPosition)
                    .multiplyScalar(CURSOR_INTERACTION.RETURN_SPEED);
                velocities[i].add(returnForce);
            }
            
            // Apply velocity with damping
            velocities[i].multiplyScalar(CURSOR_INTERACTION.SPRING_DAMPING);
            starPosition.add(velocities[i]);
            
            // Update position in buffer
            positions[i3] = starPosition.x;
            positions[i3 + 1] = starPosition.y;
            positions[i3 + 2] = starPosition.z;
            
            needsUpdate = true;
        }
        
        // Mark buffer for update if needed
        if (needsUpdate) {
            pointSystem.geometry.attributes.position.needsUpdate = true;
        }
        
        // Create connector lines
        connectorPoints.forEach(point => {
            if (point.strength > 0.2) {
                const lineMaterial = new THREE.LineBasicMaterial({
                    color: CURSOR_INTERACTION.LINE_COLOR,
                    transparent: true,
                    opacity: point.strength * 0.8,
                    linewidth: CURSOR_INTERACTION.LINE_WIDTH
                });
                
                const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                    cursorWorldPosition,
                    point.star
                ]);
                
                const line = new THREE.Line(lineGeometry, lineMaterial);
                lineGroup.add(line);
            }
        });
    });
    
    // Update any break effects
    updateBreakEffects();
}

// Function to create break effect particles
export function createBreakEffect(scene, position) {
    const particleCount = 8;
    const particles = new THREE.Group();
    
    for (let i = 0; i < particleCount; i++) {
        const size = 0.05 + Math.random() * 0.1;
        const geometry = new THREE.SphereGeometry(size, 4, 4);
        const material = new THREE.MeshBasicMaterial({
            color: CURSOR_INTERACTION.LINE_COLOR,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(position);
        
        // Random velocity
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2
        );
        
        particle.userData = {
            velocity: velocity,
            life: 1.0, // Life from 1.0 to 0.0
            decay: 0.02 + Math.random() * 0.03 // How quickly it fades
        };
        
        particles.add(particle);
    }
    
    scene.add(particles);
    breakEffects.push(particles);
    
    return particles;
}

// Function to update break effects
function updateBreakEffects() {
    for (let i = breakEffects.length - 1; i >= 0; i--) {
        const effect = breakEffects[i];
        let allDead = true;
        
        effect.children.forEach(particle => {
            // Update position
            particle.position.add(particle.userData.velocity);
            
            // Update life
            particle.userData.life -= particle.userData.decay;
            
            // Update opacity
            if (particle.material) {
                particle.material.opacity = particle.userData.life;
            }
            
            // Scale down as it fades
            const scale = 0.3 + particle.userData.life * 0.7;
            particle.scale.set(scale, scale, scale);
            
            if (particle.userData.life > 0) {
                allDead = false;
            }
        });
        
        if (allDead) {
            // Remove and clean up
            effect.parent.remove(effect);
            
            // Dispose geometries and materials
            effect.children.forEach(particle => {
                if (particle.geometry) particle.geometry.dispose();
                if (particle.material) particle.material.dispose();
            });
            
            breakEffects.splice(i, 1);
        }
    }
}