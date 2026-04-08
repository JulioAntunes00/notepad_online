# RetroNote XP

Uma aplicação web de bloco de notas que emula a interface clássica do Windows XP, integrando funcionalidades de persistência em nuvem e gerenciamento avançado de janelas.

## Arquitetura e Tecnologias

O projeto foi construído utilizando uma stack moderna para garantir performance e escalabilidade, mantendo a fidelidade visual de sistemas legados.

- **Frontend**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) para um ambiente de desenvolvimento rápido e bundles otimizados.
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/) + [XP.css](https://botoxparty.github.io/XP.css/) para a base dos componentes clássicos.
- **Estado e Janelas**: Hook customizado `useWindowManager` para controle de z-index, minimização e restauração de janelas sem perda de estado do componente.
- **Persistência**: [Supabase](https://supabase.com/) (PostgreSQL & Auth) com políticas de Row Level Security (RLS) para proteção de dados por usuário.
- **Fallback**: Implementação de `localStorage` para usuários em modo visitante (Anônimo), com persistência local resiliente.

## Funcionalidades

- **Gerenciador de Janelas**: Sistema de janelas flutuantes com suporte a arraste, redimensionamento (em desenvolvimento), minimização e fechamento.
- **Menu Iniciar e Barra de Tarefas**: Navegação baseada em menu de contexto (botão direito) nas abas da barra de tarefas e botão iniciar funcional.
- **Sincronização em Tempo Real**: Notas são salvas automaticamente conforme a digitação, utilizando debounce para otimizar chamadas à API do Supabase.
- **Lixeira**: Sistema de retenção temporária para notas excluídas, permitindo recuperação rápida.

## Instalação e Configuração

### Requisitos
- Node.js (v18+)
- Conta no Supabase

### Passo a Passo

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure as variáveis de ambiente:
   Crie um arquivo `.env.local` na raiz do projeto:
   ```env
   VITE_SUPABASE_URL=sua_url_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anon_supabase
   ```

3. Configure o banco de dados (Supabase SQL):
   Certifique-se de ter uma tabela `retronote_notes` e `retronote_windows` com as permissões de RLS habilitadas.

4. Inicie o servidor:
   ```bash
   npm run dev
   ```

## Deploy

A aplicação está configurada para fácil deploy em plataformas como Vercel ou Netlify. Basta conectar o repositório e configurar as variáveis de ambiente equivalentes ao seu `.env.local`.

---

**Licença**: MIT  
**Desenvolvedor**: Julio / RetroNote Team

