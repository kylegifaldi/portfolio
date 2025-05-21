import * as THREE from 'three';

    

export async function createSun() {

    // load sun fragment shader
    const response = await fetch('./js/spaceelements/sun/SunFragmentShader.glsl');
    const sunFragmentShader = await response.text();

    // create sphere  base
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            progress : { value: 0 },
            resolution: { value: new THREE.Vector4() },
            texture1: { value: null }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vPosition; // Add this line to match the fragment shader
            
            void main() {
                vUv = uv;
                vPosition = position; // Add this line to pass position to fragment shader
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: sunFragmentShader,
        transparent: true,
        side: THREE.DoubleSide
    });
    const sun = new THREE.Mesh(geometry, material);
    sun.scale.set(10, 10, 10); // scale the sun to a larger size

    sun.update = function(time) {
        this.material.uniforms.time.value = time;
        this.material.uniforms.progress.value = time;
        this.material.uniforms.resolution.value.x = window.innerWidth;
        this.material.uniforms.resolution.value.y = window.innerHeight;
        this.material.uniforms.resolution.value.z = 1;
        this.material.uniforms.resolution.value.w = 1;
        this.material.uniforms.texture1.value = this.texture;
        this.material.needsUpdate = true;
        this.material.uniformsNeedUpdate = true;
    };

    // create a sphere slightly smaller than the sun to eminate the suns base light
    const lightGeometry = new THREE.SphereGeometry(.95, 100, 100);


    const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.5 }); // sun color
    const lightMesh = new THREE.Mesh(lightGeometry, lightMaterial);
    sun.add(lightMesh);

    return sun;
}