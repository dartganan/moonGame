// Jogo de Pouso Lunar com Three.js - Versão 2D
import * as THREE from 'three';
import { thrusterSound } from '../audio/thruster.js';
import { explosionSound } from '../audio/explosion.js';
import { landingSound } from '../audio/landing.js';

// Variáveis globais
let scene, camera, renderer;
let lander, terrain;
let fuelTanks = [];
let gameActive = false;
let clock = new THREE.Clock();
let landingPadPosition = 0; // Nova variável para armazenar a posição da base de pouso
let explosionParticles = []; // Array para armazenar partículas da explosão
let landingPad; // Referência à base de pouso
let landingPadMarkers = []; // Array para armazenar os marcadores da base de pouso

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
    // Obter o tamanho atual da tela para cálculos de visibilidade
    const aspectRatio = window.innerWidth / window.innerHeight;
    const viewSize = 200;
    const horizontalViewSize = aspectRatio * viewSize;
    const visibleWidth = horizontalViewSize * 0.9; // 90% da largura visível
    
    // Criando um terreno 2D (uma linha)
    const terrainPoints = [];
    const terrainWidth = 500;
    const segments = 100;
    const segmentWidth = terrainWidth / segments;
    
    // Gerar uma posição aleatória para a base de pouso dentro da área visível
    const minPosition = -visibleWidth / 2 + 20; // Margem de 20 unidades da borda esquerda
    const maxPosition = visibleWidth / 2 - 20;  // Margem de 20 unidades da borda direita
    landingPadPosition = Math.floor(Math.random() * (maxPosition - minPosition + 1)) + minPosition;
    
    console.log("Base de pouso posicionada em:", landingPadPosition);
    console.log("Área visível:", -visibleWidth/2, "a", visibleWidth/2);
    
    // Área plana ao redor da base de pouso (garantindo uma superfície plana)
    const flatAreaWidth = 30; // Largura da área plana
    
    // Primeiro, criamos um "chão" base
    const floorY = 0;
    
    // Criar pontos para o terreno com algumas variações
    for (let i = 0; i <= segments; i++) {
        const x = (i * segmentWidth) - (terrainWidth / 2);
        let y = floorY; // Começamos com o nível do chão
        
        // Calcular a distância até a base de pouso
        const distanceToLandingPad = Math.abs(x - landingPadPosition);
        
        // Área plana para a base de pouso
        if (distanceToLandingPad <= flatAreaWidth / 2) {
            // Manter perfeitamente plano no nível do chão
            y = floorY;
        } 
        // Transição suave entre a área plana e o terreno irregular
        else if (distanceToLandingPad <= flatAreaWidth) {
            // Criar uma transição suave usando uma função de interpolação
            const t = (distanceToLandingPad - flatAreaWidth / 2) / (flatAreaWidth / 2);
            // Altura aleatória SEMPRE POSITIVA
            const randomHeight = Math.random() * 5;
            y = floorY + randomHeight * t; // Adicionamos ao nível do chão
        }
        // Terreno irregular para o resto da superfície
        else {
            // Altura aleatória SEMPRE POSITIVA
            const baseHeight = Math.random() * 20;
            y = floorY + baseHeight; // Adicionamos ao nível do chão
            
            // Adicionar algumas crateras (pequenas depressões, mas nunca abaixo do chão)
            if (Math.random() > 0.9) {
                // Criar pequenas depressões, mas nunca abaixo do nível do chão
                const craterDepth = Math.random() * 3;
                y = Math.max(floorY, y - craterDepth);
            }
        }
        
        terrainPoints.push(new THREE.Vector2(x, y));
    }
    
    // Adicionar pontos extras abaixo do terreno para fechar a forma
    // Isso garante que o terreno seja renderizado como um objeto sólido
    terrainPoints.push(new THREE.Vector2(terrainWidth / 2, -5));
    terrainPoints.push(new THREE.Vector2(-terrainWidth / 2, -5));
    terrainPoints.push(new THREE.Vector2(-terrainWidth / 2, terrainPoints[0].y));
    
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
        color: 0xff0000,
        emissive: 0x330000,
        side: THREE.DoubleSide
    });
    
    landingPad = new THREE.Mesh(landingPadGeometry, landingPadMaterial);
    landingPad.position.set(landingPadPosition, 0.5, 0);
    scene.add(landingPad);
    
    // Adicionar marcadores visuais para indicar a base de pouso
    addLandingPadMarkers(landingPadPosition);
}

// Função para adicionar marcadores visuais para a base de pouso
function addLandingPadMarkers(position) {
    // Limpar marcadores anteriores
    landingPadMarkers = [];
    
    // Criar geometria para os marcadores
    const markerGeometry = new THREE.BoxGeometry(1, 2, 1);
    const markerMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0x333300
    });
    
    // Marcador esquerdo
    const leftMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    leftMarker.position.set(position - 10, 1, 0);
    scene.add(leftMarker);
    landingPadMarkers.push(leftMarker);
    
    // Marcador direito
    const rightMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    rightMarker.position.set(position + 10, 1, 0);
    scene.add(rightMarker);
    landingPadMarkers.push(rightMarker);
}

// Criar cápsula lunar
function createLander() {
    // Grupo para a cápsula
    lander = new THREE.Group();
    lander.position.set(0, gameState.altitude, 0);
    
    // Corpo principal da cápsula (mais arredondado e detalhado)
    const bodyShape = new THREE.Shape();
    
    // Parte superior arredondada
    bodyShape.moveTo(0, 6);  // Topo
    bodyShape.bezierCurveTo(
        -3, 5,   // Controle 1
        -6, 0,   // Controle 2
        -5, -4   // Ponto final
    );
    
    // Base da nave
    bodyShape.lineTo(5, -4);
    
    // Lado direito arredondado
    bodyShape.bezierCurveTo(
        6, 0,    // Controle 1
        3, 5,    // Controle 2
        0, 6     // Voltar ao topo
    );
    
    const bodyGeometry = new THREE.ShapeGeometry(bodyShape);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xDDDDDD,
        side: THREE.DoubleSide,
        metalness: 0.5,
        roughness: 0.3
    });
    
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    lander.add(body);
    
    // Janela/visor da cabine
    const windowShape = new THREE.Shape();
    windowShape.arc(0, 1, 2, 0, Math.PI * 2, false);
    
    const windowGeometry = new THREE.ShapeGeometry(windowShape);
    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x88CCFF,
        emissive: 0x113355,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    
    const window = new THREE.Mesh(windowGeometry, windowMaterial);
    lander.add(window);
    
    // Detalhes do corpo - Painéis laterais
    const leftPanelShape = new THREE.Shape();
    leftPanelShape.moveTo(-4, 0);
    leftPanelShape.lineTo(-5, -2);
    leftPanelShape.lineTo(-3, -2);
    leftPanelShape.lineTo(-2, 0);
    
    const leftPanelGeometry = new THREE.ShapeGeometry(leftPanelShape);
    const panelMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        side: THREE.DoubleSide
    });
    
    const leftPanel = new THREE.Mesh(leftPanelGeometry, panelMaterial);
    lander.add(leftPanel);
    
    // Painel direito (espelhado)
    const rightPanelShape = new THREE.Shape();
    rightPanelShape.moveTo(4, 0);
    rightPanelShape.lineTo(5, -2);
    rightPanelShape.lineTo(3, -2);
    rightPanelShape.lineTo(2, 0);
    
    const rightPanelGeometry = new THREE.ShapeGeometry(rightPanelShape);
    const rightPanel = new THREE.Mesh(rightPanelGeometry, panelMaterial);
    lander.add(rightPanel);
    
    // Antena no topo
    const antennaGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 6, 0),
        new THREE.Vector3(0, 8, 0)
    ]);
    const antennaMaterial = new THREE.LineBasicMaterial({ color: 0x888888 });
    const antenna = new THREE.Line(antennaGeometry, antennaMaterial);
    lander.add(antenna);
    
    // Ponta da antena
    const antennaTipGeometry = new THREE.CircleGeometry(0.3, 8);
    const antennaTipMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF0000,
        emissive: 0x330000
    });
    const antennaTip = new THREE.Mesh(antennaTipGeometry, antennaTipMaterial);
    antennaTip.position.set(0, 8, 0);
    lander.add(antennaTip);
    
    // Propulsor principal
    const thrusterShape = new THREE.Shape();
    thrusterShape.moveTo(-2, -4);
    thrusterShape.lineTo(2, -4);
    thrusterShape.lineTo(1.5, -5.5);
    thrusterShape.lineTo(-1.5, -5.5);
    thrusterShape.lineTo(-2, -4);
    
    const thrusterGeometry = new THREE.ShapeGeometry(thrusterShape);
    const thrusterMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        side: THREE.DoubleSide
    });
    
    const thruster = new THREE.Mesh(thrusterGeometry, thrusterMaterial);
    lander.add(thruster);
    
    // Pernas de pouso mais detalhadas
    const legMaterial = new THREE.LineBasicMaterial({ color: 0x888888, linewidth: 2 });
    
    // Perna esquerda com suporte
    const leftLegGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-3, -4, 0),  // Conexão com o corpo
        new THREE.Vector3(-6, -8, 0)   // Base da perna
    ]);
    const leftLeg = new THREE.Line(leftLegGeometry, legMaterial);
    lander.add(leftLeg);
    
    // Suporte diagonal para a perna esquerda
    const leftSupportGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-4.5, -2, 0),  // Conexão com o corpo mais acima
        new THREE.Vector3(-6, -8, 0)     // Base da perna
    ]);
    const leftSupport = new THREE.Line(leftSupportGeometry, legMaterial);
    lander.add(leftSupport);
    
    // Base da perna esquerda
    const leftFootGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-7, -8, 0),
        new THREE.Vector3(-5, -8, 0)
    ]);
    const leftFoot = new THREE.Line(leftFootGeometry, legMaterial);
    lander.add(leftFoot);
    
    // Perna direita com suporte
    const rightLegGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(3, -4, 0),   // Conexão com o corpo
        new THREE.Vector3(6, -8, 0)    // Base da perna
    ]);
    const rightLeg = new THREE.Line(rightLegGeometry, legMaterial);
    lander.add(rightLeg);
    
    // Suporte diagonal para a perna direita
    const rightSupportGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(4.5, -2, 0),  // Conexão com o corpo mais acima
        new THREE.Vector3(6, -8, 0)     // Base da perna
    ]);
    const rightSupport = new THREE.Line(rightSupportGeometry, legMaterial);
    lander.add(rightSupport);
    
    // Base da perna direita
    const rightFootGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(7, -8, 0),
        new THREE.Vector3(5, -8, 0)
    ]);
    const rightFoot = new THREE.Line(rightFootGeometry, legMaterial);
    lander.add(rightFoot);
    
    scene.add(lander);
}

// Criar tanques de combustível
function createFuelTanks(count) {
    for (let i = 0; i < count; i++) {
        // Grupo para o tanque de combustível
        const fuelTankGroup = new THREE.Group();
        
        // Corpo principal do tanque (cilindro)
        const tankBodyGeometry = new THREE.CylinderGeometry(2.5, 2.5, 5, 16);
        // Rotacionar o cilindro para ficar deitado
        tankBodyGeometry.rotateZ(Math.PI / 2);
        
        const tankBodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xDD3311,
            metalness: 0.7,
            roughness: 0.2,
            emissive: 0x330000,
            emissiveIntensity: 0.2
        });
        
        const tankBody = new THREE.Mesh(tankBodyGeometry, tankBodyMaterial);
        fuelTankGroup.add(tankBody);
        
        // Tampas laterais do tanque (círculos)
        const capGeometry = new THREE.CircleGeometry(2.5, 16);
        const capMaterial = new THREE.MeshStandardMaterial({
            color: 0xCCCCCC,
            metalness: 0.8,
            roughness: 0.1
        });
        
        // Tampa esquerda
        const leftCap = new THREE.Mesh(capGeometry, capMaterial);
        leftCap.position.set(-2.5, 0, 0);
        leftCap.rotation.y = Math.PI / 2;
        fuelTankGroup.add(leftCap);
        
        // Tampa direita
        const rightCap = new THREE.Mesh(capGeometry, capMaterial);
        rightCap.position.set(2.5, 0, 0);
        rightCap.rotation.y = -Math.PI / 2;
        fuelTankGroup.add(rightCap);
        
        // Detalhes - Faixas decorativas
        const stripeGeometry = new THREE.BoxGeometry(5.1, 0.5, 0.1);
        const stripeMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFCC00,
            emissive: 0x553300,
            emissiveIntensity: 0.3
        });
        
        // Faixa superior
        const topStripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        topStripe.position.set(0, 1.5, 0);
        fuelTankGroup.add(topStripe);
        
        // Faixa inferior
        const bottomStripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        bottomStripe.position.set(0, -1.5, 0);
        fuelTankGroup.add(bottomStripe);
        
        // Símbolo de combustível
        const symbolShape = new THREE.Shape();
        symbolShape.moveTo(-0.8, 1);
        symbolShape.lineTo(0.8, 1);
        symbolShape.lineTo(0.8, -1);
        symbolShape.lineTo(-0.8, -1);
        symbolShape.lineTo(-0.8, 1);
        
        // Recorte interno para criar o símbolo de gota
        const holeShape = new THREE.Shape();
        holeShape.moveTo(0, 0.6);
        holeShape.bezierCurveTo(0.4, 0.2, 0.4, -0.6, 0, -0.6);
        holeShape.bezierCurveTo(-0.4, -0.6, -0.4, 0.2, 0, 0.6);
        symbolShape.holes.push(holeShape);
        
        const symbolGeometry = new THREE.ShapeGeometry(symbolShape);
        const symbolMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            side: THREE.DoubleSide
        });
        
        const symbol = new THREE.Mesh(symbolGeometry, symbolMaterial);
        symbol.position.set(0, 0, 2.6);
        symbol.rotation.y = Math.PI / 2;
        fuelTankGroup.add(symbol);
        
        // Efeito de brilho (luz pontual)
        const light = new THREE.PointLight(0xFF5500, 0.5, 10);
        light.position.set(0, 0, 0);
        fuelTankGroup.add(light);
        
        // Posição aleatória para o tanque
        const x = (Math.random() - 0.5) * 400;
        const y = 50 + Math.random() * 100;
        
        fuelTankGroup.position.set(x, y, 0);
        
        // Adicionar rotação aleatória para variedade visual
        fuelTankGroup.rotation.z = Math.random() * Math.PI * 2;
        
        scene.add(fuelTankGroup);
        fuelTanks.push(fuelTankGroup);
    }
}

// Criar efeito de propulsor
function createThrusterEffect() {
    if (!gameState.thrusterActive || gameState.fuel <= 0) return;
    
    // Criar um efeito mais realista de propulsor (chama)
    const thrusterShape = new THREE.Shape();
    thrusterShape.moveTo(0, 0);      // Ponto de saída do propulsor
    thrusterShape.lineTo(-1.5, -4);  // Lado esquerdo da chama
    thrusterShape.lineTo(0, -6);     // Ponta da chama
    thrusterShape.lineTo(1.5, -4);   // Lado direito da chama
    thrusterShape.lineTo(0, 0);      // Voltar ao ponto de saída
    
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
    
    // Posicionar o propulsor exatamente na saída do propulsor da nave
    // Calculamos a posição com base na geometria do propulsor que definimos na função createLander
    const thrusterExitPoint = new THREE.Vector3(0, -5.5, 0);
    thrusterExitPoint.applyAxisAngle(new THREE.Vector3(0, 0, 1), lander.rotation.z);
    
    thruster.position.x = lander.position.x + thrusterExitPoint.x;
    thruster.position.y = lander.position.y + thrusterExitPoint.y;
    
    scene.add(thruster);
    
    // Remover o efeito após um curto período
    setTimeout(() => {
        scene.remove(thruster);
    }, 100);
}

// Verificar colisão com o terreno
function checkTerrainCollision() {
    if (!terrain || !lander || gameState.gameOver) return false;
    
    // Obter a posição da nave
    const landerX = lander.position.x;
    const landerY = lander.position.y;
    
    // Raio de colisão da nave (considerando o tamanho da nave)
    const landerRadius = 5;
    
    // Verificar se está na zona de pouso
    const distanceToLandingPad = Math.abs(landerX - landingPadPosition);
    const isInLandingZone = distanceToLandingPad < 10;
    
    // Se estiver na zona de pouso e próximo ao solo, verificar pouso normal
    if (isInLandingZone && landerY <= 5) {
        checkLanding();
        return true;
    } 
    // Se não estiver na zona de pouso, verificar colisão com o terreno
    else if (!isInLandingZone) {
        // Encontrar o ponto do terreno mais próximo da posição x da nave
        const terrainGeometry = terrain.geometry;
        const vertices = terrainGeometry.attributes.position.array;
        
        // Procurar o ponto do terreno mais próximo da posição x da nave
        let closestTerrainHeight = 0;
        let minDistance = Infinity;
        
        for (let i = 0; i < vertices.length; i += 3) {
            const vertexX = vertices[i];
            const vertexY = vertices[i + 1];
            
            const distance = Math.abs(vertexX - landerX);
            if (distance < minDistance) {
                minDistance = distance;
                closestTerrainHeight = vertexY;
            }
        }
        
        // Verificar colisão considerando também as pernas da nave
        // A parte inferior da nave está em landerY - landerRadius
        const naveBottom = landerY - landerRadius;
        
        // Adicionar uma margem de colisão para detectar assim que tocar
        const collisionMargin = 0.5;
        
        // Se qualquer parte da nave estiver tocando o terreno, ocorreu colisão
        if (naveBottom <= closestTerrainHeight + collisionMargin) {
            console.log("Colisão detectada! Altura do terreno:", closestTerrainHeight, "Parte inferior da nave:", naveBottom);
            createExplosion();
            return true;
        }
        
        // Verificar também se as laterais da nave estão colidindo com o terreno
        // Verificamos alguns pontos ao redor da nave para uma detecção mais precisa
        const checkPoints = [
            { x: landerX - landerRadius, y: landerY - landerRadius * 0.8 }, // Ponto inferior esquerdo
            { x: landerX + landerRadius, y: landerY - landerRadius * 0.8 }, // Ponto inferior direito
            { x: landerX - landerRadius * 0.5, y: landerY - landerRadius * 0.5 }, // Ponto meio-esquerdo
            { x: landerX + landerRadius * 0.5, y: landerY - landerRadius * 0.5 }  // Ponto meio-direito
        ];
        
        for (const point of checkPoints) {
            // Verificar se este ponto está na zona de pouso
            const pointDistanceToLandingPad = Math.abs(point.x - landingPadPosition);
            const pointIsInLandingZone = pointDistanceToLandingPad < 10;
            
            // Pular verificação se o ponto estiver na zona de pouso
            if (pointIsInLandingZone) continue;
            
            // Encontrar a altura do terreno neste ponto
            let terrainHeightAtPoint = 0;
            let minDist = Infinity;
            
            for (let i = 0; i < vertices.length; i += 3) {
                const vertexX = vertices[i];
                const vertexY = vertices[i + 1];
                
                const dist = Math.abs(vertexX - point.x);
                if (dist < minDist) {
                    minDist = dist;
                    terrainHeightAtPoint = vertexY;
                }
            }
            
            // Se este ponto da nave estiver tocando o terreno, ocorreu colisão
            if (point.y <= terrainHeightAtPoint + collisionMargin) {
                console.log("Colisão lateral detectada! Ponto:", point, "Altura do terreno:", terrainHeightAtPoint);
                createExplosion();
                return true;
            }
        }
    }
    
    return false;
}

// Criar efeito de explosão
function createExplosion() {
    // Parar o som do propulsor
    thrusterSound.stop();
    
    // Tocar som de explosão
    explosionSound.play();
    
    // Remover a nave
    scene.remove(lander);
    
    // Criar partículas de explosão
    const particleCount = 50;
    const explosionGeometry = new THREE.CircleGeometry(0.5, 8);
    
    // Cores para a explosão
    const colors = [0xffff00, 0xff6600, 0xff3300, 0xff0000];
    
    for (let i = 0; i < particleCount; i++) {
        const material = new THREE.MeshBasicMaterial({
            color: colors[Math.floor(Math.random() * colors.length)],
            transparent: true,
            opacity: 1.0
        });
        
        const particle = new THREE.Mesh(explosionGeometry, material);
        
        // Posicionar partícula na posição da nave
        particle.position.set(
            lander.position.x + (Math.random() * 10 - 5),
            lander.position.y + (Math.random() * 10 - 5),
            0
        );
        
        // Velocidade aleatória
        particle.userData = {
            velocity: {
                x: (Math.random() - 0.5) * 5,
                y: (Math.random() - 0.5) * 5
            },
            rotation: Math.random() * 0.2 - 0.1,
            opacity: 1.0,
            life: 2.0 // Tempo de vida em segundos
        };
        
        scene.add(particle);
        explosionParticles.push(particle);
    }
    
    // Mostrar mensagem de game over
    gameState.gameOver = true;
    showGameOver("NAVE DESTRUÍDA! Colisão com o terreno.", false);
}

// Atualizar partículas da explosão
function updateExplosion(deltaTime) {
    // Atualizar cada partícula
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        const particle = explosionParticles[i];
        const data = particle.userData;
        
        // Atualizar posição
        particle.position.x += data.velocity.x * deltaTime;
        particle.position.y += data.velocity.y * deltaTime;
        
        // Aplicar rotação
        particle.rotation.z += data.rotation;
        
        // Reduzir opacidade com o tempo
        data.life -= deltaTime;
        data.opacity = data.life / 2.0;
        particle.material.opacity = data.opacity;
        
        // Remover partículas que já desapareceram
        if (data.life <= 0) {
            scene.remove(particle);
            explosionParticles.splice(i, 1);
        }
    }
}

// Atualizar física
function updatePhysics(deltaTime) {
    if (!gameActive || gameState.gameOver) return;
    
    // Aplicar gravidade
    gameState.velocity.y -= GRAVITY * deltaTime;
    
    // Aplicar propulsão
    if (gameState.thrusterActive && gameState.fuel > 0) {
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
    checkTerrainCollision();
    
    // Verificar colisão com tanques de combustível
    checkFuelTankCollisions();
    
    // Atualizar displays
    updateDisplays();
    
    // Manter a cápsula dentro dos limites da tela
    keepInBounds();
}

// Manter a cápsula dentro dos limites da tela (com efeito wrap-around)
function keepInBounds() {
    const aspectRatio = window.innerWidth / window.innerHeight;
    const viewSize = 200;
    const horizontalBound = aspectRatio * viewSize / 2;
    
    // Implementar efeito wrap-around para limites horizontais
    if (lander.position.x < -horizontalBound) {
        lander.position.x = horizontalBound;
    } else if (lander.position.x > horizontalBound) {
        lander.position.x = -horizontalBound;
    }
    
    // Verificar limite vertical superior (sem wrap-around)
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
    const isInLandingZone = Math.abs(lander.position.x - landingPadPosition) < 10;
    const isLevel = Math.abs(gameState.rotation) < 0.3;
    
    if (landingVelocity <= SAFE_LANDING_VELOCITY && horizontalVelocity < 3 && isLevel && isInLandingZone) {
        // Pouso bem-sucedido
        gameState.landed = true;
        gameState.gameOver = true;
        lander.position.y = 5;
        gameState.velocity.x = 0;
        gameState.velocity.y = 0;
        
        // Tocar som de pouso bem-sucedido
        landingSound.play();
        
        showGameOver("POUSO BEM-SUCEDIDO!", true);
    } else {
        // Pouso mal-sucedido
        scene.remove(lander);
        gameState.gameOver = true;
        
        // Tocar som de explosão
        explosionSound.play();
        
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
        
        // Raio de colisão aumentado para o novo design do tanque
        if (distance < 12) {
            // Efeito visual de coleta
            createFuelCollectionEffect(fuelTank.position.x, fuelTank.position.y);
            
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

// Criar efeito visual de coleta de combustível
function createFuelCollectionEffect(x, y) {
    // Criar partículas para o efeito visual
    const particleCount = 20;
    const particleGeometry = new THREE.CircleGeometry(0.3, 8);
    
    // Cores para o efeito (amarelo e laranja)
    const colors = [0xFFCC00, 0xFF9900, 0xFFFF00];
    
    for (let i = 0; i < particleCount; i++) {
        const material = new THREE.MeshBasicMaterial({
            color: colors[Math.floor(Math.random() * colors.length)],
            transparent: true,
            opacity: 1.0
        });
        
        const particle = new THREE.Mesh(particleGeometry, material);
        
        // Posicionar partícula na posição do tanque
        particle.position.set(
            x + (Math.random() * 8 - 4),
            y + (Math.random() * 8 - 4),
            0
        );
        
        // Velocidade aleatória
        particle.userData = {
            velocity: {
                x: (Math.random() - 0.5) * 10,
                y: (Math.random() - 0.5) * 10
            },
            rotation: Math.random() * 0.2 - 0.1,
            opacity: 1.0,
            life: 1.0 // Tempo de vida em segundos
        };
        
        scene.add(particle);
        
        // Remover a partícula após um tempo
        setTimeout(() => {
            scene.remove(particle);
        }, 1000);
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
    
    // Parar som do propulsor quando o jogo termina
    thrusterSound.stop();
    
    if (success) {
        gameOverText.style.color = '#4CAF50';
    } else {
        gameOverText.style.color = '#F44336';
    }
}

// Reiniciar o jogo
function restartGame() {
    // Parar som do propulsor ao reiniciar
    thrusterSound.stop();
    
    // Limpar cena
    if (gameState.gameOver && !gameState.landed) {
        createLander();
    }
    
    // Remover tanques de combustível existentes
    for (const tank of fuelTanks) {
        scene.remove(tank);
    }
    fuelTanks = [];
    
    // Remover partículas de explosão existentes
    for (const particle of explosionParticles) {
        scene.remove(particle);
    }
    explosionParticles = [];
    
    // Remover o terreno existente
    if (terrain) {
        scene.remove(terrain);
    }
    
    // Remover a base de pouso existente
    if (landingPad) {
        scene.remove(landingPad);
    }
    
    // Remover os marcadores da base de pouso
    for (const marker of landingPadMarkers) {
        scene.remove(marker);
    }
    landingPadMarkers = [];
    
    // Criar novo terreno com nova posição para a base de pouso
    createTerrain();
    
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
            // Iniciar som do propulsor
            thrusterSound.play();
        }
    }
}

// Gerenciar teclas soltas
function handleKeyUp(event) {
    if (keys.hasOwnProperty(event.code)) {
        keys[event.code] = false;
        
        if (event.code === 'ArrowUp') {
            gameState.thrusterActive = false;
            // Parar som do propulsor
            thrusterSound.stop();
        }
    }
}

// Loop de animação
function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    
    // Atualizar física
    updatePhysics(Math.min(deltaTime, 0.1));
    
    // Atualizar partículas da explosão
    updateExplosion(Math.min(deltaTime, 0.1));
    
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
