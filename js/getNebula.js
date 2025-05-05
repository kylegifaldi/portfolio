import * as THREE from "three";

const loader = new THREE.TextureLoader();

function getSprite({ color, opacity, pos, size }) {
  const spriteMat = new THREE.SpriteMaterial({
    color,
    map: loader.load("../assets/img/rad-grad.png"),
    transparent: true,
    opacity,
  });
  spriteMat.color.offsetHSL(0, 0, Math.random() * 0.2 - 0.1);
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.set(pos.x, -pos.y, pos.z);
  size += Math.random() - 0.5;
  sprite.scale.set(size, size, size);
  sprite.material.rotation = 0;
  return sprite;
}

export function getNebula({
  hue = 0.0,
  numSprites = 20,
  opacity = .2,
  radius = 1,
  sat = 0.5,
  size = 1,
  x = 0,
  y = 0,
  z = 0,
}) {
  const layerGroup = new THREE.Group();
  for (let i = 0; i < numSprites; i += 1) {
    let angle = (i / numSprites) * Math.PI * 2;
    const pos = new THREE.Vector3(
      Math.cos(angle) * Math.random() * radius + x,
      Math.sin(angle) * Math.random() * radius + y,
      z + Math.random()
    );
    const length = new THREE.Vector3(pos.x, pos.y, 0).length();
    // const hue = 0.0; // (0.9 - (radius - length) / radius) * 1;

    let color = new THREE.Color().setHSL(hue, 1, sat);
    const sprite = getSprite({ color, opacity, pos, size });
    layerGroup.add(sprite);
  }
  return layerGroup;
}

const NEBULA = {
    COUNT: 20,                    // Number of nebulas to create
    SPRITES_PER_NEBULA: 20,       // Number of sprites per nebula
    OPACITY: {
        MIN: 0.1,
        MAX: 0.3
    },
    RADIUS: {
        MIN: 40,
        MAX: 80
    },
    SIZE: {
        MIN: 60,
        MAX: 100
    },
    DISTANCE: {
        MIN: 70,
        MAX: 200
    },
    POSITION_RANGE: {
        X: { MIN: -250, MAX: 250 },
        Y: { MIN: -100, MAX: 100 },
        Z: { MIN: -250, MAX: 250 }
    },
    EXCLUDED_RADIUS: 150          // Keep nebulas away from center (where control centers are)
};



export // Add this function to create multiple nebulas
function createNebulas(scene, count = NEBULA.COUNT) {
    const nebulas = [];
    
    for (let i = 0; i < count; i++) {
        // Generate random position
        let x, y, z;
        let distanceFromCenter;
        
        // Ensure nebulas aren't too close to the center (where control centers are)
        do {
            x = THREE.MathUtils.randFloat(NEBULA.POSITION_RANGE.X.MIN, NEBULA.POSITION_RANGE.X.MAX);
            y = THREE.MathUtils.randFloat(NEBULA.POSITION_RANGE.Y.MIN, NEBULA.POSITION_RANGE.Y.MAX);
            z = THREE.MathUtils.randFloat(NEBULA.POSITION_RANGE.Z.MIN, NEBULA.POSITION_RANGE.Z.MAX);
            
            // Calculate distance from center (0,0,0)
            distanceFromCenter = Math.sqrt(x*x + y*y + z*z);
        } while (distanceFromCenter < NEBULA.EXCLUDED_RADIUS);
        
        // Random nebula properties
        const hue = THREE.MathUtils.randFloat(0, 1);            // Random color
        const opacity = THREE.MathUtils.randFloat(NEBULA.OPACITY.MIN, NEBULA.OPACITY.MAX);
        const radius = THREE.MathUtils.randFloat(NEBULA.RADIUS.MIN, NEBULA.RADIUS.MAX);
        const size = THREE.MathUtils.randFloat(NEBULA.SIZE.MIN, NEBULA.SIZE.MAX);
        const numSprites = NEBULA.SPRITES_PER_NEBULA;
        
        // Create a nebula with these properties
        const nebula = getNebula({
            hue,
            numSprites,
            opacity,
            radius,
            size,
            x,
            y,
            z
        });
        
        // Apply a random rotation
        nebula.rotation.x = Math.random() * Math.PI * 2;
        nebula.rotation.y = Math.random() * Math.PI * 2;
        nebula.rotation.z = Math.random() * Math.PI * 2;
        
        // Add unique data for animation
        nebula.userData = {
            rotationSpeed: {
                x: (Math.random() - 0.5) * 0.0001,
                y: (Math.random() - 0.5) * 0.0001,
                z: (Math.random() - 0.5) * 0.0001
            },
            pulseSpeed: 0.0005 + Math.random() * 0.001,
            pulsePhase: Math.random() * Math.PI * 2,
            originalOpacity: opacity
        };
        
        // Add to scene and collection
        scene.add(nebula);
        nebulas.push(nebula);
    }
    
    return nebulas;
}

export function updateNebulas(nebulas, deltaTime) {
    nebulas.forEach(nebula => {
        // Rotate each nebula at its own speed
        nebula.rotation.x += nebula.userData.rotationSpeed.x * deltaTime;
        nebula.rotation.y += nebula.userData.rotationSpeed.y * deltaTime;
        nebula.rotation.z += nebula.userData.rotationSpeed.z * deltaTime;
        
        // Subtle opacity pulsing
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() * nebula.userData.pulseSpeed + nebula.userData.pulsePhase);
        
        // Apply pulse to children (nebula sprites)
        nebula.children.forEach(child => {
            if (child.material && child.material.opacity !== undefined) {
                child.material.opacity = nebula.userData.originalOpacity * (0.7 + 0.3 * pulse);
            }
        });
    });
}