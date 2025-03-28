export class LandingSound {
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
    
    // Criar oscilador para o som de sucesso
    const oscillator1 = this.audioContext.createOscillator();
    oscillator1.type = 'sine';
    oscillator1.frequency.setValueAtTime(440, this.audioContext.currentTime); // Lá
    oscillator1.frequency.setValueAtTime(523.25, this.audioContext.currentTime + 0.2); // Dó
    oscillator1.frequency.setValueAtTime(659.25, this.audioContext.currentTime + 0.4); // Mi
    
    // Segundo oscilador para harmonia
    const oscillator2 = this.audioContext.createOscillator();
    oscillator2.type = 'triangle';
    oscillator2.frequency.setValueAtTime(220, this.audioContext.currentTime); // Lá uma oitava abaixo
    oscillator2.frequency.setValueAtTime(261.63, this.audioContext.currentTime + 0.2); // Dó uma oitava abaixo
    oscillator2.frequency.setValueAtTime(329.63, this.audioContext.currentTime + 0.4); // Mi uma oitava abaixo
    
    // Ganho para controlar o volume e envelope
    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(0.01, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.5, this.audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1.0);
    
    // Conectar tudo
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Iniciar os sons
    oscillator1.start();
    oscillator2.start();
    
    // Parar após um tempo
    oscillator1.stop(this.audioContext.currentTime + 1.0);
    oscillator2.stop(this.audioContext.currentTime + 1.0);
    
    this.isPlaying = true;
    
    // Reset após terminar
    setTimeout(() => {
      this.isPlaying = false;
    }, 1000);
  }
}

// Exportar uma instância única para ser usada no jogo
export const landingSound = new LandingSound();
