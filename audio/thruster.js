// Gerador de som de propulsor usando Web Audio API
export class ThrusterSound {
  constructor() {
    this.audioContext = null;
    this.noiseNode = null;
    this.filterNode = null;
    this.gainNode = null;
    this.isPlaying = false;
  }

  init() {
    // Criar contexto de áudio apenas quando necessário (após interação do usuário)
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Criar nó de ganho para controlar o volume
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.15; // Volume baixo para não incomodar
    this.gainNode.connect(this.audioContext.destination);
    
    // Criar filtro para modelar o som do propulsor
    this.filterNode = this.audioContext.createBiquadFilter();
    this.filterNode.type = 'bandpass';
    this.filterNode.frequency.value = 1000;
    this.filterNode.Q.value = 1.0;
    this.filterNode.connect(this.gainNode);
  }

  play() {
    if (!this.audioContext) {
      this.init();
    }
    
    if (this.isPlaying) return;
    
    // Criar nó de ruído branco
    const bufferSize = 2 * this.audioContext.sampleRate;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    this.noiseNode = this.audioContext.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;
    this.noiseNode.connect(this.filterNode);
    this.noiseNode.start();
    
    this.isPlaying = true;
  }

  stop() {
    if (!this.isPlaying || !this.noiseNode) return;
    
    this.noiseNode.stop();
    this.noiseNode.disconnect();
    this.noiseNode = null;
    this.isPlaying = false;
  }
}

// Exportar uma instância única para ser usada no jogo
export const thrusterSound = new ThrusterSound();
