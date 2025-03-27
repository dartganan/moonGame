// vite.config.js
export default {
  // Configuração básica
  root: './', // Diretório raiz do projeto
  base: './', // Base path para deploy
  
  // Configurações do servidor de desenvolvimento
  server: {
    port: 3000, // Porta padrão
    open: true, // Abre o navegador automaticamente
    cors: true // Habilita CORS
  },
  
  // Configurações de build
  build: {
    outDir: 'dist', // Diretório de saída
    assetsDir: 'assets', // Diretório para assets
    emptyOutDir: true, // Limpa o diretório de saída antes do build
  }
}
