import { useState, useCallback } from 'react';
import { ComparisonRow, SuggestionData } from '@/types/suggestion';

export function useCsvParser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseJsonSafely = (data: any): SuggestionData | undefined => {
    console.log('parseJsonSafely iniciado com dados:', typeof data, data && typeof data === 'object' ? 'objeto' : (typeof data === 'string' ? data.substring(0, 100) + '...' : String(data)));
    
    // Log adicional para objetos
    if (typeof data === 'object' && data !== null) {
      console.log('🔍 parseJsonSafely: Campos do objeto:', Object.keys(data));
      console.log('🔍 parseJsonSafely: Tem content?', 'content' in data);
      console.log('🔍 parseJsonSafely: Tem codeSuggestions?', 'codeSuggestions' in data);
      if (data.content) {
        console.log('🔍 parseJsonSafely: Tipo do content:', typeof data.content);
        console.log('🔍 parseJsonSafely: Content inclui ```json?', data.content.includes && data.content.includes('```json'));
      }
    }
    
    try {
      // Se já é um objeto válido com codeSuggestions, retornar diretamente
      if (typeof data === 'object' && data !== null && data.codeSuggestions) {
        console.log('✅ parseJsonSafely: dados já são um objeto válido com codeSuggestions');
        return data as SuggestionData;
      }

      // Se é um objeto com campo 'content' (estrutura de resposta de IA), extrair o content
      if (typeof data === 'object' && data !== null && data.content) {
        console.log('🔧 parseJsonSafely: objeto tem campo content, extraindo...');
        console.log('🔍 Tipo do campo content:', typeof data.content);
        console.log('🔍 Amostra do content:', typeof data.content === 'string' ? data.content.substring(0, 150) + '...' : data.content);
        
        // Se content é uma string que parece ter markdown, processar especialmente
        if (typeof data.content === 'string' && data.content.includes('```json')) {
          console.log('🎯 parseJsonSafely: content contém bloco markdown, processando...');
          
          // Extrair JSON do bloco markdown
          const jsonMatch = data.content.match(/```json\n([\s\S]*?)\n```/);
          if (jsonMatch) {
            const extractedJson = jsonMatch[1];
                         console.log('📋 parseJsonSafely: JSON extraído do content:', extractedJson.substring(0, 200) + '...');
             
             // Debug específico para as posições problemáticas
             if (extractedJson.length > 1623) {
               console.log('🔍 Debug posição 1576:', {
                 char: extractedJson.charAt(1575),
                 charCode: extractedJson.charCodeAt(1575),
                 context: extractedJson.substring(1570, 1580)
               });
               console.log('🔍 Debug posição 1623:', {
                 char: extractedJson.charAt(1622),
                 charCode: extractedJson.charCodeAt(1622),
                 context: extractedJson.substring(1618, 1628)
               });
             }
            
                         // Aplicar estratégias de limpeza no JSON extraído
             const cleaningStrategies = [
               {
                 name: 'Parse direto',
                 clean: (str: string) => str
               },
               {
                 name: 'Remove caracteres de controle',
                 clean: (str: string) => str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
               },
               {
                 name: 'Limpa template literals problemáticos',
                 clean: (str: string) => {
                   // Substitui template literals aninhados por strings simples
                   return str
                     .replace(/\$\{[^}]*\}/g, '"TEMPLATE_LITERAL"')
                     .replace(/`/g, '"');
                 }
               },
               {
                 name: 'Corrige barras invertidas + backticks específicas',
                 clean: (str: string) => {
                   return str
                     // Remove caracteres de controle primeiro
                     .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
                     // Corrige especificamente \\` (barra + backtick)
                     .replace(/\\`/g, '`')
                     // Corrige outras sequências problemáticas com backticks
                     .replace(/\\\\`/g, '`')
                     .replace(/\\\\\\\\/g, '\\\\')
                     // Normaliza template literals 
                     .replace(/`([^`]*)`/g, '"$1"')
                     // Substitui ${...} expressions
                     .replace(/\$\{[^}]*\}/g, 'EXPR')
                     // Normaliza aspas
                     .replace(/\\"/g, '"');
                 }
               },
               {
                 name: 'Normaliza escapes múltiplos',
                 clean: (str: string) => {
                   return str
                     // Remove caracteres de controle primeiro
                     .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
                     // Primeiro normaliza escapes excessivos
                     .replace(/\\\\\\\\/g, '\\\\') // Reduz \\\\ para \\
                     .replace(/\\\\"/g, '\\"')     // Reduz \\" para \"
                     // Depois aplica escape normal
                     .replace(/\\"/g, '"');
                 }
               },
               {
                 name: 'Sanitização agressiva para código complexo',
                 clean: (str: string) => {
                   return str
                     // Remove caracteres de controle
                     .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
                     // Substitui template literals por placeholders
                     .replace(/\$\{[^}]*\}/g, 'PLACEHOLDER')
                     .replace(/`([^`]*)`/g, '"$1"')
                     // Normaliza escapes
                     .replace(/\\\\\\\\/g, '\\\\')
                     .replace(/\\\\"/g, '\\"')
                     .replace(/\\"/g, '"')
                     .replace(/\\n/g, '\\n') // Mantém como escape literal
                     .replace(/\\r/g, '\\r')
                     .replace(/\\t/g, '\\t');
                 }
               },
               {
                 name: 'Escape completo - converte tudo para texto',
                 clean: (str: string) => {
                   return str
                     // Remove caracteres problemáticos primeiro
                     .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
                     // Converte quebras de linha para espaços
                     .replace(/\\n/g, ' ')
                     .replace(/\\r/g, ' ')
                     .replace(/\\t/g, ' ')
                     // Remove template literals
                     .replace(/\$\{[^}]*\}/g, ' ')
                     .replace(/`/g, '"')
                     // Normaliza escapes
                     .replace(/\\\\/g, '\\')
                     .replace(/\\"/g, '"')
                     // Remove espaços múltiplos
                     .replace(/\s+/g, ' ');
                 }
               },
               {
                 name: 'Parse com remoção total de caracteres problemáticos',
                 clean: (str: string) => {
                   return str
                     // Estratégia mais agressiva - remove tudo que pode causar problema
                     .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove todos os caracteres de controle
                     .replace(/\\u[0-9a-fA-F]{4}/g, '') // Remove unicode escapes
                     .replace(/\$\{[^}]*\}/g, 'TEMPLATE') // Substitui template literals
                     .replace(/`[^`]*`/g, '"STRING"') // Substitui template strings
                     .replace(/\\\\/g, '\\') // Normaliza barras
                     .replace(/\\"/g, '"') // Normaliza aspas
                     .replace(/\s+/g, ' ') // Normaliza espaços
                     .trim();
                 }
               },
               {
                 name: 'Remoção byte-por-byte de caracteres problemáticos',
                 clean: (str: string) => {
                   let cleaned = '';
                   for (let i = 0; i < str.length; i++) {
                     const char = str[i];
                     const code = str.charCodeAt(i);
                     
                     // Remove caracteres de controle específicos
                     if (code >= 32 && code <= 126) {
                       // ASCII printável
                       cleaned += char;
                     } else if (code === 10 || code === 13 || code === 9) {
                       // Quebra de linha, carriage return, tab - manter mas normalizar
                       cleaned += ' ';
                     } else if (code > 127) {
                       // Unicode válido - manter
                       cleaned += char;
                     }
                     // Ignora outros caracteres de controle
                   }
                   
                   // Normaliza escapes
                   return cleaned
                     .replace(/\s+/g, ' ')
                     .replace(/\\"/g, '"')
                     .replace(/\\\\/g, '\\')
                     .trim();
                 }
               },
                                {
                   name: 'Estratégia de recuperação parcial',
                   clean: (str: string) => {
                     // Se tudo falhar, pelo menos tenta extrair o que conseguir
                     try {
                       let result: any = {
                         overallSummary: "Erro ao processar conteúdo",
                         codeSuggestions: []
                       };
                       
                       // Tenta extrair overallSummary
                       const summaryMatch = str.match(/"overallSummary":\s*"([^"]+)"/);
                       if (summaryMatch) {
                         result.overallSummary = summaryMatch[1];
                       }
                       
                       // Tenta extrair codeSuggestions de forma mais robusta
                       try {
                         // Procura por padrões de codeSuggestions mesmo que não seja JSON perfeito
                         const suggestionsPattern = /"codeSuggestions":\s*\[\s*({[\s\S]*?})\s*\]/;
                         const suggestionsMatch = str.match(suggestionsPattern);
                         
                         if (suggestionsMatch) {
                           // Tenta limpar e parsear a primeira sugestão
                           let suggestionStr = suggestionsMatch[1];
                           
                           // Limpeza básica
                           suggestionStr = suggestionStr
                             .replace(/\\`/g, '`')
                             .replace(/\\"/g, '"')
                             .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
                           
                           try {
                             const suggestion = JSON.parse(suggestionStr);
                             result.codeSuggestions = [suggestion];
                           } catch (parseError) {
                             // Se não conseguir parsear, pelo menos extrai campos básicos
                             const fileMatch = suggestionStr.match(/"relevantFile":\s*"([^"]+)"/);
                             const contentMatch = suggestionStr.match(/"suggestionContent":\s*"([^"]+)"/);
                             const summaryMatch = suggestionStr.match(/"oneSentenceSummary":\s*"([^"]+)"/);
                             
                             if (fileMatch || contentMatch) {
                               result.codeSuggestions = [{
                                 relevantFile: fileMatch ? fileMatch[1] : "unknown",
                                 suggestionContent: contentMatch ? contentMatch[1].substring(0, 200) + "..." : "Conteúdo não extraível",
                                 oneSentenceSummary: summaryMatch ? summaryMatch[1] : "Resumo não disponível",
                                 label: "extracted_partial"
                               }];
                             }
                           }
                         }
                       } catch (e) {
                         // Continua com codeSuggestions vazio
                       }
                       
                       return JSON.stringify(result);
                     } catch (e) {
                       // Se mesmo isso falhar, retorna estrutura mínima
                       return JSON.stringify({
                         overallSummary: "Erro ao processar conteúdo",
                         codeSuggestions: []
                       });
                     }
                   }
                 }
             ];
            
            for (const strategy of cleaningStrategies) {
              try {
                const cleanedJson = strategy.clean(extractedJson);
                const result = JSON.parse(cleanedJson);
                console.log(`✅ parseJsonSafely: estratégia "${strategy.name}" funcionou para content markdown`);
                if (result && result.codeSuggestions) {
                  console.log(`🎯 parseJsonSafely: encontrado ${result.codeSuggestions.length} codeSuggestions no content`);
                }
                return result;
              } catch (e) {
                console.log(`❌ parseJsonSafely: estratégia "${strategy.name}" falhou para content:`, (e as Error).message.substring(0, 100));
              }
            }
            
            console.warn('⚠️ parseJsonSafely: todas as estratégias falharam para content markdown');
          }
        }
        
        // Recursivamente processar o content (caso não seja markdown)
        return parseJsonSafely(data.content);
      }

      // Se é um objeto mas não tem codeSuggestions nem content, tentar JSON.stringify e re-parse
      if (typeof data === 'object' && data !== null) {
        console.log('🔄 parseJsonSafely: objeto sem content/codeSuggestions, tentando stringify...');
        try {
          const stringified = JSON.stringify(data);
          console.log('🔧 parseJsonSafely: objeto stringificado, tentando re-parse...');
          return parseJsonSafely(stringified);
        } catch (stringifyError) {
          console.log('❌ parseJsonSafely: falha ao stringificar objeto');
          return undefined;
        }
      }

      // Se não é string, converter para string
      if (typeof data !== 'string') {
        console.log('🔄 parseJsonSafely: convertendo para string (tipo:', typeof data, ')');
        data = String(data);
      }

      const jsonString = data as string;
      
      // Estratégias de limpeza e parsing
      const cleaningStrategies = [
        {
          name: 'Parse direto',
          clean: (str: string) => str.trim()
        },
        {
          name: 'Remove escapes de quebra de linha',
          clean: (str: string) => str.trim().replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
        },
        {
          name: 'Remove escape duplo',
          clean: (str: string) => str.trim().replace(/\\"/g, '"')
        },
        {
          name: 'Combinado: escapes de quebra + aspas',
          clean: (str: string) => str.trim().replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\"/g, '"')
        },
        {
          name: 'Remove todos os escapes',
          clean: (str: string) => str.trim()
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r') 
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
        }
      ];

      for (const strategy of cleaningStrategies) {
        try {
          const cleanedString = strategy.clean(jsonString);
          const parsed = JSON.parse(cleanedString);
          console.log(`✅ parseJsonSafely: "${strategy.name}" funcionou`);
          
          // Verificar se tem codeSuggestions
          if (parsed && parsed.codeSuggestions) {
            console.log(`🎯 parseJsonSafely: encontrado codeSuggestions com ${parsed.codeSuggestions.length} itens`);
            return parsed as SuggestionData;
          } else {
            console.log(`⚠️ parseJsonSafely: JSON parseado mas sem codeSuggestions:`, Object.keys(parsed || {}));
          }
          
          return parsed;
        } catch (e) {
          console.log(`❌ parseJsonSafely: "${strategy.name}" falhou:`, (e as Error).message.substring(0, 50));
        }
      }
      
      // Se tem blocos de código markdown
      if (jsonString.includes('```json')) {
        const jsonMatch = jsonString.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          console.log('JSON extraído de bloco markdown');
          let extractedJson = jsonMatch[1];
          console.log('🔍 JSON extraído (primeiros 200 chars):', extractedJson.substring(0, 200));
          
          // Aplicar limpeza de escapes no JSON extraído
          try {
            // Tentar parse direto primeiro
            return JSON.parse(extractedJson);
          } catch (directError) {
            console.log('❌ Parse direto do JSON extraído falhou, tentando limpeza de escapes...');
            
                         // Aplicar as mesmas estratégias de limpeza
             const cleaningStrategies = [
               {
                 name: 'Remove escapes de quebra de linha',
                 clean: (str: string) => str.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
               },
               {
                 name: 'Remove escape duplo de aspas',
                 clean: (str: string) => str.replace(/\\"/g, '"')
               },
               {
                 name: 'Remove caracteres de controle problemáticos',
                 clean: (str: string) => {
                   // Remove caracteres de controle ASCII (0-31, exceto tab, newline, carriage return que são válidos)
                   return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
                 }
               },
               {
                 name: 'Sanitiza escapes problemáticos',
                 clean: (str: string) => str
                   // Corrige sequências de escape problemáticas
                   .replace(/\\(?!["\\/bfnrt])/g, '\\\\') // Adiciona escape para barras não seguidas por chars válidos
                   .replace(/\\\\\\\\/g, '\\\\') // Corrige escape excessivo de barras
                   .replace(/\\n/g, '\n')
                   .replace(/\\r/g, '\r')
                   .replace(/\\t/g, '\t')
                   .replace(/\\"/g, '"')
               },
               {
                 name: 'Limpeza completa de escapes',
                 clean: (str: string) => str
                   .replace(/\\n/g, '\n')
                   .replace(/\\r/g, '\r')
                   .replace(/\\t/g, '\t')
                   .replace(/\\"/g, '"')
                   .replace(/\\\\/g, '\\')
                   .replace(/\\'/g, "'")
               },
               {
                 name: 'Remove caracteres não-printáveis e sanitiza',
                 clean: (str: string) => {
                   // Remove caracteres não-printáveis e faz sanitização agressiva
                   return str
                     // Remove caracteres de controle exceto \n, \r, \t
                     .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
                     // Corrige escapes problemáticos
                     .replace(/\\(?!["\\/bfnrt])/g, '')
                     // Normaliza quebras de linha
                     .replace(/\\n/g, ' ')
                     .replace(/\\r/g, ' ')
                     .replace(/\\t/g, ' ')
                     // Corrige aspas
                     .replace(/\\"/g, '"')
                     // Remove escapes excessivos
                     .replace(/\\\\/g, '\\');
                 }
               }
             ];
            
            for (const strategy of cleaningStrategies) {
              try {
                const cleanedJson = strategy.clean(extractedJson);
                const result = JSON.parse(cleanedJson);
                console.log(`✅ Estratégia "${strategy.name}" funcionou para JSON de markdown`);
                return result;
              } catch (e) {
                console.log(`❌ Estratégia "${strategy.name}" falhou para JSON de markdown:`, (e as Error).message.substring(0, 100));
              }
            }
            
            console.warn(`⚠️ Todas as estratégias falharam para JSON de markdown: ${(directError as Error).message}`);
            console.warn('🔄 Retornando undefined para continuar processamento');
            return undefined;
          }
        }
      }
      
      // Se a string parece estar em um objeto com campo "content"
      if (jsonString.includes('"content":')) {
        try {
          const containerParsed = JSON.parse(jsonString);
          if (containerParsed.content) {
            console.log('JSON extraído de campo content');
            return JSON.parse(containerParsed.content);
          }
        } catch (e) {
          console.log('Tentativa de extrair content falhou');
        }
      }
      
      console.log('Falha no parse, retornando undefined');
      return undefined;
    } catch (e) {
      console.warn('⚠️ Erro capturado no parseJsonSafely:', (e as Error).message);
      console.warn('🔄 Retornando undefined para permitir continuidade do processamento');
      return undefined;
    }
  };

  // Função melhorada para debug de JSON
  const debugJsonParsing = (data: any, context: string): any => {
    const dataType = typeof data;
    console.log(`🔍 DEBUG JSON (${context}):`, {
      tipo: dataType,
      ehString: typeof data === 'string',
      ehObjeto: typeof data === 'object',
      ehArray: Array.isArray(data),
      valorNulo: data === null,
      valorUndefined: data === undefined
    });

    // Se já é um objeto válido, retornar diretamente
    if (typeof data === 'object' && data !== null) {
      console.log(`✅ ${context} já é um objeto válido, retornando diretamente`);
      return data;
    }

    // Se não é string, converter para string primeiro
    if (typeof data !== 'string') {
      console.log(`🔄 ${context} não é string (tipo: ${dataType}), convertendo...`);
      data = String(data);
    }

    const jsonString = data as string;
    
    console.log(`📊 Análise da string (${context}):`, {
      tamanho: jsonString.length,
      primeiros50: jsonString.substring(0, 50),
      ultimos50: jsonString.length > 50 ? jsonString.substring(jsonString.length - 50) : jsonString,
      temAspasEscape: jsonString.includes('\\"'),
      temQuebraLinha: jsonString.includes('\n'),
      primeiroChar: jsonString.charAt(0),
      ultimoChar: jsonString.charAt(jsonString.length - 1)
    });

    // Detectar problemas comuns antes de tentar parsing
    const problemasDetectados = [];
    
    if (!jsonString.trim()) {
      problemasDetectados.push('String vazia ou apenas espaços');
    }
    
    if (jsonString.includes('\\n') && !jsonString.includes('\n')) {
      problemasDetectados.push('Contém \\\\n escapado que pode precisar ser convertido');
    }
    
    if (jsonString.includes('\\"') && jsonString.split('\\"').length > 10) {
      problemasDetectados.push('Muitas aspas escapadas - pode ser JSON duplamente escapado');
    }
    
    if (jsonString.startsWith('"') && jsonString.endsWith('"') && jsonString.includes('{"')) {
      problemasDetectados.push('Parece ser JSON stringificado dentro de aspas');
    }
    
    if (problemasDetectados.length > 0) {
      console.log(`⚠️ Problemas detectados em ${context}:`, problemasDetectados);
    }

    // Tentar diferentes estratégias de parsing
    const strategies = [
      {
        name: 'Parse direto',
        exec: () => JSON.parse(jsonString)
      },
      {
        name: 'Trim e parse',
        exec: () => JSON.parse(jsonString.trim())
      },
      {
        name: 'Remove aspas externas de JSON stringificado',
        exec: () => {
          let cleaned = jsonString.trim();
          if (cleaned.startsWith('"') && cleaned.endsWith('"') && cleaned.includes('{"')) {
            cleaned = cleaned.slice(1, -1); // remove aspas externas
            cleaned = cleaned.replace(/\\"/g, '"'); // desescapa aspas internas
          }
          return JSON.parse(cleaned);
        }
      },
      {
        name: 'Remove escapes de quebra de linha',
        exec: () => JSON.parse(jsonString.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t'))
      },
      {
        name: 'Remove escape duplo de aspas',
        exec: () => JSON.parse(jsonString.replace(/\\"/g, '"'))
      },
      {
        name: 'Remove todos os escapes básicos',
        exec: () => JSON.parse(jsonString.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\"/g, '"'))
      },
      {
        name: 'Remove escape de barra invertida',
        exec: () => JSON.parse(jsonString.replace(/\\\\/g, '\\'))
      },
      {
        name: 'Limpeza completa de escapes',
        exec: () => JSON.parse(jsonString
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
          .replace(/\\'/g, "'"))
      },
      {
        name: 'Remove quebras de linha literais',
        exec: () => JSON.parse(jsonString.replace(/\n/g, '').replace(/\r/g, ''))
      },
      {
        name: 'Decode URI + escapes',
        exec: () => {
          try {
            let decoded = decodeURIComponent(jsonString);
            decoded = decoded.replace(/\\n/g, '\n').replace(/\\"/g, '"');
            return JSON.parse(decoded);
          } catch {
            return JSON.parse(jsonString.replace(/\\n/g, '\n').replace(/\\"/g, '"'));
          }
        }
      },
      {
        name: 'Parse após unescape HTML',
        exec: () => {
          const unescaped = jsonString
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'")
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"');
          return JSON.parse(unescaped);
        }
      },
      {
        name: 'Remove caracteres de controle problemáticos',
        exec: () => {
          // Remove caracteres de controle ASCII problemáticos
          const cleaned = jsonString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
          return JSON.parse(cleaned);
        }
      },
      {
        name: 'Limpa template literals problemáticos',
        exec: () => {
          const cleaned = jsonString
            // Substitui template literals aninhados por strings simples
            .replace(/\$\{[^}]*\}/g, '"TEMPLATE_LITERAL"')
            .replace(/`/g, '"')
            // Remove caracteres de controle
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
          return JSON.parse(cleaned);
        }
      },
      {
        name: 'Normaliza escapes múltiplos',
        exec: () => {
          const cleaned = jsonString
            // Remove caracteres de controle primeiro
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            // Primeiro normaliza escapes excessivos
            .replace(/\\\\\\\\/g, '\\\\') // Reduz \\\\ para \\
            .replace(/\\\\"/g, '\\"')     // Reduz \\" para \"
            // Depois aplica escape normal
            .replace(/\\"/g, '"');
          return JSON.parse(cleaned);
        }
      },
      {
        name: 'Sanitiza escapes problemáticos',
        exec: () => {
          const cleaned = jsonString
            // Remove caracteres de controle primeiro
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            // Corrige sequências de escape problemáticas
            .replace(/\\(?!["\\/bfnrt])/g, '\\\\') // Adiciona escape para barras não seguidas por chars válidos
            .replace(/\\\\\\\\/g, '\\\\') // Corrige escape excessivo de barras
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"');
          return JSON.parse(cleaned);
        }
      },
      {
        name: 'Sanitização agressiva para código complexo',
        exec: () => {
          const cleaned = jsonString
            // Remove caracteres de controle
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
            // Substitui template literals por placeholders
            .replace(/\$\{[^}]*\}/g, 'PLACEHOLDER')
            .replace(/`([^`]*)`/g, '"$1"')
            // Normaliza escapes
            .replace(/\\\\\\\\/g, '\\\\')
            .replace(/\\\\"/g, '\\"')
            .replace(/\\"/g, '"')
            .replace(/\\n/g, '\\n') // Mantém como escape literal
            .replace(/\\r/g, '\\r')
            .replace(/\\t/g, '\\t');
          return JSON.parse(cleaned);
        }
      },
      {
        name: 'Sanitização agressiva - remove caracteres problemáticos',
        exec: () => {
          const cleaned = jsonString
            // Remove caracteres de controle exceto \n, \r, \t
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
            // Corrige escapes problemáticos
            .replace(/\\(?!["\\/bfnrt])/g, '')
            // Normaliza quebras de linha para espaços
            .replace(/\\n/g, ' ')
            .replace(/\\r/g, ' ')
            .replace(/\\t/g, ' ')
            // Corrige aspas
            .replace(/\\"/g, '"')
            // Remove escapes excessivos
            .replace(/\\\\/g, '\\');
          return JSON.parse(cleaned);
        }
      },
      {
        name: 'Parse com remoção total de caracteres problemáticos',
        exec: () => {
          const cleaned = jsonString
            // Estratégia mais agressiva - remove tudo que pode causar problema
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove todos os caracteres de controle
            .replace(/\\u[0-9a-fA-F]{4}/g, '') // Remove unicode escapes
            .replace(/\$\{[^}]*\}/g, 'TEMPLATE') // Substitui template literals
            .replace(/`[^`]*`/g, '"STRING"') // Substitui template strings
            .replace(/\\\\/g, '\\') // Normaliza barras
            .replace(/\\"/g, '"') // Normaliza aspas
            .replace(/\s+/g, ' ') // Normaliza espaços
            .trim();
          return JSON.parse(cleaned);
        }
      },
      {
        name: 'Fallback: tentar como string simples',
        exec: () => {
          // Se nada funcionou, talvez seja apenas uma string simples que precisa ser tratada como tal
          if (jsonString.startsWith('"') && jsonString.endsWith('"')) {
            return jsonString.slice(1, -1); // remove aspas externas
          }
          return jsonString; // retorna como string
        }
      }
    ];

    for (const strategy of strategies) {
      try {
        const result = strategy.exec();
        console.log(`✅ Estratégia "${strategy.name}" funcionou para ${context}`);
        
        // Log adicional sobre o resultado
        if (typeof result === 'object' && result !== null) {
          console.log(`📊 Resultado da estratégia "${strategy.name}": objeto com chaves:`, Object.keys(result));
        } else {
          console.log(`📊 Resultado da estratégia "${strategy.name}": tipo ${typeof result}, valor:`, 
            typeof result === 'string' ? result.substring(0, 100) + '...' : result);
        }
        
        return result;
      } catch (e) {
        const errorMsg = (e as Error).message;
        console.log(`❌ Estratégia "${strategy.name}" falhou:`, errorMsg.substring(0, 100));
      }
    }

    // Se chegou aqui, todas as estratégias falharam
    console.error(`💥 TODAS AS ESTRATÉGIAS FALHARAM para ${context}`);
    console.error(`🔍 Dados que causaram falha:`, {
      tipo: typeof jsonString,
      tamanho: jsonString.length,
      amostra: jsonString.substring(0, 300),
      caracteresEspeciais: {
        temQuebraLinha: jsonString.includes('\n'),
        temCarriageReturn: jsonString.includes('\r'),
        temTab: jsonString.includes('\t'),
        temAspasEscape: jsonString.includes('\\"'),
        temBarraEscape: jsonString.includes('\\\\'),
        temChavesAberta: jsonString.includes('{'),
        temChavesFechada: jsonString.includes('}')
      }
    });

    // Em vez de fazer throw, retornar estrutura de fallback mais tolerante
    console.warn(`⚠️ Todas as estratégias falharam para ${context}, retornando estrutura de fallback`);
    
    return {
      fallback: true,
      context: context,
      originalData: jsonString.substring(0, 500) + (jsonString.length > 500 ? '...' : ''),
      errorMessage: `Todas as estratégias de parsing falharam para ${context}`
    };
  };

  const parseCsvAdvanced = (csvContent: string): string[][] => {
    const lines = csvContent.trim().split('\n');
    const result: string[][] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const row: string[] = [];
      let current = '';
      let inQuotes = false;
      let quoteCount = 0;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const nextChar = line[j + 1];
        
        if (char === '"') {
          quoteCount++;
          
          // Se estamos no início de um campo e encontramos aspas
          if (current === '' && !inQuotes) {
            inQuotes = true;
            continue;
          }
          
          // Se encontramos aspas duplas consecutivas dentro de aspas
          if (nextChar === '"' && inQuotes) {
            current += '"';
            j++; // pula a próxima aspa
            continue;
          }
          
          // Se estamos dentro de aspas e encontramos uma aspa única
          if (inQuotes) {
            inQuotes = false;
            continue;
          }
          
          // Caso contrário, adiciona a aspa ao conteúdo
          current += char;
        } else if (char === ',' && !inQuotes) {
          row.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      
      // Adiciona o último campo
      row.push(current);
      result.push(row);
    }
    
    return result;
  };

  const parseCsv = useCallback(async (csvContent: string): Promise<ComparisonRow[]> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🚀 Iniciando parse do CSV...');
      console.log('📊 Tamanho total do CSV:', csvContent.length, 'caracteres');
      
      // Mostrar uma amostra dos dados brutos para debug
      const sampleLines = csvContent.split('\n').slice(0, 3);
      console.log('📋 Amostra das primeiras linhas do CSV:');
      sampleLines.forEach((line, index) => {
        console.log(`  Linha ${index}: ${line.substring(0, 200)}${line.length > 200 ? '...' : ''}`);
      });
      
      const rows = parseCsvAdvanced(csvContent);
      console.log('📋 Linhas extraídas do CSV:', rows.length);
      
      // Debug das primeiras linhas parseadas
      if (rows.length > 1) {
        console.log('🔍 Debug da primeira linha de dados (linha 2):');
        rows[1].forEach((cell, index) => {
          console.log(`  Campo ${index} (${rows[0][index]}): tipo=${typeof cell}, tamanho=${cell.length}, amostra="${cell.substring(0, 100)}${cell.length > 100 ? '...' : ''}"`);
        });
      }
      
      if (rows.length < 2) {
        throw new Error('CSV deve ter pelo menos uma linha de cabeçalho e uma linha de dados');
      }

      const headers = rows[0].map(h => h.trim());
      console.log('📝 Headers encontrados:', headers);

      const requiredHeaders = ['id', 'inputs', 'outputs'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`Headers obrigatórios ausentes: ${missingHeaders.join(', ')}`);
      }

      const comparisonRows: ComparisonRow[] = [];
      const skippedRows: number[] = [];
      const errorDetails: { [line: number]: string } = {};

      for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        
        if (values.length === 0 || (values.length === 1 && !values[0].trim())) {
          continue; // pula linhas vazias
        }

        try {
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });

          console.log(`\n🔄 Processando linha ${i}, ID: ${row.id}`);
          console.log(`📏 Campos extraídos:`, Object.keys(row).map(key => {
            const value = row[key];
            const type = typeof value;
            const length = type === 'string' ? value.length : 'N/A';
            return `${key}: ${type} (${length} chars)`;
          }));

          // Parse dos campos JSON principais com debug melhorado
          let inputs, outputs;
          
          // Parse inputs com debug detalhado
          try {
            console.log(`🔍 Tentando parse de inputs na linha ${i}`);
            console.log(`🔍 Dados brutos de inputs:`, {
              tipo: typeof row.inputs,
              tamanho: row.inputs?.length || 'N/A',
              amostra: row.inputs?.substring ? row.inputs.substring(0, 200) + '...' : row.inputs,
              primeiroChar: row.inputs?.charAt ? row.inputs.charAt(0) : 'N/A',
              ultimoChar: row.inputs?.charAt ? row.inputs.charAt(row.inputs.length - 1) : 'N/A',
              temOutput: row.inputs?.includes ? row.inputs.includes('"output"') : false,
              temInputs: row.inputs?.includes ? row.inputs.includes('"inputs"') : false,
              temContent: row.inputs?.includes ? row.inputs.includes('"content"') : false
            });
            
            // Primeiro verificar se inputs precisa de parse duplo (como outputs)
            let inputsData = row.inputs;
            
            // Se parece ter estrutura {"output": "..."} ou similar, tentar parse inicial
            if (typeof inputsData === 'string' && inputsData.trim().startsWith('{') && inputsData.includes('"output"')) {
              try {
                console.log('🔧 Inputs parece ter estrutura de container, tentando parse inicial...');
                const containerParsed = JSON.parse(inputsData);
                if (containerParsed.output) {
                  console.log('🎯 Encontrado campo output em inputs, usando ele');
                  inputsData = containerParsed.output;
                } else if (containerParsed.inputs) {
                  console.log('🎯 Encontrado campo inputs em inputs, usando ele');
                  inputsData = containerParsed.inputs;
                } else {
                  console.log('🎯 Container parseado mas sem campo output/inputs esperado, usando dados originais');
                }
              } catch (containerError) {
                console.log('⚠️ Falha ao parsear container de inputs, usando dados originais');
              }
            }
            
            inputs = debugJsonParsing(inputsData, `inputs linha ${i}`);
            console.log('✅ Inputs parseados com sucesso:', typeof inputs === 'object' ? Object.keys(inputs || {}) : typeof inputs);
          } catch (e) {
            const errorMsg = `Erro no JSON de inputs: ${(e as Error).message}`;
            console.warn(`⚠️ Linha ${i + 1} - Erro no parse de inputs, criando fallback: ${errorMsg}`);
            
            // Em vez de pular a linha, criar uma estrutura de fallback para inputs
            inputs = {
              fallback: true,
              errorMessage: errorMsg,
              originalData: row.inputs
            };
          }

          // Parse outputs com debug detalhado
          try {
            console.log(`🔍 Tentando parse de outputs na linha ${i}`);
            outputs = debugJsonParsing(row.outputs, `outputs linha ${i}`);
            console.log('✅ Outputs parseados com sucesso:', typeof outputs, Object.keys(outputs || {}));
          } catch (e) {
            const errorMsg = `Erro no JSON de outputs: ${(e as Error).message}`;
            console.warn(`⚠️ Linha ${i + 1} - Erro no parse de outputs, criando fallback: ${errorMsg}`);
            
            // Em vez de pular a linha, criar uma estrutura de fallback para outputs
            outputs = {
              fallback: true,
              errorMessage: errorMsg,
              originalData: row.outputs
            };
          }
          
          // Preparar o output principal com tratamento melhorado
          let outputForComparison;
          
          try {
            console.log(`🔧 Analisando estrutura de outputs na linha ${i}:`, {
              tipo: typeof outputs,
              ehString: typeof outputs === 'string',
              ehObjeto: typeof outputs === 'object',
              ehArray: Array.isArray(outputs),
              temCampoOutput: outputs && typeof outputs === 'object' && 'output' in outputs,
              temCodeSuggestions: outputs && typeof outputs === 'object' && 'codeSuggestions' in outputs,
              keys: outputs && typeof outputs === 'object' ? Object.keys(outputs) : 'N/A'
            });

            // Se outputs é uma string, é provavelmente o JSON direto
            if (typeof outputs === 'string') {
              console.log('📝 Outputs é string, tentando parse...');
              const parsedSuggestion = parseJsonSafely(outputs);
              outputForComparison = {
                output: outputs,
                parsed: parsedSuggestion,
                label: 'Modelo B'
              };
            } 
            // Se outputs tem campo 'output' (estrutura mais complexa)
            else if (outputs && typeof outputs === 'object' && outputs.output) {
              console.log('🔧 Outputs tem campo output, tentando parse...');
              console.log('🔍 Tipo do campo output:', typeof outputs.output);
              console.log('🔍 Amostra do campo output:', typeof outputs.output === 'string' ? outputs.output.substring(0, 150) + '...' : outputs.output);
              
              // AQUI É O PONTO CRÍTICO: se output é uma string JSON escapada, precisamos parseá-la
              const parsedSuggestion = parseJsonSafely(outputs.output);
              console.log('🎯 Resultado do parse do campo output:', parsedSuggestion ? (parsedSuggestion.codeSuggestions ? `✅ ${parsedSuggestion.codeSuggestions.length} codeSuggestions encontradas` : '⚠️ Sem codeSuggestions') : '❌ Parse falhou');
              
              outputForComparison = {
                output: outputs.output,
                parsed: parsedSuggestion,
                label: outputs.label || 'Modelo B'
              };
            } 
            // Se outputs já é o objeto parseado (raro mas possível)
            else if (outputs && typeof outputs === 'object' && outputs.codeSuggestions) {
              console.log('📚 Outputs já parece ser estrutura de sugestão parseada');
              outputForComparison = {
                output: JSON.stringify(outputs, null, 2),
                parsed: outputs,
                label: 'Modelo B'
              };
            }
            // Caso padrão
            else {
              console.log('🎯 Estrutura de outputs não reconhecida, usando como JSON');
              console.log('🎯 Dados de outputs:', outputs);
              outputForComparison = {
                output: typeof outputs === 'string' ? outputs : JSON.stringify(outputs, null, 2),
                parsed: undefined,
                label: 'Modelo B'
              };
            }
          } catch (e) {
            const errorMsg = `Erro na estrutura de outputs: ${(e as Error).message}`;
            console.warn(`⚠️ Linha ${i + 1} - Erro no parse de outputs, criando fallback: ${errorMsg}`);
            
            // Em vez de pular a linha, criar uma estrutura de fallback
            outputForComparison = {
              output: JSON.stringify(outputs, null, 2),
              parsed: {
                overallSummary: `Erro ao processar linha ${i + 1}: ${errorMsg}`,
                codeSuggestions: []
              },
              label: 'Modelo B (com erro)'
            };
          }
          
          const comparisonRow: ComparisonRow = {
            id: row.id,
            inputs,
            outputs: outputForComparison
          };

          // Parse reference_outputs se existir - com debug melhorado
          if (row.reference_outputs && row.reference_outputs.trim()) {
            try {
              console.log(`🔍 Tentando parse de reference_outputs na linha ${i}`);
              const refOutputs = debugJsonParsing(row.reference_outputs, `reference_outputs linha ${i}`);
              console.log('✅ Reference outputs parseados:', typeof refOutputs);
              
              let refOutputForComparison;
              
              try {
                if (typeof refOutputs === 'string') {
                  const parsedRefSuggestion = parseJsonSafely(refOutputs);
                  refOutputForComparison = {
                    output: refOutputs,
                    parsed: parsedRefSuggestion,
                    label: 'Referência'
                  };
                } else if (refOutputs && refOutputs.output) {
                  console.log('🔧 Reference outputs tem campo output, tentando parse...');
                  console.log('🔍 Tipo do campo output (ref):', typeof refOutputs.output);
                  console.log('🔍 Amostra do campo output (ref):', typeof refOutputs.output === 'string' ? refOutputs.output.substring(0, 150) + '...' : refOutputs.output);
                  
                  const parsedRefSuggestion = parseJsonSafely(refOutputs.output);
                  console.log('🎯 Resultado do parse do campo output (ref):', parsedRefSuggestion ? (parsedRefSuggestion.codeSuggestions ? `✅ ${parsedRefSuggestion.codeSuggestions.length} codeSuggestions encontradas` : '⚠️ Sem codeSuggestions') : '❌ Parse falhou');
                  
                  refOutputForComparison = {
                    output: refOutputs.output,
                    parsed: parsedRefSuggestion,
                    label: refOutputs.label || 'Referência'
                  };
                } else if (refOutputs && refOutputs.codeSuggestions) {
                  refOutputForComparison = {
                    output: JSON.stringify(refOutputs, null, 2),
                    parsed: refOutputs,
                    label: 'Referência'
                  };
                } else {
                  refOutputForComparison = {
                    output: JSON.stringify(refOutputs, null, 2),
                    parsed: undefined,
                    label: 'Referência'
                  };
                }
                
                comparisonRow.reference_outputs = refOutputForComparison;
              } catch (e) {
                console.warn(`⚠️ Erro ao processar estrutura de reference_outputs na linha ${i + 1} - criando fallback:`, e);
                
                // Em vez de ignorar, criar uma estrutura de fallback
                comparisonRow.reference_outputs = {
                  output: JSON.stringify(refOutputs, null, 2),
                  parsed: {
                    overallSummary: `Erro ao processar reference_outputs da linha ${i + 1}`,
                    codeSuggestions: []
                  },
                  label: 'Referência (com erro)'
                };
              }
            } catch (e) {
              console.warn(`⚠️ Erro ao fazer parse de reference_outputs na linha ${i + 1} - criando fallback:`, e);
              
              // Em vez de ignorar, criar uma estrutura de fallback
              comparisonRow.reference_outputs = {
                output: row.reference_outputs || 'Dados indisponíveis',
                parsed: {
                  overallSummary: `Erro ao processar reference_outputs da linha ${i + 1}: ${(e as Error).message}`,
                  codeSuggestions: []
                },
                label: 'Referência (com erro de parse)'
              };
            }
          }

          // Suporte para outputs alternativos (para testes A/B/C)
          const alternativeKeys = headers.filter(h => h.startsWith('alternative_output_'));
          if (alternativeKeys.length > 0) {
            comparisonRow.alternativeOutputs = [];
            alternativeKeys.forEach(key => {
              if (row[key] && row[key].trim()) {
                try {
                  const altOutput = debugJsonParsing(row[key], `${key} linha ${i}`);
                  const label = key.replace('alternative_output_', '').replace('_', ' ');
                  comparisonRow.alternativeOutputs!.push({
                    output: typeof altOutput === 'string' ? altOutput : JSON.stringify(altOutput, null, 2),
                    parsed: typeof altOutput === 'string' ? parseJsonSafely(altOutput) : 
                           (altOutput.output ? parseJsonSafely(altOutput.output) : altOutput),
                    label: altOutput.label || label || 'Alternativo'
                  });
                } catch (e) {
                  console.warn(`⚠️ Erro ao fazer parse de ${key} na linha ${i + 1} - criando fallback:`, e);
                  
                  // Em vez de ignorar, criar uma estrutura de fallback
                  const label = key.replace('alternative_output_', '').replace('_', ' ');
                  comparisonRow.alternativeOutputs!.push({
                    output: row[key] || 'Dados indisponíveis',
                    parsed: {
                      overallSummary: `Erro ao processar ${key} da linha ${i + 1}: ${(e as Error).message}`,
                      codeSuggestions: []
                    },
                    label: `${label} (com erro)`
                  });
                }
              }
            });
          }

          comparisonRows.push(comparisonRow);
          console.log(`✅ Linha ${i} processada com sucesso`);
        } catch (error) {
          const errorMsg = `Erro geral: ${(error as Error).message}`;
          console.warn(`❌ Erro ao processar linha ${i + 1}:`, error);
          console.warn(`⚠️ Linha ${i + 1} será pulada - continuando com próxima linha...`);
          errorDetails[i + 1] = errorMsg;
          skippedRows.push(i + 1);
          // Continua processando outras linhas
        }
      }

      // Relatório final com detalhes dos erros
      if (skippedRows.length > 0) {
        console.group(`⚠️  RELATÓRIO DE ERROS - ${skippedRows.length} linhas puladas (processamento continuou):`);
        skippedRows.forEach(lineNum => {
          console.log(`📍 Linha ${lineNum}: ${errorDetails[lineNum] || 'Erro não especificado'}`);
        });
        console.groupEnd();
        
        console.info(`✅ Processamento finalizado: ${comparisonRows.length} linhas processadas com sucesso, ${skippedRows.length} linhas puladas`);
      }

      if (comparisonRows.length === 0) {
        // Criar uma mensagem de erro mais detalhada
        const errorSummary = Object.entries(errorDetails)
          .slice(0, 5) // mostrar apenas os primeiros 5 erros
          .map(([line, error]) => `Linha ${line}: ${error}`)
          .join('\n');
        
        throw new Error(`❌ Nenhuma linha válida foi processada. Todas as ${rows.length - 1} linhas de dados tinham erros no JSON.\n\nPrimeiros erros encontrados:\n${errorSummary}\n\n💡 Sugestões:\n- Verifique se o JSON nas células está escapado corretamente\n- Teste uma linha individual no console\n- Considere usar uma ferramenta para validar o CSV`);
      }

      const totalProcessed = comparisonRows.length;
      const totalSkipped = skippedRows.length;
      const totalLines = rows.length - 1; // excluindo header
      
      let message = `✅ ${totalProcessed} de ${totalLines} linhas processadas`;
      
      if (totalSkipped > 0) {
        message += ` (${totalSkipped} linhas puladas: ${skippedRows.join(', ')})`;
      }
      
      if (totalProcessed > 0) {
        message += `\n🎯 Sistema agora é mais tolerante: linhas com erros parciais são mantidas com estruturas de fallback`;
      }
      
      console.log(message);
      setIsLoading(false);
      return comparisonRows;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('💥 Erro no parser CSV:', error);
      setError(errorMessage);
      setIsLoading(false);
      throw error;
    }
  }, []);

  return {
    parseCsv,
    isLoading,
    error
  };
} 