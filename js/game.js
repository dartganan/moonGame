// Jogo de Pouso Lunar com Three.js
// Configuração inicial

// Elementos da UI
const fuelBar = document.getElementById('fuel-bar');
const fuelPercentage = document.getElementById('fuel-percentage');
const velocityDisplay = document.getElementById('velocity');
const altitudeDisplay = document.getElementById('altitude');
const gameOverElement = document.getElementById('game-over');
const gameOverText = document.getElementById('game-over-text');
const restartButton = document.getElementById('restart-button');
const instructionsElement = document.getElementById('instructions');
const startButton = document.getElementById('start-button');

// Configurações do jogo
const GRAVITY = 1.62; // Gravidade lunar (m/s²)
const THRUST_POWER = 3.5; // Força dos propulsores
const ROTATION_SPEED = 0.05; // Velocidade de rotação
const SAFE_LANDING_VELOCITY = 5.0; // Velocidade segura para pouso (m/s)
const FUEL_CONSUMPTION_RATE = 0.5; // Taxa de consumo de combustível
const INITIAL_ALTITUDE = 150; // Altitude inicial (m)
const INITIAL_FUEL = 100; // Combustível inicial (%)

// Estado do jogo
let scene, camera, renderer;
let lander, terrain, skybox;
let fuelTanks = [];
let particles = [];
let gameActive = false;
let gameState = {
    fuel: INITIAL_FUEL,
    velocity: { x: 0, y: 0 },
    altitude: INITIAL_ALTITUDE,
    rotation: 0,
    thrusterActive: false,
    landed: false,
    gameOver: false
};

// Controles
const keys = {
    ArrowUp: false,
    ArrowLeft: false,
    ArrowRight: false
};

// Inicialização
function init() {
    // Configuração da cena
    scene = new THREE.Scene();
    
    // Configuração da câmera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 50, 100);
    camera.lookAt(0, 0, 0);
    
    // Configuração do renderizador
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);
    
    // Iluminação
    const ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
    directionalLight.position.set(50, 200, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);
    
    // Criação do céu estrelado
    createSkybox();
    
    // Criação do terreno lunar
    createTerrain();
    
    // Criação da cápsula lunar
    createLander();
    
    // Criação de tanques de combustível
    createFuelTanks(5);
    
    // Event listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    restartButton.addEventListener('click', restartGame);
    startButton.addEventListener('click', startGame);
    
    // Iniciar o loop de animação
    animate();
}

// Criação do céu estrelado
function createSkybox() {
    const geometry = new THREE.SphereGeometry(500, 32, 32);
    const material = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.BackSide
    });
    skybox = new THREE.Mesh(geometry, material);
    scene.add(skybox);
    
    // Adicionar estrelas
    for (let i = 0; i < 1000; i++) {
        const star = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
        );
        
        // Posição aleatória na esfera
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI;
        const radius = 450 + Math.random() * 50;
        
        star.position.x = radius * Math.sin(theta) * Math.cos(phi);
        star.position.y = radius * Math.sin(theta) * Math.sin(phi);
        star.position.z = radius * Math.cos(theta);
        
        scene.add(star);
    }
}

// Criação do terreno lunar
function createTerrain() {
    // Geometria do terreno
    const geometry = new THREE.PlaneGeometry(500, 500, 50, 50);
    geometry.rotateX(-Math.PI / 2);
    
    // Adicionar variação de altura para criar crateras
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        // Não modificar o centro do terreno para ter uma área plana para pouso
        const x = vertices[i];
        const z = vertices[i + 2];
        const distanceFromCenter = Math.sqrt(x * x + z * z);
        
        if (distanceFromCenter > 20) {
            vertices[i + 1] = (Math.random() * 5) - 2.5;
            
            // Adicionar algumas crateras
            if (Math.random() > 0.99) {
                const craterSize = Math.random() * 5 + 2;
                vertices[i + 1] -= craterSize;
            }
        }
    }
    
    // Material do terreno
    const material = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 1.0,
        metalness: 0.2,
    });
    
    terrain = new THREE.Mesh(geometry, material);
    terrain.receiveShadow = true;
    scene.add(terrain);
    
    // Adicionar área de pouso
    const landingPadGeometry = new THREE.CircleGeometry(10, 32);
    landingPadGeometry.rotateX(-Math.PI / 2);
    const landingPadMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 0.8,
        metalness: 0.5,
        emissive: 0x222222
    });
    
    const landingPad = new THREE.Mesh(landingPadGeometry, landingPadMaterial);
    landingPad.position.y = 0.1;
    landingPad.receiveShadow = true;
    scene.add(landingPad);
}

// Criação da cápsula lunar
function createLander() {
    // Corpo principal da cápsula
    const bodyGeometry = new THREE.CapsuleGeometry(5, 8, 16, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xCCCCCC,
        roughness: 0.4,
        metalness: 0.8
    });
    
    lander = new THREE.Mesh(bodyGeometry, bodyMaterial);
    lander.castShadow = true;
    lander.position.y = gameState.altitude;
    scene.add(lander);
    
    // Pernas de pouso
    const legMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.5,
        metalness: 0.7
    });
    
    for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI / 2);
        
        const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 10, 8),
            legMaterial
        );
        
        leg.position.x = Math.cos(angle) * 5;
        leg.position.z = Math.sin(angle) * 5;
        leg.position.y = -5;
        leg.rotation.x = Math.PI / 4;
        leg.rotation.z = -angle;
        
        lander.add(leg);
        
        // Pés das pernas
        const foot = new THREE.Mesh(
            new THREE.SphereGeometry(1, 8, 8),
            legMaterial
        );
        
        foot.position.y = -5;
        leg.add(foot);
    }
    
    // Propulsores
    const thrusterGeometry = new THREE.ConeGeometry(2, 4, 16);
    const thrusterMaterial = new THREE.MeshStandardMaterial({
        color: 0x555555,
        roughness: 0.3,
        metalness: 0.9
    });
    
    const thruster = new THREE.Mesh(thrusterGeometry, thrusterMaterial);
    thruster.rotation.x = Math.PI;
    thruster.position.y = -6;
    lander.add(thruster);
}

// Criação de tanques de combustível
function createFuelTanks(count) {
    const geometry = new THREE.CylinderGeometry(2, 2, 5, 16);
    const material = new THREE.MeshStandardMaterial({
        color: 0xFF0000,
        roughness: 0.3,
        metalness: 0.7,
        emissive: 0x330000
    });
    
    for (let i = 0; i < count; i++) {
        const fuelTank = new THREE.Mesh(geometry, material);
        fuelTank.castShadow = true;
        
        // Posição aleatória no terreno
        const x = (Math.random() - 0.5) * 200;
        const z = (Math.random() - 0.5) * 200;
        const y = 5; // Altura acima do terreno
        
        fuelTank.position.set(x, y, z);
        fuelTank.rotation.x = Math.PI / 2;
        
        scene.add(fuelTank);
        fuelTanks.push(fuelTank);
    }
}

// Sistema de partículas para explosão
function createExplosion(position) {
    const particleCount = 100;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 8, 8),
            new THREE.MeshBasicMaterial({
                color: Math.random() > 0.5 ? 0xFF5500 : 0xFFAA00
            })
        );
        
        particle.position.copy(position);
        scene.add(particle);
        
        // Velocidade e direção aleatórias
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 3,
            Math.random() * 3,
            (Math.random() - 0.5) * 3
        );
        
        particle.lifetime = 2 + Math.random() * 2;
        particle.age = 0;
        
        particles.push(particle);
    }
}

// Sistema de partículas para propulsores
function createThrusterParticles() {
    if (!gameState.thrusterActive || gameState.fuel <= 0) return;
    
    // Posição do propulsor em coordenadas globais
    const thrusterPosition = new THREE.Vector3(0, -8, 0);
    lander.localToWorld(thrusterPosition);
    
    // Direção do propulsor (para baixo em relação à nave)
    const thrusterDirection = new THREE.Vector3(0, -1, 0);
    thrusterDirection.applyQuaternion(lander.quaternion);
    
    // Criar partículas
    for (let i = 0; i < 3; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 8, 8),
            new THREE.MeshBasicMaterial({
                color: Math.random() > 0.5 ? 0xFFAA00 : 0xFF5500,
                transparent: true,
                opacity: 0.8
            })
        );
        
        particle.position.copy(thrusterPosition);
        
        // Adicionar um pouco de aleatoriedade à direção
        const spreadX = (Math.random() - 0.5) * 0.5;
        const spreadZ = (Math.random() - 0.5) * 0.5;
        
        particle.velocity = new THREE.Vector3(
            thrusterDirection.x + spreadX,
            thrusterDirection.y,
            thrusterDirection.z + spreadZ
        ).multiplyScalar(2);
        
        particle.lifetime = 0.5 + Math.random() * 0.5;
        particle.age = 0;
        
        scene.add(particle);
        particles.push(particle);
    }
}

// Atualização das partículas
function updateParticles(deltaTime) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        // Atualizar idade
        particle.age += deltaTime;
        
        // Verificar se a partícula expirou
        if (particle.age >= particle.lifetime) {
            scene.remove(particle);
            particles.splice(i, 1);
            continue;
        }
        
        // Atualizar posição
        particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
        
        // Diminuir velocidade
        particle.velocity.multiplyScalar(0.95);
        
        // Atualizar opacidade para fade-out
        if (particle.material.opacity) {
            particle.material.opacity = 1 - (particle.age / particle.lifetime);
        }
        
        // Diminuir tamanho
        const scale = 1 - (particle.age / particle.lifetime) * 0.5;
        particle.scale.set(scale, scale, scale);
    }
}

// Atualização da física do jogo
function updatePhysics(deltaTime) {
    if (!gameActive || gameState.gameOver) return;
    
    // Aplicar gravidade
    gameState.velocity.y -= GRAVITY * deltaTime;
    
    // Aplicar propulsores
    if (gameState.thrusterActive && gameState.fuel > 0) {
        // Calcular direção do empuxo com base na rotação
        const thrustX = Math.sin(gameState.rotation) * THRUST_POWER;
        const thrustY = Math.cos(gameState.rotation) * THRUST_POWER;
        
        gameState.velocity.x += thrustX * deltaTime;
        gameState.velocity.y += thrustY * deltaTime;
        
        // Consumir combustível
        gameState.fuel -= FUEL_CONSUMPTION_RATE * deltaTime;
        if (gameState.fuel < 0) gameState.fuel = 0;
        
        // Atualizar barra de combustível
        updateFuelDisplay();
        
        // Criar partículas do propulsor
        createThrusterParticles();
    }
    
    // Aplicar rotação
    if (keys.ArrowLeft) {
        gameState.rotation -= ROTATION_SPEED * deltaTime;
    }
    if (keys.ArrowRight) {
        gameState.rotation += ROTATION_SPEED * deltaTime;
    }
    
    // Atualizar posição da cápsula
    lander.position.x += gameState.velocity.x * deltaTime * 10;
    lander.position.y += gameState.velocity.y * deltaTime * 10;
    
    // Atualizar rotação da cápsula
    lander.rotation.z = gameState.rotation;
    
    // Atualizar altitude
    gameState.altitude = lander.position.y;
    
    // Verificar colisão com o terreno
    if (lander.position.y <= 9) { // 9 é a altura das pernas + um pouco mais
        checkLanding();
    }
    
    // Verificar colisão com tanques de combustível
    checkFuelTankCollisions();
    
    // Atualizar displays
    updateDisplays();
    
    // Atualizar câmera para seguir a cápsula
    updateCamera();
}

// Verificar se o pouso foi bem-sucedido
function checkLanding() {
    // Verificar se a velocidade é segura para pouso
    const landingVelocity = Math.abs(gameState.velocity.y);
    const horizontalVelocity = Math.abs(gameState.velocity.x);
    
    // Verificar se está na área de pouso (centro do terreno)
    const isInLandingZone = Math.abs(lander.position.x) < 10 && Math.abs(lander.position.z) < 10;
    
    // Verificar se a cápsula está relativamente nivelada
    const isLevel = Math.abs(gameState.rotation) < 0.3;
    
    if (landingVelocity <= SAFE_LANDING_VELOCITY && horizontalVelocity < 3 && isLevel && isInLandingZone) {
        // Pouso bem-sucedido
        gameState.landed = true;
        gameState.gameOver = true;
        lander.position.y = 9; // Ajustar altura final
        gameState.velocity.x = 0;
        gameState.velocity.y = 0;
        
        showGameOver("POUSO BEM-SUCEDIDO!", true);
    } else {
        // Pouso mal-sucedido - explosão
        createExplosion(lander.position);
        scene.remove(lander);
        gameState.gameOver = true;
        
        let message = "NAVE DESTRUÍDA!";
        if (landingVelocity > SAFE_LANDING_VELOCITY) {
            message += " Velocidade muito alta.";
        }
        if (horizontalVelocity >= 3) {
            message += " Movimento horizontal excessivo.";
        }
        if (!isLevel) {
            message += " Nave não estava nivelada.";
        }
        if (!isInLandingZone) {
            message += " Fora da zona de pouso.";
        }
        
        showGameOver(message, false);
    }
}

// Verificar colisões com tanques de combustível
function checkFuelTankCollisions() {
    for (let i = fuelTanks.length - 1; i >= 0; i--) {
        const fuelTank = fuelTanks[i];
        
        // Calcular distância entre a cápsula e o tanque
        const distance = lander.position.distanceTo(fuelTank.position);
        
        if (distance < 10) { // Raio de colisão
            // Coletar combustível
            gameState.fuel = Math.min(gameState.fuel + 25, 100);
            updateFuelDisplay();
            
            // Remover o tanque
            scene.remove(fuelTank);
            fuelTanks.splice(i, 1);
            
            // Criar novo tanque em posição aleatória
            setTimeout(() => {
                if (gameActive && !gameState.gameOver) {
                    createFuelTanks(1);
                }
            }, 5000);
        }
    }
}

// Atualizar displays
function updateDisplays() {
    velocityDisplay.textContent = `Velocidade: ${Math.abs(gameState.velocity.y).toFixed(1)} m/s`;
    altitudeDisplay.textContent = `Altitude: ${gameState.altitude.toFixed(1)} m`;
}

// Atualizar display de combustível
function updateFuelDisplay() {
    fuelBar.style.width = `${gameState.fuel}%`;
    fuelPercentage.textContent = `${Math.floor(gameState.fuel)}%`;
    
    // Mudar cor com base no nível de combustível
    if (gameState.fuel > 50) {
        fuelBar.style.backgroundColor = '#0f0';
    } else if (gameState.fuel > 25) {
        fuelBar.style.backgroundColor = '#ff0';
    } else {
        fuelBar.style.backgroundColor = '#f00';
    }
}

// Atualizar câmera para seguir a cápsula
function updateCamera() {
    // Posição da câmera relativa à cápsula
    camera.position.x = lander.position.x * 0.5;
    camera.position.y = lander.position.y + 50;
    camera.position.z = 100;
    
    // Olhar para a cápsula
    camera.lookAt(lander.position);
}

// Mostrar tela de fim de jogo
function showGameOver(message, success) {
    gameOverText.textContent = message;
    gameOverElement.classList.remove('hidden');
    
    if (success) {
        gameOverText.style.color = '#4CAF50';
    } else {
        gameOverText.style.color = '#F44336';
    }
}

// Reiniciar o jogo
function restartGame() {
    // Limpar cena
    if (gameState.gameOver && !gameState.landed) {
        createLander();
    }
    
    // Remover partículas
    for (const particle of particles) {
        scene.remove(particle);
    }
    particles = [];
    
    // Remover tanques de combustível existentes
    for (const tank of fuelTanks) {
        scene.remove(tank);
    }
    fuelTanks = [];
    
    // Criar novos tanques
    createFuelTanks(5);
    
    // Resetar estado do jogo
    gameState = {
        fuel: INITIAL_FUEL,
        velocity: { x: 0, y: 0 },
        altitude: INITIAL_ALTITUDE,
        rotation: 0,
        thrusterActive: false,
        landed: false,
        gameOver: false
    };
    
    // Resetar posição da cápsula
    lander.position.set(0, gameState.altitude, 0);
    lander.rotation.z = 0;
    
    // Atualizar displays
    updateFuelDisplay();
    updateDisplays();
    
    // Esconder tela de fim de jogo
    gameOverElement.classList.add('hidden');
    
    // Ativar o jogo
    gameActive = true;
}

// Iniciar o jogo
function startGame() {
    console.log("Iniciando o jogo...");
    instructionsElement.style.display = 'none';
    gameActive = true;
}

// Redimensionar janela
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Gerenciar teclas pressionadas
function handleKeyDown(event) {
    if (keys.hasOwnProperty(event.code)) {
        keys[event.code] = true;
        
        if (event.code === 'ArrowUp') {
            gameState.thrusterActive = true;
        }
    }
}

// Gerenciar teclas soltas
function handleKeyUp(event) {
    if (keys.hasOwnProperty(event.code)) {
        keys[event.code] = false;
        
        if (event.code === 'ArrowUp') {
            gameState.thrusterActive = false;
        }
    }
}

// Loop de animação
let lastTime = 0;
function animate(time = 0) {
    const deltaTime = (time - lastTime) / 1000;
    lastTime = time;
    
    requestAnimationFrame(animate);
    
    // Atualizar física
    updatePhysics(Math.min(deltaTime, 0.1)); // Limitar delta para evitar problemas com FPS baixo
    
    // Atualizar partículas
    updateParticles(Math.min(deltaTime, 0.1));
    
    // Renderizar cena
    renderer.render(scene, camera);
}

// Adicionar um log para depuração
console.log("Script de jogo carregado!");

// Verificar se o botão de início existe
if (startButton) {
    console.log("Botão de início encontrado, adicionando event listener");
    startButton.addEventListener('click', function() {
        console.log("Botão de início clicado!");
        startGame();
    });
} else {
    console.error("Botão de início não encontrado!");
}

// Iniciar o jogo
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM carregado, inicializando o jogo");
    init();
});
