# 🔍 Visualizador de Sugestões de Código

Uma aplicação web moderna para revisar e validar sugestões de código de forma visual e intuitiva, similar ao GitHub.

## ✨ Funcionalidades

### 🔍 **Modo Revisão de Sugestões (JSON)**
- **Interface Intuitiva**: Design limpo e moderno inspirado no GitHub
- **Diff Visual**: Comparação lado a lado entre código existente e melhorado
- **Navegação Fácil**: Navegue entre sugestões com controles intuitivos
- **Sistema de Feedback**: Aprove ou rejeite sugestões com comentários
- **Sintax Highlighting**: Suporte para múltiplas linguagens de programação
- **Progresso Visual**: Acompanhe quantas sugestões já foram revisadas
- **Exportação**: Exporte os feedbacks em formato JSON

### 🥊 **Modo Comparação A/B (CSV)**
- **Comparação de Modelos**: Compare diferentes outputs/modelos lado a lado
- **Teste A/B Fluído**: Escolha o melhor modelo com sistema de votação
- **Ranking de Performance**: Veja qual modelo está performando melhor
- **Estatísticas Detalhadas**: Dashboard com métricas de comparação
- **Nível de Confiança**: Avalie sua certeza na escolha
- **Justificativa**: Adicione comentários explicando suas decisões
- **Exemplo Integrado**: Carregue dados de exemplo para testar

## 🚀 Como Usar

### 1. Instalação

```bash
npm install
npm run dev
```

### 2. Formatos dos Dados

#### 📋 **Formato JSON (Revisão de Sugestões)**
```json
[{
    "overallSummary": "Resumo geral das mudanças...",
    "codeSuggestions": [
        {
            "relevantFile": "src/exemplo.js",
            "language": "javascript",
            "suggestionContent": "Descrição da sugestão...",
            "existingCode": "código atual...",
            "improvedCode": "código melhorado...",
            "oneSentenceSummary": "Resumo em uma linha...",
            "relevantLinesStart": 10,
            "relevantLinesEnd": 20,
            "label": "refactoring"
        }
    ]
}]
```

#### 📊 **Formato CSV (Comparação A/B)**
```csv
id,inputs,reference_outputs,outputs
abc123,"{""filePath"": ""src/file.js"", ""language"": ""javascript""}","{""output"": ""suggestion A JSON"", ""label"": ""Modelo A""}","{""output"": ""suggestion B JSON"", ""label"": ""Modelo B""}"
```

**Colunas obrigatórias:**
- `id`: Identificador único da comparação
- `inputs`: JSON com dados de entrada (filePath, language, fileContent, etc.)
- `outputs`: JSON com a saída do modelo principal

**Colunas opcionais:**
- `reference_outputs`: JSON com saída de referência
- `alternative_output_X`: JSONs com saídas alternativas (para teste A/B/C)

Cada campo `output` deve conter um JSON estruturado com as sugestões.

### 3. Linguagens Suportadas

- JavaScript
- TypeScript
- Python
- JSON
- E mais...

## 🛠️ Tecnologias

- **Next.js 14** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **Prism.js** - Syntax highlighting
- **Lucide React** - Ícones

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── page.tsx          # Página principal
│   └── globals.css       # Estilos globais
├── components/
│   ├── CodeDiff.tsx      # Componente de diff
│   ├── SuggestionCard.tsx    # Card de sugestão
│   └── SuggestionNavigation.tsx  # Navegação
└── types/
    └── suggestion.ts     # Tipos TypeScript
```

## 🎯 Funcionalidades Detalhadas

### Navegação
- Primeira/Última sugestão
- Anterior/Próxima
- Barra de progresso
- Contador de sugestões revisadas

### Sistema de Feedback
- Botões de Aprovar/Rejeitar
- Comentários opcionais
- Estado visual das decisões
- Persistência durante a sessão

### Exportação
- JSON estruturado com estatísticas
- Timestamp das decisões
- Contadores de aprovação/rejeição
- Lista completa de feedbacks

## 🔧 Desenvolvimento

### Comandos Disponíveis

```bash
npm run dev      # Desenvolvimento
npm run build    # Build de produção
npm run start    # Executar build
npm run lint     # Linting
```

### Estrutura de Componentes

Cada componente é independente e reutilizável:

- `CodeDiff`: Exibe diferenças entre códigos
- `SuggestionCard`: Interface principal para cada sugestão
- `SuggestionNavigation`: Controles de navegação e progresso

## 📝 Exemplo de Uso

### 🔍 **Modo Revisão de Sugestões**
1. Selecione "Revisar Sugestões (JSON)" na tela inicial
2. Cole seu JSON ou use "Carregar exemplo"
3. Navegue pelas sugestões usando os controles
4. Avalie cada sugestão com 👍/👎
5. Adicione comentários quando necessário
6. Exporte os feedbacks ao final

### 🥊 **Modo Comparação A/B**
1. Selecione "Comparar Modelos A/B (CSV)" na tela inicial
2. Cole seu CSV ou use "Carregar exemplo"
3. Para cada comparação:
   - Analise as diferentes saídas lado a lado
   - Escolha o melhor modelo/sugestão
   - Defina seu nível de confiança (1-5)
   - Adicione justificativa (opcional)
4. Acompanhe as estatísticas em tempo real
5. Exporte os resultados completos

## 🎨 Personalização

O projeto usa Tailwind CSS, permitindo fácil customização:

- Cores e temas podem ser alterados em `tailwind.config.js`
- Estilos de código em `globals.css`
- Componentes modulares para extensão

## 📄 Licença

MIT License
