// Create scene, camera, and renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);  // Light gray background
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;  // For better color accuracy
document.body.appendChild(renderer.domElement);

// Add lights (reduced intensities)
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);  // Reduced from 1.0
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);  // Reduced from 1.5
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);
const pointLight = new THREE.PointLight(0xffffff, 0.6);  // Reduced from 1.2
pointLight.position.set(0, 0, 2);
scene.add(pointLight);
const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x8B4513, 0.3);  // Reduced from 0.6
scene.add(hemisphereLight);

// Environment map for reflections
let envTexture;
try {
    envTexture = new THREE.CubeTextureLoader().load([
        'https://threejs.org/examples/textures/cube/SwedishRoyalCastle/px.jpg',
        'https://threejs.org/examples/textures/cube/SwedishRoyalCastle/nx.jpg',
        'https://threejs.org/examples/textures/cube/SwedishRoyalCastle/py.jpg',
        'https://threejs.org/examples/textures/cube/SwedishRoyalCastle/ny.jpg',
        'https://threejs.org/examples/textures/cube/SwedishRoyalCastle/pz.jpg',
        'https://threejs.org/examples/textures/cube/SwedishRoyalCastle/nz.jpg'
    ]);
    scene.environment = envTexture;
} catch (e) {
    console.log('Env map failed to load, using null');
    scene.environment = null;
}

// Texture loader
const textureLoader = new THREE.TextureLoader();

// Load the GLB model (but don't add to scene yet)
const loader = new THREE.GLTFLoader();
let gltfScene;  // Store the loaded scene
let modelLoaded = false;  // Flag to check if model is loaded
let uploadedTextureL = null;  // Store the uploaded texture for L
let uploadedTextureD = null;  // Store the uploaded texture for D
let uploadedTextureHL = null;  // Store the uploaded texture for HL
let uploadedTextureF = null;  // Store the uploaded texture for F
loader.load(
    'Bathromm.glb',  // File name as specified
    function (gltf) {
        gltfScene = gltf.scene;
        gltfScene.position.set(0, 0, 0);
        gltfScene.scale.set(1, 1, 1);
        console.log('Model loaded successfully (not added to scene yet).');
        modelLoaded = true;
        // Prepare materials (but don't add to scene)
        gltfScene.traverse((child) => {
            if (child.isMesh) {
                console.log('Found mesh:', child.name);
                const meshNames = ['D001', 'D002', 'D003', 'D004', 'D005', 'D006', 'D007', 'D008',
                                   'L001', 'L002', 'L003', 'L004', 'L005', 'L006', 'L007', 'L008',
                                   'L009', 'L010', 'L011', 'L012', 'L013', 'L014', 'L015', 'L016',
                                   'L017', 'L018', 'L019', 'L020', 'L021', 'L022', 'L023', 'L024',
                                   'L025', 'L026', 'L027', 'L028', 'L029', 'L030', 'L031', 'L032',
                                   'F001', 'F002', 'F003', 'F004', 'F005', 'F006', 'F007', 'F008'];  // Updated to only F001-F008 for preparation
                if (meshNames.includes(child.name)) {
                    console.log('Preparing mesh for texturing:', child.name);
                    child.material = child.material.clone();
                    child.material.isCloned = true;
                    if (child.material.type !== 'MeshStandardMaterial') {
                        child.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
                    }
                    // Glass-like reflections for tiles (including flooring)
                    child.material.envMap = envTexture || null;
                    child.material.roughness = 0.1;  // Low roughness for high reflectivity (glass-like)
                    child.material.metalness = 0.0;  // Non-metallic for glass
                    child.material.emissive.set(0x000000);  // No emissive for realistic glass
                    console.log('Updated material for glass-like reflections on:', child.name);
                } else {
                    // Glass-like reflections for walls too
                    child.material = child.material.clone();
                    if (child.material.type === 'MeshStandardMaterial') {
                        child.material.envMap = envTexture || null;
                        child.material.roughness = 0.1;  // Glass-like for walls
                        child.material.metalness = 0.0;
                        child.material.emissive.set(0x000000);
                        child.material.color.set(0xffffff);  // White for glass feel
                    } else {
                        child.material = new THREE.MeshStandardMaterial({ color: 0xffffff, envMap: envTexture || null, roughness: 0.1, metalness: 0.0 });
                    }
                    console.log('Updated wall material for glass-like reflections on:', child.name);
                }
                child.material.needsUpdate = true;
            }
        });
    },
    function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
        console.error('Error loading GLB:', error);
    }
);

// Store uploaded image sources (for previews)
let uploadedImages = {};

// Enhanced upload handler (previews show in containers with drag/drop)
function handleFileUpload(input, preview, error, clearBtn, container, dragText) {
    input.addEventListener('change', (e) => {
        processFile(e.target.files[0], preview, error, clearBtn, container, dragText);
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        container.style.borderColor = '#8a2be2';
    });
    container.addEventListener('dragleave', (e) => {
        e.preventDefault();
        if (!container.classList.contains('has-image')) container.style.borderColor = '#ddd';
    });
    container.addEventListener('drop', (e) => {
        e.preventDefault();
        container.style.borderColor = '#ddd';
        const file = e.dataTransfer.files[0];
        if (file) {
            input.files = e.dataTransfer.files;
            processFile(file, preview, error, clearBtn, container, dragText);
        }
    });

    clearBtn.addEventListener('click', () => {
        input.value = '';
        preview.src = '';
        preview.style.display = 'none';
        dragText.style.display = 'block';
        error.style.display = 'none';
        container.classList.remove('has-image');
        clearBtn.style.display = 'none';
        // Remove from uploadedImages
        const category = container.dataset.category;
        delete uploadedImages[category];
        // Also clear the texture variable
        if (category === 'L') uploadedTextureL = null;
        else if (category === 'D') uploadedTextureD = null;
        else if (category === 'HL') uploadedTextureHL = null;
        else if (category === 'F') uploadedTextureF = null;
    });
}

function processFile(file, preview, error, clearBtn, container, dragText) {
    if (file) {
        if (file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.style.display = 'block';
                dragText.style.display = 'none';
                error.style.display = 'none';
                container.classList.add('has-image');
                clearBtn.style.display = 'inline-block';
                // Store image source
                const category = container.dataset.category;
                uploadedImages[category] = e.target.result;
                console.log(`Image uploaded for ${category}.`);
            };
            reader.readAsDataURL(file);
        } else {
            error.textContent = 'Invalid image (must be JPG/PNG, <=5MB).';
            error.style.display = 'block';
            preview.style.display = 'none';
            dragText.style.display = 'block';
            container.classList.remove('has-image');
            clearBtn.style.display = 'none';
        }
    }
}

// Attach handlers
const sections = [
    { input: document.getElementById('fileInputL'), preview: document.getElementById('previewL'), error: document.getElementById('errorL'), clear: document.getElementById('clearL'), container: document.querySelector('[data-category="L"]'), dragText: document.querySelector('[data-category="L"] .drag-text') },
    { input: document.getElementById('fileInputD'), preview: document.getElementById('previewD'), error: document.getElementById('errorD'), clear: document.getElementById('clearD'), container: document.querySelector('[data-category="D"]'), dragText: document.querySelector('[data-category="D"] .drag-text') },
    { input: document.getElementById('fileInputHL'), preview: document.getElementById('previewHL'), error: document.getElementById('errorHL'), clear: document.getElementById('clearHL'), container: document.querySelector('[data-category="HL"]'), dragText: document.querySelector('[data-category="HL"] .drag-text') },
    { input: document.getElementById('fileInputF'), preview: document.getElementById('previewF'), error: document.getElementById('errorF'), clear: document.getElementById('clearF'), container: document.querySelector('[data-category="F"]'), dragText: document.querySelector('[data-category="F"] .drag-text') }
];

sections.forEach(({ input, preview, error, clear, container, dragText }) => {
    handleFileUpload(input, preview, error, clear, container, dragText);
});

// Handle file inputs (for texture loading)
const fileInputL = document.getElementById('fileInputL');
fileInputL.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        console.log('File selected for L:', file.name);
        textureLoader.load(
            URL.createObjectURL(file),
            function(texture) {
                uploadedTextureL = texture;
                uploadedTextureL.rotation = Math.PI / 2;
                uploadedTextureL.flipY = false;
                uploadedTextureL.center.set(0.5, 0.5);
                uploadedTextureL.wrapS = THREE.RepeatWrapping;
                uploadedTextureL.wrapT = THREE.RepeatWrapping;
                uploadedTextureL.repeat.set(1, 1);
                console.log('Texture loaded for L, orientation corrected, and set to repeat');
            },
            undefined,
            function(error) {
                console.error('Error loading texture for L:', error);
            }
        );
    }
});

const fileInputD = document.getElementById('fileInputD');
fileInputD.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        console.log('File selected for D:', file.name);
        textureLoader.load(
            URL.createObjectURL(file),
            function(texture) {
                uploadedTextureD = texture;
                uploadedTextureD.rotation = Math.PI / 2;
                uploadedTextureD.flipY = false;
                uploadedTextureD.center.set(0.5, 0.5);
                uploadedTextureD.wrapS = THREE.RepeatWrapping;
                uploadedTextureD.wrapT = THREE.RepeatWrapping;
                uploadedTextureD.repeat.set(1, 1);
                console.log('Texture loaded for D, orientation corrected, and set to repeat');
            },
            undefined,
            function(error) {
                console.error('Error loading texture for D:', error);
            }
        );
    }
});

const fileInputHL = document.getElementById('fileInputHL');
fileInputHL.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        console.log('File selected for HL:', file.name);
        textureLoader.load(
            URL.createObjectURL(file),
            function(texture) {
                uploadedTextureHL = texture;
                uploadedTextureHL.rotation = Math.PI / 2;
                uploadedTextureHL.flipY = false;
                uploadedTextureHL.center.set(0.5, 0.5);
                uploadedTextureHL.wrapS = THREE.RepeatWrapping;
                uploadedTextureHL.wrapT = THREE.RepeatWrapping;
                uploadedTextureHL.repeat.set(1, 1);
                console.log('Texture loaded for HL, orientation corrected, and set to repeat');
            },
            undefined,
            function(error) {
                console.error('Error loading texture for HL:', error);
            }
        );
    }
});

const fileInputF = document.getElementById('fileInputF');
fileInputF.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        console.log('File selected for F:', file.name);
        textureLoader.load(
            URL.createObjectURL(file),
            function(texture) {
                uploadedTextureF = texture;
                uploadedTextureF.rotation = Math.PI / 2;
                uploadedTextureF.flipY = false;
                uploadedTextureF.center.set(0.5, 0.5);
                uploadedTextureF.wrapS = THREE.RepeatWrapping;
                uploadedTextureF.wrapT = THREE.RepeatWrapping;
                uploadedTextureF.repeat.set(1, 1);
                console.log('Texture loaded for F, orientation corrected, and set to repeat');
            },
            undefined,
            function(error) {
                console.error('Error loading texture for F:', error);
            }
        );
    }
});

// Handle generate button
const generateBtn = document.getElementById('generateBtn');
generateBtn.addEventListener('click', function() {
    if (modelLoaded) {
        // Add model to scene only now
        scene.add(gltfScene);
        console.log('Model added to scene.');
        // Apply textures to hardcoded meshes
        console.log('Applying textures to meshes...');
        let appliedCount = 0;
        gltfScene.traverse((child) => {
            if (child.isMesh) {
                // Hardcoded assignments (edit these lists as needed)
                const lMeshes = ['L001', 'L002', 'L003', 'L004', 'L005', 'L006', 'L007', 'L008',
                                 'L009', 'L010', 'L011', 'L012', 'L013', 'L014', 'L015', 'L016',
                                 'L017', 'L018', 'L019', 'L020', 'L021', 'L022', 'L023', 'L024',
                                 'L025', 'L026', 'L027', 'L028', 'L029', 'L030', 'L031', 'L032'];
                const dMeshes = ['D001', 'D002', 'D003', 'D004', 'D005', 'D006', 'D007', 'D008'];
                const hlMeshes = ['HL001', 'HL002', 'HL003', 'HL004', 'HL005', 'HL006', 'HL007', 'HL008',
                                  'HL009', 'HL010'];  // Placeholder - adjust if your model has different HL meshes
                const fMeshes = ['F001', 'F002', 'F003', 'F004', 'F005', 'F006', 'F007', 'F008'];  // Updated to only F001-F008 for F tile
                
                if (lMeshes.includes(child.name) && uploadedTextureL) {
                    child.material.map = uploadedTextureL;
                    child.material.needsUpdate = true;
                    appliedCount++;
                    console.log('L texture applied to:', child.name);
                } else if (dMeshes.includes(child.name) && uploadedTextureD) {
                    child.material.map = uploadedTextureD;
                    child.material.needsUpdate = true;
                    appliedCount++;
                    console.log('D texture applied to:', child.name);
                } else if (hlMeshes.includes(child.name) && uploadedTextureHL) {
                    child.material.map = uploadedTextureHL;
                    child.material.needsUpdate = true;
                    appliedCount++;
                    console.log('HL texture applied to:', child.name);
                } else if (fMeshes.includes(child.name) && uploadedTextureF) {
                    child.material.map = uploadedTextureF;
                    child.material.needsUpdate = true;
                    appliedCount++;
                    console.log('F texture applied to:', child.name);
                }
            }
        });
        console.log('Textures applied to', appliedCount, 'meshes');
        if (appliedCount === 0) {
            alert('No matching meshes found or no textures uploaded. Check mesh names in console.');
        } else {
            // Show the 3D canvas below the uploads
            const canvas = document.querySelector('canvas');
            canvas.style.display = 'block';
        }
    } else {
        alert('Please ensure the model is loaded.');
    }
});

// Position camera
camera.position.z = 5;

// Orbit controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});