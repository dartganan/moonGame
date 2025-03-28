export class ExplosionSound {
  constructor() {
    this.audioContext = null;
    this.isPlaying = false;
  }

  init() {
    // Criar contexto de áudio apenas quando necessário
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  play() {
    if (!this.audioContext) {
      this.init();
    }
    
    if (this.isPlaying) return;
    
    // Criar oscilador para o som de explosão
    const oscillator1 = this.audioContext.createOscillator();
    oscillator1.type = 'sawtooth';
    oscillator1.frequency.setValueAtTime(110, this.audioContext.currentTime);
    oscillator1.frequency.exponentialRampToValueAtTime(55, this.audioContext.currentTime + 0.4);
    
    // Segundo oscilador para mais complexidade
    const oscillator2 = this.audioContext.createOscillator();
    oscillator2.type = 'square';
    oscillator2.frequency.setValueAtTime(60, this.audioContext.currentTime);
    oscillator2.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + 0.3);
    
    // Ruído para simular a explosão
    const bufferSize = this.audioContext.sampleRate / 2;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.audioContext.createBufferSource();
    noise.buffer = noiseBuffer;
    
    // Filtro para o ruído
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    filter.Q.value = 1.0;
    
    // Ganho para controlar o volume
    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(0.8, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1.5);
    
    // Conectar tudo
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Iniciar os sons
    oscillator1.start();
    oscillator2.start();
    noise.start();
    
    // Parar após um tempo
    oscillator1.stop(this.audioContext.currentTime + 1.5);
    oscillator2.stop(this.audioContext.currentTime + 1.5);
    noise.stop(this.audioContext.currentTime + 1.5);
    
    this.isPlaying = true;
    
    // Reset após terminar
    setTimeout(() => {
      this.isPlaying = false;
    }, 1500);
  }
}

// Exportar uma instância única para ser usada no jogo
export const explosionSound = new ExplosionSound();
