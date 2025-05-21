import * as THREE from 'three';

// ---------------
// GLOBAL VARIABLES
// ---------------
let shootingStars = [];
let shootingStarsGroup = null;
const maxShootingStars = 50; // Maximum number of shooting stars visible at once

// ---------------
// HELPER FUNCTIONS
// ---------------
function lightenColor(hex, amount) {
    const r = Math.min(255, ((hex >> 16) & 0xff) + 255 * amount);
    const g = Math.min(255, ((hex >> 8) & 0xff) + 255 * amount);
    const b = Math.min(255, (hex & 0xff) + 255 * amount);
    return (r << 16) | (g << 8) | b;
}

function darkenColor(hex, amount) {
    const r = Math.max(0, ((hex >> 16) & 0xff) - 255 * amount);
    const g = Math.max(0, ((hex >> 8) & 0xff) - 255 * amount);
    const b = Math.max(0, (hex & 0xff) - 255 * amount);
    return (r << 16) | (g << 8) | b;
}

// ---------------
// STAR FIELD
// ---------------
export function createStarField(scene) {
    const starCount = 10000;
    const starField = new THREE.Group();
    
    // Create star geometry and materials
    const smallStarGeometry = new THREE.BufferGeometry();
    const mediumStarGeometry = new THREE.BufferGeometry();
    const largeStarGeometry = new THREE.BufferGeometry();
    
    const smallStarPositions = [];
    const mediumStarPositions = [];
    const largeStarPositions = [];
    
    const smallStarMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.05,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
    });
    
    const mediumStarMaterial = new THREE.PointsMaterial({
        color: 0xeeeeff,
        size: 0.05,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true
    });
    
    const largeStarMaterial = new THREE.PointsMaterial({
        color: 0xddffff,
        size: 0.05,
        transparent: true,
        opacity: 1,
        sizeAttenuation: true
    });
    
    // Create stars at random positions
    for (let i = 0; i < starCount; i++) {
        const radius = 100 - 50 * Math.random(); // Far away with random offset
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        // Distribute stars by size
        const rand = Math.random();
        if (rand < 0.7) {
            smallStarPositions.push(x, y, z);
        } else if (rand < 0.95) {
            mediumStarPositions.push(x, y, z);
        } else {
            largeStarPositions.push(x, y, z);
        }
    }
    
    // Add positions to geometries
    smallStarGeometry.setAttribute('position', new THREE.Float32BufferAttribute(smallStarPositions, 3));
    mediumStarGeometry.setAttribute('position', new THREE.Float32BufferAttribute(mediumStarPositions, 3));
    largeStarGeometry.setAttribute('position', new THREE.Float32BufferAttribute(largeStarPositions, 3));
    
    // Create points systems
    const smallStars = new THREE.Points(smallStarGeometry, smallStarMaterial);
    const mediumStars = new THREE.Points(mediumStarGeometry, mediumStarMaterial);
    const largeStars = new THREE.Points(largeStarGeometry, largeStarMaterial);
    
    starField.add(smallStars, mediumStars, largeStars);
    scene.add(starField);
    
    return starField;
}

// ---------------
// PLANETS
// ---------------
export function createDistantPlanets(scene) {
    const planetGroup = new THREE.Group();
    
    // Create a few distant planets with different colors and sizes
    const planetData = [
        { 
            radius: 5, 
            distance: 570, 
            position: new THREE.Vector3(200, 150, -400),
            color: 0x3366ff, // Blue gas giant
            cloudColor: 0xaaccff,
            hasRings: true
        },
        { 
            radius: 3.5, 
            distance: 675, 
            position: new THREE.Vector3(-500, -100, -500),
            color: 0xffaa66, // Orange terrestrial
            cloudColor: 0xffffcc,
            hasRings: false
        },
        { 
            radius: 8, 
            distance: 790, 
            position: new THREE.Vector3(100, 30, -85),
            color: 0x8855aa, // Purple gas giant
            cloudColor: 0xddbbff,
            hasRings: true
        },
        { 
            radius: 4, 
            distance: 900, 
            position: new THREE.Vector3(-70, -200, -100),
            color: 0x55ff88, // Green terrestrial
            cloudColor: 0xccffbb,
            hasRings: false
        },
        { 
            radius: 6, 
            distance: 1020, 
            position: new THREE.Vector3(80, -500, -120),
            color: 0xff55aa, // Pink gas giant
            cloudColor: 0xffccdd,
            hasRings: true
        },
        { 
            radius: 2.5, 
            distance: 1150, 
            position: new THREE.Vector3(-90, 10, -740),
            color: 0xaaaa55, // Yellow terrestrial
            cloudColor: 0xffffbb,
            hasRings: false
        },
        { 
            radius: 7, 
            distance: 1300, 
            position: new THREE.Vector3(100, -15, -160),
            color: 0x55aaff, // Light blue gas giant
            cloudColor: 0xaaccff,
            hasRings: true
        }
    ];
    
    // Create each planet
    planetData.forEach(data => {
        // Planet sphere
        const planetGeometry = new THREE.SphereGeometry(data.radius, 32, 32);
        
        // Create texture procedurally
        const planetCanvas = document.createElement('canvas');
        planetCanvas.width = 512;
        planetCanvas.height = 512;
        const context = planetCanvas.getContext('2d');
        
        // Fill with base color
        context.fillStyle = `#${data.color.toString(16).padStart(6, '0')}`;
        context.fillRect(0, 0, 512, 512);
        
        // Add some random features
        for (let i = 0; i < 25; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = 10 + Math.random() * 30;
            const color = Math.random() < 0.5 ? 
                lightenColor(data.color, 0.2) : 
                darkenColor(data.color, 0.2);
            
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
            context.fill();
        }
        
        // Create texture
        const planetTexture = new THREE.CanvasTexture(planetCanvas);
        
        // Create material with slight glow
        const planetMaterial = new THREE.MeshStandardMaterial({
            map: planetTexture,
            emissive: data.color,
            emissiveIntensity: 0.1,
            roughness: 0.8,
        });
        
        const planet = new THREE.Mesh(planetGeometry, planetMaterial);
        planet.position.copy(data.position);
        
        // Add atmospheric glow
        const glowGeometry = new THREE.SphereGeometry(data.radius * 1.15, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: data.cloudColor,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        planet.add(glow);
        
        // Add rings if needed
        if (data.hasRings) {
            const ringGeometry = new THREE.RingGeometry(
                data.radius * 1.5, 
                data.radius * 2.2, 
                64
            );
            
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: lightenColor(data.color, 0.3),
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.4
            });
            
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = Math.PI / 2.5;
            planet.add(ring);
        }
        
        planetGroup.add(planet);
    });
    
    scene.add(planetGroup);
    return planetGroup;
}

// ---------------
// NEBULA
// ---------------
export function createNebula(scene) {
    // Create particle clouds for nebula effect
    const nebulaGroup = new THREE.Group();
    
    // Create several colorful particle clouds
    const nebulaColors = [
        0x3355ff, // Blue
        0xff5588, // Pink
        0x44aaff, // Light blue
        0x8866ff  // Purple
    ];
    
    nebulaColors.forEach((color, i) => {
        const particleCount = 3000;
        
        // Create nebula cloud in a specific region of space
        const centerX = (Math.random() - 0.5) * 150;
        const centerY = (Math.random() - 0.9) * 150;
        const centerZ = Math.random() * 150;
        
        // Create a group for this cloud
        const cloudGroup = new THREE.Group();
        cloudGroup.position.set(centerX, centerY, centerZ);
        
        // Material for the spheres with glow effect
        const sphereMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.2 + Math.random() * 0.1,
            blending: THREE.AdditiveBlending
        });
        
        // Create instanced mesh for better performance
        const sphereGeometry = new THREE.SphereGeometry(Math.random() * .5, 8, 6);
        const instancedMesh = new THREE.InstancedMesh(
            sphereGeometry, 
            sphereMaterial,
            particleCount
        );
        
        // Set up each sphere instance
        const dummy = new THREE.Object3D();
        for (let j = 0; j < particleCount; j++) {
            // Create cloud-like distribution
            const radius = 20 + Math.random() * 30;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            const x = radius * Math.sin(phi) * Math.cos(theta) * (0.3 + Math.random() * 0.7);
            const y = radius * Math.sin(phi) * Math.sin(theta) * (0.3 + Math.random() * 0.7);
            const z = radius * Math.cos(phi) * (0.3 + Math.random() * 0.7);
            
            // Position the sphere
            dummy.position.set(x, y, z);
            
            // Random scale for variety
            const scale = 0.5 + Math.random() * 1.5;
            dummy.scale.set(scale, scale, scale);
            
            // Apply the transform to this instance
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(j, dummy.matrix);
        }
        
        // Update instance matrix
        instancedMesh.instanceMatrix.needsUpdate = true;
        
        // Add to the cloud group
        cloudGroup.add(instancedMesh);
        
        // Create a subtle glow effect for the whole cloud
        const glowGeometry = new THREE.SphereGeometry(30, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.05,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        cloudGroup.add(glow);
        
        // Add the cloud group to the nebula
        nebulaGroup.add(cloudGroup);
    });
    
    scene.add(nebulaGroup);
    return nebulaGroup;
}

// ---------------
// SHOOTING STARS
// ---------------
function createShootingStar() {
    // Start position
    const startRadius = 100;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI / 3; // Keep near top of sky
    
    const startX = startRadius * Math.sin(phi) * Math.cos(theta);
    const startY = startRadius * Math.sin(phi) * Math.sin(theta);
    const startZ = startRadius * Math.cos(phi);
    
    // End position (trace path across sky)
    const endPhi = phi + Math.PI / 8; // Extended path
    const endX = startRadius * Math.sin(endPhi) * Math.cos(theta + Math.PI / 4);
    const endY = startRadius * Math.sin(endPhi) * Math.sin(theta + Math.PI / 4);
    const endZ = startRadius * Math.cos(endPhi);
    
    // Calculate direction vector for orientation
    const direction = new THREE.Vector3(
        endX - startX,
        endY - startY,
        endZ - startZ
    ).normalize();
    
    // Create main particle at head
    const particleGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1
    });
    
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    particle.position.set(startX, startY, startZ);
    
    // Create streak tail - using a tapered cylinder
    const streakLength = 3 + Math.random() * 5; // Random streak length
    const streakGeometry = new THREE.CylinderGeometry(0.02, 0.2, streakLength, 8, 1, true);
    
    // Create a gradient material for the streak
    const streakCanvas = document.createElement('canvas');
    streakCanvas.width = 128;
    streakCanvas.height = 16;
    const ctx = streakCanvas.getContext('2d');
    
    // Create a gradient from white to transparent
    const gradient = ctx.createLinearGradient(0, 0, 128, 0);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(220, 240, 255, 0.8)');
    gradient.addColorStop(0.7, 'rgba(180, 220, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(140, 180, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 16);
    
    const streakTexture = new THREE.CanvasTexture(streakCanvas);
    streakTexture.needsUpdate = true;
    
    const streakMaterial = new THREE.MeshBasicMaterial({
        map: streakTexture,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    
    const streak = new THREE.Mesh(streakGeometry, streakMaterial);
    
    // Position behind the head particle
    streak.position.copy(particle.position);
    streak.position.addScaledVector(direction, -streakLength/2);
    
    // Rotate to align with direction
    streak.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0), // Cylinder's default up
        direction.clone().negate() // Point back along path
    );
    
    // Create small glow around head particle
    const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xaaddff,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    particle.add(glow);
    
    // Add secondary particles for sparkle effect
    const sparkleGroup = new THREE.Group();
    const sparkleCount = 6 + Math.floor(Math.random() * 6);
    
    for (let i = 0; i < sparkleCount; i++) {
        const sparkleSize = 0.05 + Math.random() * 0.1;
        const sparkleGeometry = new THREE.SphereGeometry(sparkleSize, 4, 4);
        const sparkleMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(
                0.9 + Math.random() * 0.1,  // r
                0.9 + Math.random() * 0.1,  // g
                1.0                         // b (always max for blue tint)
            ),
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });
        
        const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
        
        // Position sparkles randomly within the streak
        const offset = Math.random() * streakLength * 0.8;
        sparkle.position.copy(particle.position);
        sparkle.position.addScaledVector(direction, -offset);
        
        // Add some random offset perpendicular to direction
        const perpendicular = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();
        perpendicular.crossVectors(perpendicular, direction).normalize();
        sparkle.position.addScaledVector(perpendicular, (Math.random() - 0.5) * 0.2);
        
        // Store original position for animation
        sparkle.userData = {
            offset: offset,
            perpendicular: perpendicular.clone(),
            perpendicularAmount: (Math.random() - 0.5) * 0.2,
            pulsateSpeed: 3 + Math.random() * 5,
            pulsatePhase: Math.random() * Math.PI * 2
        };
        
        sparkleGroup.add(sparkle);
    }
    
    // Group everything
    const shootingStar = new THREE.Group();
    shootingStar.add(particle);
    shootingStar.add(streak);
    shootingStar.add(sparkleGroup);
    
    // Add properties for animation
    shootingStar.userData = {
        startTime: Date.now(),
        duration: 1000 + Math.random() * 1000, // 1-2 seconds
        startPos: new THREE.Vector3(startX, startY, startZ),
        endPos: new THREE.Vector3(endX, endY, endZ),
        direction: direction,
        streakLength: streakLength,
        active: true,
        sparkles: sparkleGroup.children
    };
    
    shootingStarsGroup.add(shootingStar);
    shootingStars.push(shootingStar);
    
    return shootingStar;
}

export function createShootingStars(scene) {
    // Create a group to hold all shooting stars
    shootingStarsGroup = new THREE.Group();
    scene.add(shootingStarsGroup);
    
    // Initialize empty array
    shootingStars = [];
    
    // Create a few initial shooting stars
    for (let i = 0; i < 2; i++) {
        if (Math.random() < 0.3) { // Only 30% chance to start with a shooting star
            createShootingStar();
        }
    }
    
    return shootingStarsGroup;
}

export function updateShootingStars() {
    // Check if we need to create new shooting stars
    if (shootingStars.length < maxShootingStars && Math.random() < 0.005) {
        createShootingStar();
    }
    
    // Update existing shooting stars
    for (let i = shootingStars.length - 1; i >= 0; i--) {
        const star = shootingStars[i];
        const data = star.userData;
        
        if (!data.active) continue;
        
        const elapsed = Date.now() - data.startTime;
        const progress = Math.min(elapsed / data.duration, 1);
        
        if (progress < 1) {
            // Get components
            const particle = star.children[0]; // Main particle
            const streak = star.children[1]; // Streak tail
            const sparkles = data.sparkles; // Array of sparkle particles
            
            // Update particle position along the path
            particle.position.lerpVectors(data.startPos, data.endPos, progress);
            
            // Update streak position and size
            // Stretch the streak based on speed (faster at middle of path)
            const speedFactor = 1 + Math.sin(progress * Math.PI) * 2; // 1 at start/end, 3 at middle
            const currentStreakLength = data.streakLength * speedFactor;
            
            // Rescale the streak
            streak.scale.set(1, currentStreakLength / data.streakLength, 1);
            
            // Move the streak to follow the particle
            streak.position.copy(particle.position);
            streak.position.addScaledVector(data.direction, -currentStreakLength/2);
            
            // Update sparkles - they should follow the streak but with some random movement
            sparkles.forEach(sparkle => {
                const sparkleData = sparkle.userData;
                
                // Base position along the streak
                const offset = sparkleData.offset * speedFactor;
                sparkle.position.copy(particle.position);
                sparkle.position.addScaledVector(data.direction, -offset);
                
                // Add perpendicular wiggle that changes over time
                const wiggle = Math.sin(elapsed * 0.01 + sparkleData.pulsatePhase) * 0.07;
                sparkle.position.addScaledVector(
                    sparkleData.perpendicular, 
                    sparkleData.perpendicularAmount + wiggle
                );
                
                // Pulsate sparkle size and opacity
                const pulse = 0.5 + 0.5 * Math.sin(elapsed * 0.005 * sparkleData.pulsateSpeed + sparkleData.pulsatePhase);
                sparkle.scale.set(1 + pulse * 0.3, 1 + pulse * 0.3, 1 + pulse * 0.3);
                if (sparkle.material) {
                    sparkle.material.opacity = 0.4 + pulse * 0.6;
                }
            });
            
            // Fade out near the end
            if (progress > 0.7) {
                const fadeOutProgress = (progress - 0.7) / 0.3;
                
                // Fade out main particle and streak
                [particle, streak].forEach(obj => {
                    if (obj.material) {
                        obj.material.opacity = 1 - fadeOutProgress;
                    }
                });
                
                // Fade out sparkles more dramatically
                sparkles.forEach(sparkle => {
                    if (sparkle.material) {
                        sparkle.material.opacity *= (1 - fadeOutProgress * 1.5);
                    }
                });
                
                // Fade out the glow
                if (particle.children[0] && particle.children[0].material) {
                    particle.children[0].material.opacity = 0.4 * (1 - fadeOutProgress);
                }
            }
        } else {
            // Remove shooting star
            star.userData.active = false;
            shootingStarsGroup.remove(star);
            shootingStars.splice(i, 1);
            
            // Dispose geometries and materials to prevent memory leaks
            star.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
    }
}

// ---------------
// NEBULAS (FOR MULTIPLE NEBULA CLOUDS)
// ---------------
export function createNebulas(scene) {
    const nebulaGroup = new THREE.Group();
    
    // Create multiple nebulas at different positions
    const nebulaCount = 3 + Math.floor(Math.random() * 3); // 3-5 nebulas
    
    for (let i = 0; i < nebulaCount; i++) {
        const nebula = createNebula(scene);
        nebula.position.set(
            (Math.random() - 0.5) * 300,
            (Math.random() - 0.5) * 300,
            (Math.random() - 0.5) * 300
        );
        nebula.scale.set(
            0.5 + Math.random() * 1.5,
            0.5 + Math.random() * 1.5,
            0.5 + Math.random() * 1.5
        );
        nebulaGroup.add(nebula);
    }
    
    scene.add(nebulaGroup);
    return nebulaGroup;
}

// ---------------
// ANIMATION UPDATES
// ---------------
export function updateNebulas(nebulas, deltaTime) {
    if (!nebulas) return;
    
    // Gently rotate each nebula
    nebulas.children.forEach((nebula, i) => {
        nebula.rotation.y += 0.00005 * deltaTime * (1 + i * 0.2);
        nebula.rotation.x += 0.00003 * deltaTime * (1 + i * 0.1);
        nebula.rotation.z += 0.00002 * deltaTime * (1 + i * 0.15);
    });
}