// Jogo de Pouso Lunar com Three.js - Versão 2D

// Variáveis globais
let scene, camera, renderer;
let lander, terrain;
let fuelTanks = [];
let gameActive = false;
let clock = new THREE.Clock();

// Estado do jogo
const gameState = {
    fuel: 100,
    velocity: { x: 0, y: 0 },
    altitude: 150,
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

// Constantes do jogo
const GRAVITY = 1.62;
const THRUST_POWER = 3.5;
const ROTATION_SPEED = 0.5; // Aumentado de 0.05 para 0.15 para giro mais rápido
const SAFE_LANDING_VELOCITY = 1.0;
const FUEL_CONSUMPTION_RATE = 0.5;

// Elementos da UI
let fuelBar, fuelPercentage, velocityDisplay, altitudeDisplay;
let gameOverElement, gameOverText, restartButton;
let instructionsElement, startButton;

// Inicialização
function init() {
    console.log("Inicializando o jogo...");
    
    // Obter elementos da UI
    fuelBar = document.getElementById('fuel-bar');
    fuelPercentage = document.getElementById('fuel-percentage');
    velocityDisplay = document.getElementById('velocity');
    altitudeDisplay = document.getElementById('altitude');
    gameOverElement = document.getElementById('game-over');
    gameOverText = document.getElementById('game-over-text');
    restartButton = document.getElementById('restart-button');
    instructionsElement = document.getElementById('instructions');
    startButton = document.getElementById('start-button');
    
    // Verificar se todos os elementos foram encontrados
    if (!startButton) {
        console.error("Botão de iniciar não encontrado!");
        return;
    }
    
    // Configuração da cena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // Configuração da câmera - Usando câmera ortográfica para visão 2D
    const aspectRatio = window.innerWidth / window.innerHeight;
    const viewSize = 200;
    camera = new THREE.OrthographicCamera(
        -aspectRatio * viewSize / 2, 
        aspectRatio * viewSize / 2, 
        viewSize / 2, 
        -viewSize / 2, 
        1, 
        1000
    );
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);
    
    // Configuração do renderizador
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);
    
    // Iluminação
    const ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
    directionalLight.position.set(0, 0, 100);
    scene.add(directionalLight);
    
    // Criar estrelas
    createStars();
    
    // Criar terreno
    createTerrain();
    
    // Criar cápsula
    createLander();
    
    // Criar tanques de combustível
    createFuelTanks(5);
    
    // Event listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    if (restartButton) {
        restartButton.addEventListener('click', restartGame);
    }
    
    if (startButton) {
        startButton.addEventListener('click', startGame);
        console.log("Event listener adicionado ao botão de iniciar");
    }
    
    // Iniciar o loop de animação
    animate();
}

// Criar estrelas
function createStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 1,
        sizeAttenuation: false
    });
    
    const starsVertices = [];
    for (let i = 0; i < 500; i++) {
        const x = (Math.random() - 0.5) * 500;
        const y = (Math.random() - 0.5) * 500;
        const z = 0; // Todas as estrelas no mesmo plano Z para visão 2D
        starsVertices.push(x, y, z);
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

// Criar terreno
function createTerrain() {
    // Criando um terreno 2D (uma linha)
    const terrainPoints = [];
    const terrainWidth = 500;
    const segments = 100;
    const segmentWidth = terrainWidth / segments;
    
    // Criar pontos para o terreno com algumas variações
    for (let i = 0; i <= segments; i++) {
        const x = (i * segmentWidth) - (terrainWidth / 2);
        let y = 0;
        
        // Adicionar algumas variações de altura, mas manter o centro plano para a área de pouso
        if (Math.abs(x) > 50) {
            y = (Math.random() * 10) - 5;
            
            // Adicionar algumas crateras
            if (Math.random() > 0.9) {
                y -= Math.random() * 5;
            }
        }
        
        terrainPoints.push(new THREE.Vector2(x, y));
    }
    
    const terrainShape = new THREE.Shape(terrainPoints);
    const terrainGeometry = new THREE.ShapeGeometry(terrainShape);
    const terrainMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        side: THREE.DoubleSide
    });
    
    terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    scene.add(terrain);
    
    // Área de pouso
    const landingPadGeometry = new THREE.PlaneGeometry(20, 1);
    const landingPadMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        emissive: 0x222222,
        side: THREE.DoubleSide
    });
    
    const landingPad = new THREE.Mesh(landingPadGeometry, landingPadMaterial);
    landingPad.position.y = 0.5;
    scene.add(landingPad);
}

// Criar cápsula lunar
function createLander() {
    // Grupo para a cápsula
    lander = new THREE.Group();
    lander.position.set(0, gameState.altitude, 0);
    
    // Corpo da cápsula (um triângulo para visão 2D)
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(0, 5);  // Topo
    bodyShape.lineTo(-5, -5); // Base esquerda
    bodyShape.lineTo(5, -5);  // Base direita
    bodyShape.lineTo(0, 5);   // Voltar ao topo
    
    const bodyGeometry = new THREE.ShapeGeometry(bodyShape);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xCCCCCC,
        side: THREE.DoubleSide
    });
    
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    lander.add(body);
    
    // Pernas de pouso
    const legMaterial = new THREE.LineBasicMaterial({ color: 0x888888 });
    
    // Perna esquerda
    const leftLegGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-3, -5, 0),
        new THREE.Vector3(-6, -8, 0)
    ]);
    const leftLeg = new THREE.Line(leftLegGeometry, legMaterial);
    lander.add(leftLeg);
    
    // Perna direita
    const rightLegGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(3, -5, 0),
        new THREE.Vector3(6, -8, 0)
    ]);
    const rightLeg = new THREE.Line(rightLegGeometry, legMaterial);
    lander.add(rightLeg);
    
    scene.add(lander);
}

// Criar tanques de combustível
function createFuelTanks(count) {
    const fuelTankGeometry = new THREE.CircleGeometry(3, 16);
    const fuelTankMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF0000,
        emissive: 0x330000
    });
    
    for (let i = 0; i < count; i++) {
        const fuelTank = new THREE.Mesh(fuelTankGeometry, fuelTankMaterial);
        
        // Posição aleatória
        const x = (Math.random() - 0.5) * 400;
        const y = 50 + Math.random() * 100;
        
        fuelTank.position.set(x, y, 0);
        
        scene.add(fuelTank);
        fuelTanks.push(fuelTank);
    }
}

// Criar efeito de propulsor
function createThrusterEffect() {
    if (!gameState.thrusterActive || gameState.fuel <= 0) return;
    
    // Criar um efeito simples de propulsor (triângulo)
    const thrusterShape = new THREE.Shape();
    thrusterShape.moveTo(0, -5);   // Topo do propulsor
    thrusterShape.lineTo(-2, -10); // Base esquerda
    thrusterShape.lineTo(2, -10);  // Base direita
    thrusterShape.lineTo(0, -5);   // Voltar ao topo
    
    const thrusterGeometry = new THREE.ShapeGeometry(thrusterShape);
    const thrusterMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFAA00,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    
    const thruster = new THREE.Mesh(thrusterGeometry, thrusterMaterial);
    
    // Aplicar rotação da cápsula ao propulsor
    thruster.rotation.z = lander.rotation.z;
    
    // Posicionar o propulsor abaixo da cápsula
    // Usando o negativo da posição X para inverter a direção do propulsor
    const position = new THREE.Vector3(0, -8, 0);
    position.applyAxisAngle(new THREE.Vector3(0, 0, 1), lander.rotation.z);
    thruster.position.x = lander.position.x - position.x;
    thruster.position.y = lander.position.y + position.y;
    
    scene.add(thruster);
    
    // Remover o efeito após um curto período
    setTimeout(() => {
        scene.remove(thruster);
    }, 100);
}

// Atualizar física
function updatePhysics(deltaTime) {
    if (!gameActive || gameState.gameOver) return;
    
    // Aplicar gravidade
    gameState.velocity.y -= GRAVITY * deltaTime;
    
    // Aplicar propulsores
    if (gameState.thrusterActive && gameState.fuel > 0) {
        // Direção do empuxo - Invertida em relação à rotação da nave
        // Usando o negativo do seno para inverter a direção horizontal
        const thrustX = -Math.sin(gameState.rotation) * THRUST_POWER;
        const thrustY = Math.cos(gameState.rotation) * THRUST_POWER;
        
        gameState.velocity.x += thrustX * deltaTime;
        gameState.velocity.y += thrustY * deltaTime;
        
        // Consumir combustível
        gameState.fuel -= FUEL_CONSUMPTION_RATE * deltaTime;
        if (gameState.fuel < 0) gameState.fuel = 0;
        
        // Atualizar barra de combustível
        updateFuelDisplay();
        
        // Criar efeito de propulsor
        createThrusterEffect();
    }
    
    // Aplicar rotação
    if (keys.ArrowLeft) {
        gameState.rotation -= ROTATION_SPEED * deltaTime;
    }
    if (keys.ArrowRight) {
        gameState.rotation += ROTATION_SPEED * deltaTime;
    }
    
    // Atualizar posição
    lander.position.x += gameState.velocity.x * deltaTime * 10;
    lander.position.y += gameState.velocity.y * deltaTime * 10;
    
    // Atualizar rotação
    lander.rotation.z = gameState.rotation;
    
    // Atualizar altitude
    gameState.altitude = lander.position.y;
    
    // Verificar colisão com o terreno
    if (lander.position.y <= 5) {
        checkLanding();
    }
    
    // Verificar colisão com tanques de combustível
    checkFuelTankCollisions();
    
    // Atualizar displays
    updateDisplays();
    
    // Manter a cápsula dentro dos limites da tela
    keepInBounds();
}

// Manter a cápsula dentro dos limites da tela
function keepInBounds() {
    const aspectRatio = window.innerWidth / window.innerHeight;
    const viewSize = 200;
    const horizontalBound = aspectRatio * viewSize / 2;
    
    // Verificar limites horizontais
    if (lander.position.x < -horizontalBound) {
        lander.position.x = -horizontalBound;
        gameState.velocity.x = 0;
    } else if (lander.position.x > horizontalBound) {
        lander.position.x = horizontalBound;
        gameState.velocity.x = 0;
    }
    
    // Verificar limite vertical superior
    if (lander.position.y > viewSize / 2) {
        lander.position.y = viewSize / 2;
        gameState.velocity.y = 0;
    }
}

// Verificar pouso
function checkLanding() {
    // Verificar se o pouso foi seguro
    const landingVelocity = Math.abs(gameState.velocity.y);
    const horizontalVelocity = Math.abs(gameState.velocity.x);
    const isInLandingZone = Math.abs(lander.position.x) < 10;
    const isLevel = Math.abs(gameState.rotation) < 0.3;
    
    if (landingVelocity <= SAFE_LANDING_VELOCITY && horizontalVelocity < 3 && isLevel && isInLandingZone) {
        // Pouso bem-sucedido
        gameState.landed = true;
        gameState.gameOver = true;
        lander.position.y = 5;
        gameState.velocity.x = 0;
        gameState.velocity.y = 0;
        
        showGameOver("POUSO BEM-SUCEDIDO!", true);
    } else {
        // Pouso mal-sucedido
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
        const distance = Math.sqrt(
            Math.pow(lander.position.x - fuelTank.position.x, 2) +
            Math.pow(lander.position.y - fuelTank.position.y, 2)
        );
        
        if (distance < 10) {
            // Coletar combustível
            gameState.fuel = Math.min(gameState.fuel + 25, 100);
            updateFuelDisplay();
            
            // Remover o tanque
            scene.remove(fuelTank);
            fuelTanks.splice(i, 1);
            
            // Criar novo tanque após um tempo
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
    
    // Remover tanques de combustível existentes
    for (const tank of fuelTanks) {
        scene.remove(tank);
    }
    fuelTanks = [];
    
    // Criar novos tanques
    createFuelTanks(5);
    
    // Resetar estado do jogo
    gameState.fuel = 100;
    gameState.velocity.x = 0;
    gameState.velocity.y = 0;
    gameState.altitude = 150;
    gameState.rotation = 0;
    gameState.thrusterActive = false;
    gameState.landed = false;
    gameState.gameOver = false;
    
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
    console.log("Jogo iniciado!");
    instructionsElement.style.display = 'none';
    gameActive = true;
}

// Redimensionar janela
function onWindowResize() {
    const aspectRatio = window.innerWidth / window.innerHeight;
    const viewSize = 200;
    
    camera.left = -aspectRatio * viewSize / 2;
    camera.right = aspectRatio * viewSize / 2;
    camera.top = viewSize / 2;
    camera.bottom = -viewSize / 2;
    
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
function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    
    // Atualizar física
    updatePhysics(Math.min(deltaTime, 0.1));
    
    // Renderizar cena
    renderer.render(scene, camera);
}

// Inicializar o jogo quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM carregado, inicializando o jogo");
    init();
});

// Log para depuração
console.log("Script de jogo carregado!");
