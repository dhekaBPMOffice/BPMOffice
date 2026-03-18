# Solução de problemas

## Erro "UNKNOWN: unknown error, read" ou "Cannot find module './XXXX.js'"

Estes erros costumam ocorrer no Windows quando o projeto está em **OneDrive** ou quando o **antivírus** bloqueia arquivos da pasta `.next` durante o desenvolvimento.

### Solução rápida

1. Parar o servidor (Ctrl+C)
2. Executar: `npm run dev:clean` (remove `.next` e recria)
3. Reiniciar o navegador

### Alternativa: Turbopack

Se o erro persistir, tentar o bundler Turbopack: `npm run dev:turbo`. Ele pode evitar conflitos de leitura de arquivos.

### Solução definitiva (Windows Defender)

1. Abrir **Segurança do Windows** → **Proteção contra vírus e ameaças**
2. Em **Configurações de proteção contra vírus e ameaças**, clicar em **Gerenciar configurações**
3. Rolar até **Exclusões** → **Adicionar ou remover exclusões**
4. Adicionar exclusão: **Processo** → informar o caminho do `node.exe` (ex.: `C:\Program Files\nodejs\node.exe`)

### Alternativa: OneDrive

Se o projeto estiver em OneDrive:

- Pausar temporariamente o OneDrive durante o desenvolvimento, ou
- Mover o projeto para uma pasta fora do OneDrive (ex.: `C:\dev\bpm-saas`)

### Outros antivírus

Se usar Bitdefender, Emsisoft ou similar: adicionar a pasta do projeto à lista de exclusões.
