import { useState, useCallback } from 'react';
import { ComparisonRow, SuggestionData, ComparisonOutput } from '@/types/suggestion';

export function useCsvParser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseJsonSafely = (data: any): SuggestionData | undefined => {
    console.log('parseJsonSafely started with data:', typeof data, data && typeof data === 'object' ? 'object' : (typeof data === 'string' ? data.substring(0, 100) + '...' : String(data)));
    
    // Additional log for objects
    if (typeof data === 'object' && data !== null) {
      console.log('🔍 parseJsonSafely: Object fields:', Object.keys(data));
      console.log('🔍 parseJsonSafely: Has content?', 'content' in data);
      console.log('🔍 parseJsonSafely: Has codeSuggestions?', 'codeSuggestions' in data);
      if (data.content) {
        console.log('🔍 parseJsonSafely: Content type:', typeof data.content);
        console.log('🔍 parseJsonSafely: Content includes ```json?', data.content.includes && data.content.includes('```json'));
      }
    }
    
    try {
      // If it's already a valid object with codeSuggestions, return directly
      if (typeof data === 'object' && data !== null && data.codeSuggestions) {
        console.log('✅ parseJsonSafely: data already is a valid object with codeSuggestions');
        return data as SuggestionData;
      }

      // If it's an object with 'content' field (IA response structure), extract the content
      if (typeof data === 'object' && data !== null && data.content) {
        console.log('🔧 parseJsonSafely: object has content field, extracting...');
        console.log('🔍 Content field type:', typeof data.content);
        console.log('🔍 Content sample:', typeof data.content === 'string' ? data.content.substring(0, 150) + '...' : data.content);
        
        // If content is a string that looks like markdown, process specially
        if (typeof data.content === 'string' && data.content.includes('```json')) {
          console.log('🎯 parseJsonSafely: content contains markdown block, processing...');
          
          // Extract JSON from markdown block
          const jsonMatch = data.content.match(/```json\n([\s\S]*?)\n```/);
          if (jsonMatch) {
            const extractedJson = jsonMatch[1];
                         console.log('📋 parseJsonSafely: JSON extracted from content:', extractedJson.substring(0, 200) + '...');
             
             // Specific debug for problematic positions
             if (extractedJson.length > 1623) {
               console.log('🔍 Debug position 1576:', {
                 char: extractedJson.charAt(1575),
                 charCode: extractedJson.charCodeAt(1575),
                 context: extractedJson.substring(1570, 1580)
               });
               console.log('🔍 Debug position 1623:', {
                 char: extractedJson.charAt(1622),
                 charCode: extractedJson.charCodeAt(1622),
                 context: extractedJson.substring(1618, 1628)
               });
             }
            
                         // Apply cleaning strategies on extracted JSON
             const cleaningStrategies = [
               {
                 name: 'Parse directly',
                 clean: (str: string) => str
               },
               {
                 name: 'Remove control characters',
                 clean: (str: string) => str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
               },
               {
                 name: 'Clean problematic template literals',
                 clean: (str: string) => {
                   // Replace nested template literals with simple strings
                   return str
                     .replace(/\$\{[^}]*\}/g, '"TEMPLATE_LITERAL"')
                     .replace(/`/g, '"');
                 }
               },
               {
                 name: 'Fix backslashes + specific backticks',
                 clean: (str: string) => {
                   return str
                     // Remove control characters first
                     .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
                     // Fix specifically \\` (backslash + backtick)
                     .replace(/\\`/g, '`')
                     // Fix other problematic sequences with backticks
                     .replace(/\\\\`/g, '`')
                     .replace(/\\\\\\\\/g, '\\\\')
                     // Normalize template literals 
                     .replace(/`([^`]*)`/g, '"$1"')
                     // Replace ${...} expressions
                     .replace(/\$\{[^}]*\}/g, 'EXPR')
                     // Normalize quotes
                     .replace(/\\"/g, '"');
                 }
               },
               {
                 name: 'Normalize multiple escapes',
                 clean: (str: string) => {
                   return str
                     // Remove control characters first
                     .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
                     // First normalize excessive escapes
                     .replace(/\\\\\\\\/g, '\\\\') // Reduce \\\\ to \\
                     .replace(/\\\\"/g, '\\"')     // Reduce \\" to \"
                     // Then apply normal escape
                     .replace(/\\"/g, '"');
                 }
               },
               {
                 name: 'Aggressive sanitization for complex code',
                 clean: (str: string) => {
                   return str
                     // Remove control characters
                     .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
                     // Replace template literals with placeholders
                     .replace(/\$\{[^}]*\}/g, 'PLACEHOLDER')
                     .replace(/`([^`]*)`/g, '"$1"')
                     // Normalize escapes
                     .replace(/\\\\\\\\/g, '\\\\')
                     .replace(/\\\\"/g, '\\"')
                     .replace(/\\"/g, '"')
                     .replace(/\\n/g, '\\n') // Keep as literal escape
                     .replace(/\\r/g, '\\r')
                     .replace(/\\t/g, '\\t');
                 }
               },
               {
                 name: 'Complete escape - convert everything to text',
                 clean: (str: string) => {
                   return str
                     // Remove problematic characters first
                     .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
                     // Convert line breaks to spaces
                     .replace(/\\n/g, ' ')
                     .replace(/\\r/g, ' ')
                     .replace(/\\t/g, ' ')
                     // Remove template literals
                     .replace(/\$\{[^}]*\}/g, ' ')
                     .replace(/`/g, '"')
                     // Normalize escapes
                     .replace(/\\\\/g, '\\')
                     .replace(/\\"/g, '"')
                     // Remove multiple spaces
                     .replace(/\s+/g, ' ');
                 }
               },
               {
                 name: 'Parse with total removal of problematic characters',
                 clean: (str: string) => {
                   return str
                     // Most aggressive strategy - remove everything that could cause problems
                     .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove all control characters
                     .replace(/\\u[0-9a-fA-F]{4}/g, '') // Remove unicode escapes
                     .replace(/\$\{[^}]*\}/g, 'TEMPLATE') // Replace template literals
                     .replace(/`[^`]*`/g, '"STRING"') // Replace template strings
                     .replace(/\\\\/g, '\\') // Normalize backslashes
                     .replace(/\\"/g, '"') // Normalize quotes
                     .replace(/\s+/g, ' ') // Normalize spaces
                     .trim();
                 }
               },
               {
                 name: 'Byte-by-byte removal of problematic characters',
                 clean: (str: string) => {
                   let cleaned = '';
                   for (let i = 0; i < str.length; i++) {
                     const char = str[i];
                     const code = str.charCodeAt(i);
                     
                     // Remove specific control characters
                     if (code >= 32 && code <= 126) {
                       // Printable ASCII
                       cleaned += char;
                     } else if (code === 10 || code === 13 || code === 9) {
                       // Line break, carriage return, tab - keep but normalize
                       cleaned += ' ';
                     } else if (code > 127) {
                       // Valid Unicode - keep
                       cleaned += char;
                     }
                     // Ignore other control characters
                   }
                   
                   // Normalize escapes
                   return cleaned
                     .replace(/\s+/g, ' ')
                     .replace(/\\"/g, '"')
                     .replace(/\\\\/g, '\\')
                     .trim();
                 }
               },
               {
                 name: 'Partial recovery strategy',
                 clean: (str: string) => {
                   // If everything fails, at least try to extract what we can
                   try {
                     let result: any = {
                       overallSummary: "Error processing content",
                       codeSuggestions: []
                     };
                     
                     // Try to extract overallSummary
                     const summaryMatch = str.match(/"overallSummary":\s*"([^"]+)"/);
                     if (summaryMatch) {
                       result.overallSummary = summaryMatch[1];
                     }
                     
                     // Try to extract codeSuggestions more robustly
                     try {
                       // Look for codeSuggestions patterns even if not perfect JSON
                       const suggestionsPattern = /"codeSuggestions":\s*\[\s*({[\s\S]*?})\s*\]/;
                       const suggestionsMatch = str.match(suggestionsPattern);
                       
                       if (suggestionsMatch) {
                         // Try to clean and parse the first suggestion
                         let suggestionStr = suggestionsMatch[1];
                         
                         // Basic cleaning
                         suggestionStr = suggestionStr
                           .replace(/\\`/g, '`')
                           .replace(/\\"/g, '"')
                           .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
                           
                         try {
                           const suggestion = JSON.parse(suggestionStr);
                           result.codeSuggestions = [suggestion];
                         } catch (parseError) {
                           // If parsing fails, at least extract basic fields
                           const fileMatch = suggestionStr.match(/"relevantFile":\s*"([^"]+)"/);
                           const contentMatch = suggestionStr.match(/"suggestionContent":\s*"([^"]+)"/);
                           const summaryMatch = suggestionStr.match(/"oneSentenceSummary":\s*"([^"]+)"/);
                           
                           if (fileMatch || contentMatch) {
                             result.codeSuggestions = [{
                               relevantFile: fileMatch ? fileMatch[1] : "unknown",
                               suggestionContent: contentMatch ? contentMatch[1].substring(0, 200) + "..." : "Content not extractable",
                               oneSentenceSummary: summaryMatch ? summaryMatch[1] : "Summary not available",
                               label: "extracted_partial"
                             }];
                           }
                         }
                       }
                     } catch (e) {
                       // Continue with empty codeSuggestions
                     }
                     
                     return JSON.stringify(result);
                   } catch (e) {
                     // If even this fails, return minimal fallback structure
                     return JSON.stringify({
                       overallSummary: "Error processing content",
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
                console.log(`✅ parseJsonSafely: strategy "${strategy.name}" worked for content markdown`);
                if (result && result.codeSuggestions) {
                  console.log(`🎯 parseJsonSafely: found ${result.codeSuggestions.length} codeSuggestions in content`);
                }
                return result;
              } catch (e) {
                console.log(`❌ parseJsonSafely: strategy "${strategy.name}" failed for content:`, (e as Error).message.substring(0, 100));
              }
            }
            
            console.warn('⚠️ parseJsonSafely: all strategies failed for content markdown');
          }
        }
        
        // Recursively process the content (if not markdown)
        return parseJsonSafely(data.content);
      }

      // If it's an object but doesn't have codeSuggestions or content, try JSON.stringify and re-parse
      if (typeof data === 'object' && data !== null) {
        console.log('🔄 parseJsonSafely: object without content/codeSuggestions, trying stringify...');
        try {
          const stringified = JSON.stringify(data);
          console.log('🔧 parseJsonSafely: object stringified, trying re-parse...');
          return parseJsonSafely(stringified);
        } catch (stringifyError) {
          console.log('❌ parseJsonSafely: failed to stringify object');
          return undefined;
        }
      }

      // If it's not a string, convert to string
      if (typeof data !== 'string') {
        console.log('🔄 parseJsonSafely: converting to string (type:', typeof data, ')');
        data = String(data);
      }

      const jsonString = data as string;
      
      // Cleaning and parsing strategies
      const cleaningStrategies = [
        {
          name: 'Parse directly',
          clean: (str: string) => str.trim()
        },
        {
          name: 'Remove line break escapes',
          clean: (str: string) => str.trim().replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
        },
        {
          name: 'Remove double escape',
          clean: (str: string) => str.trim().replace(/\\"/g, '"')
        },
        {
          name: 'Combined: line break + quotes',
          clean: (str: string) => str.trim().replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\"/g, '"')
        },
        {
          name: 'Remove all escapes',
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
          console.log(`✅ parseJsonSafely: "${strategy.name}" worked`);
          
          // Check if there are codeSuggestions
          if (parsed && parsed.codeSuggestions) {
            console.log(`🎯 parseJsonSafely: found codeSuggestions with ${parsed.codeSuggestions.length} items`);
            return parsed as SuggestionData;
          } else {
            console.log(`⚠️ parseJsonSafely: JSON parsed but without codeSuggestions:`, Object.keys(parsed || {}));
          }
          
          return parsed;
        } catch (e) {
          console.log(`❌ parseJsonSafely: "${strategy.name}" failed:`, (e as Error).message.substring(0, 50));
        }
      }
      
      // If there are markdown code blocks
      if (jsonString.includes('```json')) {
        const jsonMatch = jsonString.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          console.log('JSON extracted from markdown block');
          let extractedJson = jsonMatch[1];
          console.log('🔍 JSON extracted (first 200 chars):', extractedJson.substring(0, 200));
          
          // Apply escapes cleaning to the extracted JSON
          try {
            // Try direct parse first
            return JSON.parse(extractedJson);
          } catch (directError) {
            console.log('❌ Direct JSON parse failed, trying escapes cleaning...');
            
                         // Apply the same cleaning strategies
             const cleaningStrategies = [
               {
                 name: 'Remove line break escapes',
                 clean: (str: string) => str.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
               },
               {
                 name: 'Remove double escape from quotes',
                 clean: (str: string) => str.replace(/\\"/g, '"')
               },
               {
                 name: 'Remove problematic control characters',
                 clean: (str: string) => {
                   // Remove problematic ASCII characters (0-31, except tab, newline, carriage return which are valid)
                   return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
                 }
               },
               {
                 name: 'Sanitize problematic escapes',
                 clean: (str: string) => str
                   // Fix problematic escape sequences
                   .replace(/\\(?!["\\/bfnrt])/g, '\\\\') // Add escape for bars not followed by valid chars
                   .replace(/\\\\\\\\/g, '\\\\') // Fix excessive escape of bars
                   .replace(/\\n/g, '\n')
                   .replace(/\\r/g, '\r')
                   .replace(/\\t/g, '\t')
                   .replace(/\\"/g, '"')
               },
               {
                 name: 'Complete escapes cleaning',
                 clean: (str: string) => str
                   .replace(/\\n/g, '\n')
                   .replace(/\\r/g, '\r')
                   .replace(/\\t/g, '\t')
                   .replace(/\\"/g, '"')
                   .replace(/\\\\/g, '\\')
                   .replace(/\\'/g, "'")
               },
               {
                 name: 'Remove non-printable characters and sanitize',
                 clean: (str: string) => {
                   // Remove non-printable characters and do aggressive sanitization
                   return str
                     // Remove control characters except \n, \r, \t
                     .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
                     // Fix problematic escapes
                     .replace(/\\(?!["\\/bfnrt])/g, '')
                     // Normalize line breaks
                     .replace(/\\n/g, ' ')
                     .replace(/\\r/g, ' ')
                     .replace(/\\t/g, ' ')
                     // Fix quotes
                     .replace(/\\"/g, '"')
                     // Remove excessive escapes
                     .replace(/\\\\/g, '\\');
                 }
               }
             ];
            
            for (const strategy of cleaningStrategies) {
              try {
                const cleanedJson = strategy.clean(extractedJson);
                const result = JSON.parse(cleanedJson);
                console.log(`✅ Strategy "${strategy.name}" worked for JSON from markdown`);
                return result;
              } catch (e) {
                console.log(`❌ Strategy "${strategy.name}" failed for JSON from markdown:`, (e as Error).message.substring(0, 100));
              }
            }
            
            console.warn(`⚠️ All strategies failed for JSON from markdown: ${(directError as Error).message}`);
            console.warn('🔄 Returning undefined to continue processing');
            return undefined;
          }
        }
      }
      
      // If the string looks like an object with "content" field
      if (jsonString.includes('"content":')) {
        try {
          const containerParsed = JSON.parse(jsonString);
          if (containerParsed.content) {
            console.log('JSON extracted from content field');
            return JSON.parse(containerParsed.content);
          }
        } catch (e) {
          console.log('Failed to extract content');
        }
      }
      
      console.log('Failed to parse, returning undefined');
      return undefined;
    } catch (e) {
      console.warn('⚠️ Captured error in parseJsonSafely:', (e as Error).message);
      console.warn('🔄 Returning undefined to allow continued processing');
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
      console.log(`✅ ${context} already is a valid object, returning directly`);
      return data;
    }

    // Se não é string, converter para string primeiro
    if (typeof data !== 'string') {
      console.log(`🔄 ${context} not a string (type: ${dataType}), converting...`);
      data = String(data);
    }

    const jsonString = data as string;
    
    console.log(`📊 String analysis (${context}):`, {
      tamanho: jsonString.length,
      primeiros50: jsonString.substring(0, 50),
      ultimos50: jsonString.length > 50 ? jsonString.substring(jsonString.length - 50) : jsonString,
      temAspasEscape: jsonString.includes('\\"'),
      hasLineBreak: jsonString.includes('\n'),
      primeiroChar: jsonString.charAt(0),
      ultimoChar: jsonString.charAt(jsonString.length - 1)
    });

    // Detect common problems before trying parsing
    const problemasDetectados = [];
    
    if (!jsonString.trim()) {
      problemasDetectados.push('Empty or only spaces string');
    }
    
    if (jsonString.includes('\\n') && !jsonString.includes('\n')) {
      problemasDetectados.push('Contains \\\\n escaped that may need to be converted');
    }
    
    if (jsonString.includes('\\"') && jsonString.split('\\"').length > 10) {
      problemasDetectados.push('Too many escaped quotes - may be double-escaped JSON');
    }
    
    if (jsonString.startsWith('"') && jsonString.endsWith('"') && jsonString.includes('{"')) {
      problemasDetectados.push('Seems to be JSON stringified inside quotes');
    }
    
    if (problemasDetectados.length > 0) {
      console.log(`⚠️ Problems detected in ${context}:`, problemasDetectados);
    }

    // Tentar diferentes estratégias de parsing
    const strategies = [
      {
        name: 'Direct parse',
        exec: () => JSON.parse(jsonString)
      },
      {
        name: 'Trim and parse',
        exec: () => JSON.parse(jsonString.trim())
      },
      {
        name: 'Remove external quotes from JSON stringified',
        exec: () => {
          let cleaned = jsonString.trim();
          if (cleaned.startsWith('"') && cleaned.endsWith('"') && cleaned.includes('{"')) {
            cleaned = cleaned.slice(1, -1); // remove external quotes
            cleaned = cleaned.replace(/\\"/g, '"'); // desescape internal quotes
          }
          return JSON.parse(cleaned);
        }
      },
      {
        name: 'Remove line break escapes',
        exec: () => JSON.parse(jsonString.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t'))
      },
      {
        name: 'Remove double escape from quotes',
        exec: () => JSON.parse(jsonString.replace(/\\"/g, '"'))
      },
      {
        name: 'Remove all basic escapes',
        exec: () => JSON.parse(jsonString.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\"/g, '"'))
      },
      {
        name: 'Remove backslash escape',
        exec: () => JSON.parse(jsonString.replace(/\\\\/g, '\\'))
      },
      {
        name: 'Complete escapes cleaning',
        exec: () => JSON.parse(jsonString
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
          .replace(/\\'/g, "'"))
      },
      {
        name: 'Remove literal line breaks',
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
        name: 'Parse after unescape HTML',
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
        name: 'Remove problematic control characters',
        exec: () => {
          // Remove problematic ASCII control characters
          const cleaned = jsonString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
          return JSON.parse(cleaned);
        }
      },
      {
        name: 'Clean problematic template literals',
        exec: () => {
          const cleaned = jsonString
            // Replace nested template literals with simple strings
            .replace(/\$\{[^}]*\}/g, '"TEMPLATE_LITERAL"')
            .replace(/`/g, '"')
            // Remove control characters
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
          return JSON.parse(cleaned);
        }
      },
      {
        name: 'Normalize multiple escapes',
        exec: () => {
          const cleaned = jsonString
            // Remove control characters first
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            // First normalize excessive escapes
            .replace(/\\\\\\\\/g, '\\\\') // Reduce \\\\ to \\
            .replace(/\\\\"/g, '\\"')     // Reduce \\" to \"
            // Then apply normal escape
            .replace(/\\"/g, '"');
          return JSON.parse(cleaned);
        }
      },
      {
        name: 'Sanitize problematic escapes',
        exec: () => {
          const cleaned = jsonString
            // Remove control characters first
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            // Fix problematic escape sequences
            .replace(/\\(?!["\\/bfnrt])/g, '\\\\') // Add escape for bars not followed by valid chars
            .replace(/\\\\\\\\/g, '\\\\') // Fix excessive escape of bars
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"');
          return JSON.parse(cleaned);
        }
      },
      {
        name: 'Aggressive sanitization for complex code',
        exec: () => {
          const cleaned = jsonString
            // Remove control characters
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
            // Replace template literals with placeholders
            .replace(/\$\{[^}]*\}/g, 'PLACEHOLDER')
            .replace(/`([^`]*)`/g, '"$1"')
            // Normalize escapes
            .replace(/\\\\\\\\/g, '\\\\')
            .replace(/\\\\"/g, '\\"')
            .replace(/\\"/g, '"')
            .replace(/\\n/g, '\\n') // Keep as literal escape
            .replace(/\\r/g, '\\r')
            .replace(/\\t/g, '\\t');
          return JSON.parse(cleaned);
        }
      },
      {
        name: 'Aggressive sanitization - remove problematic characters',
        exec: () => {
          const cleaned = jsonString
            // Remove control characters except \n, \r, \t
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
            // Fix problematic escapes
            .replace(/\\(?!["\\/bfnrt])/g, '')
            // Normalize line breaks to spaces
            .replace(/\\n/g, ' ')
            .replace(/\\r/g, ' ')
            .replace(/\\t/g, ' ')
            // Fix quotes
            .replace(/\\"/g, '"')
            // Remove excessive escapes
            .replace(/\\\\/g, '\\');
          return JSON.parse(cleaned);
        }
      },
      {
        name: 'Parse with total removal of problematic characters',
        exec: () => {
          const cleaned = jsonString
            // Most aggressive strategy - remove everything that could cause problems
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove all control characters
            .replace(/\\u[0-9a-fA-F]{4}/g, '') // Remove unicode escapes
            .replace(/\$\{[^}]*\}/g, 'TEMPLATE') // Replace template literals
            .replace(/`[^`]*`/g, '"STRING"') // Replace template strings
            .replace(/\\\\/g, '\\') // Normalize backslashes
            .replace(/\\"/g, '"') // Normalize quotes
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
          return JSON.parse(cleaned);
        }
      },
      {
        name: 'Fallback: try as simple string',
        exec: () => {
          // If nothing worked, maybe it's just a simple string that needs to be treated as such
          if (jsonString.startsWith('"') && jsonString.endsWith('"')) {
            return jsonString.slice(1, -1); // remove external quotes
          }
          return jsonString; // return as string
        }
      }
    ];

    for (const strategy of strategies) {
      try {
        const result = strategy.exec();
        console.log(`✅ Strategy "${strategy.name}" worked for ${context}`);
        
        // Additional log about the result
        if (typeof result === 'object' && result !== null) {
          console.log(`📊 Result of strategy "${strategy.name}": object with keys:`, Object.keys(result));
        } else {
          console.log(`📊 Result of strategy "${strategy.name}": type ${typeof result}, value:`, 
            typeof result === 'string' ? result.substring(0, 100) + '...' : result);
        }
        
        return result;
      } catch (e) {
        const errorMsg = (e as Error).message;
        console.log(`❌ Strategy "${strategy.name}" failed:`, errorMsg.substring(0, 100));
      }
    }

    // If we reach here, all strategies failed
    console.error(`💥 ALL STRATEGIES FAILED for ${context}`);
    console.error(`🔍 Data that caused failure:`, {
      tipo: typeof jsonString,
      tamanho: jsonString.length,
      amostra: jsonString.substring(0, 300),
      caracteresEspeciais: {
        hasLineBreak: jsonString.includes('\n'),
        temCarriageReturn: jsonString.includes('\r'),
        temTab: jsonString.includes('\t'),
        temAspasEscape: jsonString.includes('\\"'),
        temBarraEscape: jsonString.includes('\\\\'),
        temChavesAberta: jsonString.includes('{'),
        temChavesFechada: jsonString.includes('}')
      }
    });

    // Instead of throwing, return a more tolerant fallback structure
    console.warn(`⚠️ ALL STRATEGIES FAILED for ${context}, returning fallback structure`);
    
    return {
      fallback: true,
      context: context,
      originalData: jsonString.substring(0, 500) + (jsonString.length > 500 ? '...' : ''),
      errorMessage: `All parsing strategies failed for ${context}`
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
          
          // If we're at the start of a field and we find quotes
          if (current === '' && !inQuotes) {
            inQuotes = true;
            continue;
          }
          
          // If we find consecutive double quotes inside quotes
          if (nextChar === '"' && inQuotes) {
            current += '"';
            j++; // skip the next quote
            continue;
          }
          
          // If we're inside quotes and we find a single quote
          if (inQuotes) {
            inQuotes = false;
            continue;
          }
          
          // Otherwise, add the quote to the content
          current += char;
        } else if (char === ',' && !inQuotes) {
          row.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      
      // Add the last field
      row.push(current);
      result.push(row);
    }
    
    return result;
  };

  const parseCsv = useCallback(async (csvContent: string): Promise<ComparisonRow[]> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting CSV parse...');
      console.log('📊 Total CSV size:', csvContent.length, 'characters');
      
      // Show a sample of raw data for debug
      const sampleLines = csvContent.split('\n').slice(0, 3);
      console.log('📋 Sample of the first lines of CSV:');
      sampleLines.forEach((line, index) => {
        console.log(`  Line ${index}: ${line.substring(0, 200)}${line.length > 200 ? '...' : ''}`);
      });
      
      const rows = parseCsvAdvanced(csvContent);
      console.log('📋 Extracted lines from CSV:', rows.length);
      
      // Debug of the first parsed lines
      if (rows.length > 1) {
        console.log('🔍 Debug of the first data line (line 2):');
        rows[1].forEach((cell, index) => {
          console.log(`  Field ${index} (${rows[0][index]}): type=${typeof cell}, size=${cell.length}, sample="${cell.substring(0, 100)}${cell.length > 100 ? '...' : ''}"`);
        });
      }
      
      if (rows.length < 2) {
        throw new Error('CSV must have at least one header line and one data line');
      }

      const headers = rows[0].map(h => h.trim());
      console.log('📝 Headers found:', headers);

      const requiredHeaders = ['id', 'inputs'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
      }

      // Identificar colunas de output dos modelos
      const modelOutputColumns = headers.filter(h => h.endsWith('_outputs') && h !== 'reference_outputs');
      if (modelOutputColumns.length === 0) {
        throw new Error('No model output columns found. Ensure CSV has columns ending with \'_outputs\'.');
      }
      console.log('🤖 Model output columns identified:', modelOutputColumns);

      const comparisonRows: ComparisonRow[] = [];
      const skippedRows: number[] = [];
      const errorDetails: { [line: number]: string } = {};

      for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        
        if (values.length === 0 || (values.length === 1 && !values[0].trim())) {
          continue; // skip empty lines
        }

        try {
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });

          console.log(`\n🔄 Processing line ${i}, ID: ${row.id}`);
          console.log(`📏 Extracted fields:`, Object.keys(row).map(key => {
            const value = row[key];
            const type = typeof value;
            const length = type === 'string' ? value.length : 'N/A';
            return `${key}: ${type} (${length} chars)`;
          }));

          // Parse main JSON fields with improved debug
          let inputs, outputs;
          
          // Parse inputs with detailed debug
          try {
            console.log(`🔍 Trying to parse inputs in line ${i}`);
            console.log(`🔍 Raw inputs data:`, {
              tipo: typeof row.inputs,
              tamanho: row.inputs?.length || 'N/A',
              amostra: row.inputs?.substring ? row.inputs.substring(0, 200) + '...' : row.inputs,
              primeiroChar: row.inputs?.charAt ? row.inputs.charAt(0) : 'N/A',
              ultimoChar: row.inputs?.charAt ? row.inputs.charAt(row.inputs.length - 1) : 'N/A',
              temOutput: row.inputs?.includes ? row.inputs.includes('"output"') : false,
              temInputs: row.inputs?.includes ? row.inputs.includes('"inputs"') : false,
              temContent: row.inputs?.includes ? row.inputs.includes('"content"') : false
            });
            
            // First check if inputs need double parse (like outputs)
            let inputsData = row.inputs;
            
            // If it looks like a container structure {"output": "..."} or similar, try initial parse
            if (typeof inputsData === 'string' && inputsData.trim().startsWith('{') && inputsData.includes('"output"')) {
              try {
                console.log('🔧 Inputs looks like container structure, trying initial parse...');
                const containerParsed = JSON.parse(inputsData);
                if (containerParsed.output) {
                  console.log('🎯 Found output field in inputs, using it');
                  inputsData = containerParsed.output;
                } else if (containerParsed.inputs) {
                  console.log('🎯 Found inputs field in inputs, using it');
                  inputsData = containerParsed.inputs;
                } else {
                  console.log('🎯 Container parsed but no expected output/inputs field, using original data');
                }
              } catch (containerError) {
                console.log('⚠️ Failed to parse container of inputs, using original data');
              }
            }
            
            inputs = debugJsonParsing(inputsData, `inputs line ${i}`);
            console.log('✅ Inputs parsed successfully:', typeof inputs === 'object' ? Object.keys(inputs || {}) : typeof inputs);
          } catch (e) {
            const errorMsg = `Error in JSON of inputs: ${(e as Error).message}`;
            console.warn(`⚠️ Line ${i + 1} - Error in inputs parse, creating fallback: ${errorMsg}`);
            
            // Instead of skipping the line, create a fallback structure for inputs
            inputs = {
              fallback: true,
              errorMessage: errorMsg,
              originalData: row.inputs
            };
          }

          // Processar as colunas de output dos modelos dinamicamente
          let mainOutput: ComparisonOutput | undefined = undefined;
          const alternativeOutputsProcessed: ComparisonOutput[] = [];

          modelOutputColumns.forEach((colName, index) => {
            const modelRawOutput = row[colName];
            const modelLabel = colName.replace(/_outputs$/, ''); // Derivar label do nome da coluna

            if (modelRawOutput && modelRawOutput.trim()) {
              try {
                console.log(`🔍 Trying to parse output for model "${modelLabel}" (column: ${colName}) in line ${i}`);
                const parsedModelData = debugJsonParsing(modelRawOutput, `${colName} line ${i}`);
                console.log(`✅ Output for model "${modelLabel}" parsed successfully:`, typeof parsedModelData);

                let outputForComparisonModel: ComparisonOutput;

                if (typeof parsedModelData === 'string') {
                  const parsedSuggestion = parseJsonSafely(parsedModelData);
                  outputForComparisonModel = {
                    output: parsedModelData,
                    parsed: parsedSuggestion,
                    label: modelLabel
                  };
                } else if (parsedModelData && typeof parsedModelData === 'object' && parsedModelData.output) { // Estrutura com campo 'output'
                  const parsedSuggestion = parseJsonSafely(parsedModelData.output);
                  outputForComparisonModel = {
                    output: parsedModelData.output,
                    parsed: parsedSuggestion,
                    label: parsedModelData.label || modelLabel
                  };
                } else if (parsedModelData && typeof parsedModelData === 'object' && parsedModelData.codeSuggestions) { // Já é uma estrutura SuggestionData
                  outputForComparisonModel = {
                    output: JSON.stringify(parsedModelData, null, 2),
                    parsed: parsedModelData,
                    label: modelLabel
                  };
                } else { // Fallback
                  outputForComparisonModel = {
                    output: typeof parsedModelData === 'string' ? parsedModelData : JSON.stringify(parsedModelData, null, 2),
                    parsed: undefined,
                    label: modelLabel
                  };
                }
                
                if (index === 0) {
                  mainOutput = outputForComparisonModel;
                } else {
                  alternativeOutputsProcessed.push(outputForComparisonModel);
                }

              } catch (e) {
                const errorMsg = `Error in JSON of ${colName}: ${(e as Error).message}`;
                console.warn(`⚠️ Line ${i + 1} - Error in ${colName} parse, creating fallback: ${errorMsg}`);
                const fallbackOutput: ComparisonOutput = {
                  output: modelRawOutput || 'Data unavailable',
                  parsed: {
                    overallSummary: `Error processing ${colName} for line ${i + 1}: ${errorMsg}`,
                    codeSuggestions: []
                  },
                  label: `${modelLabel} (with parse error)`
                };
                if (index === 0) {
                  mainOutput = fallbackOutput;
                } else {
                  alternativeOutputsProcessed.push(fallbackOutput);
                }
              }
            } else {
              // Se a coluna estiver vazia ou contiver apenas espaços em branco
              const emptyOutput: ComparisonOutput = {
                output: '',
                parsed: { overallSummary: 'No output provided', codeSuggestions: [] },
                label: `${modelLabel} (empty)`
              };
              if (index === 0) {
                mainOutput = emptyOutput;
              } else {
                alternativeOutputsProcessed.push(emptyOutput);
              }
            }
          });
          
          if (!mainOutput) {
            // Isso não deve acontecer se modelOutputColumns não estiver vazio, mas é uma salvaguarda
             console.warn(`⚠️ Line ${i + 1} - No main output could be processed. CSV might be malformed for model outputs.`);
             // Criar um fallback para mainOutput para evitar quebrar a estrutura ComparisonRow
             mainOutput = {
                output: 'Error: No main model output found',
                parsed: { overallSummary: 'Error: No main model output found in CSV line', codeSuggestions: [] },
                label: 'Error Model'
             };
          }

          const comparisonRow: ComparisonRow = {
            id: row.id,
            inputs,
            outputs: mainOutput, // A primeira coluna _outputs vai aqui
          };

          if (alternativeOutputsProcessed.length > 0) {
            comparisonRow.alternativeOutputs = alternativeOutputsProcessed;
          }
          
          // Parse reference_outputs if exists - with improved debug
          if (row.reference_outputs && row.reference_outputs.trim()) {
            try {
              console.log(`🔍 Trying to parse reference_outputs in line ${i}`);
              const refOutputs = debugJsonParsing(row.reference_outputs, `reference_outputs line ${i}`);
              console.log('✅ Reference outputs parsed:', typeof refOutputs);
              
              let refOutputForComparison;
              
              try {
                if (typeof refOutputs === 'string') {
                  const parsedRefSuggestion = parseJsonSafely(refOutputs);
                  refOutputForComparison = {
                    output: refOutputs,
                    parsed: parsedRefSuggestion,
                    label: 'Reference'
                  };
                } else if (refOutputs && refOutputs.output) {
                  console.log('🔧 Reference outputs has output field, trying parse...');
                  console.log('🔍 Type of output field (ref):', typeof refOutputs.output);
                  console.log('🔍 Output sample of output field (ref):', typeof refOutputs.output === 'string' ? refOutputs.output.substring(0, 150) + '...' : refOutputs.output);
                  
                  const parsedRefSuggestion = parseJsonSafely(refOutputs.output);
                  console.log('🎯 Result of output parse of reference_outputs:', parsedRefSuggestion ? (parsedRefSuggestion.codeSuggestions ? `✅ ${parsedRefSuggestion.codeSuggestions.length} codeSuggestions found` : '⚠️ No codeSuggestions') : '❌ Parse failed');
                  
                  refOutputForComparison = {
                    output: refOutputs.output,
                    parsed: parsedRefSuggestion,
                    label: refOutputs.label || 'Reference'
                  };
                } else if (refOutputs && refOutputs.codeSuggestions) {
                  refOutputForComparison = {
                    output: JSON.stringify(refOutputs, null, 2),
                    parsed: refOutputs,
                    label: 'Reference'
                  };
                } else {
                  refOutputForComparison = {
                    output: JSON.stringify(refOutputs, null, 2),
                    parsed: undefined,
                    label: 'Reference'
                  };
                }
                
                comparisonRow.reference_outputs = refOutputForComparison;
              } catch (e) {
                console.warn(`⚠️ Error processing reference_outputs structure in line ${i + 1} - creating fallback:`, e);
                
                // Instead of ignoring, create a fallback
                comparisonRow.reference_outputs = {
                  output: JSON.stringify(refOutputs, null, 2),
                  parsed: {
                    overallSummary: `Error processing reference_outputs of line ${i + 1}`,
                    codeSuggestions: []
                  },
                  label: 'Reference (with error)'
                };
              }
            } catch (e) {
              console.warn(`⚠️ Error making reference_outputs parse in line ${i + 1} - creating fallback:`, e);
              
              // Instead of ignoring, create a fallback
              comparisonRow.reference_outputs = {
                output: row.reference_outputs || 'Data unavailable',
                parsed: {
                  overallSummary: `Error processing reference_outputs of line ${i + 1}: ${(e as Error).message}`,
                  codeSuggestions: []
                },
                label: 'Reference (with parse error)'
              };
            }
          }

          comparisonRows.push(comparisonRow);
          console.log(`✅ Line ${i} processed successfully`);
        } catch (error) {
          const errorMsg = `General error: ${(error as Error).message}`;
          console.warn(`❌ Error processing line ${i + 1}:`, error);
          console.warn(`⚠️ Line ${i + 1} will be skipped - continuing with next line...`);
          errorDetails[i + 1] = errorMsg;
          skippedRows.push(i + 1);
          // Continue processing other lines
        }
      }

      // Final report with error details
      if (skippedRows.length > 0) {
        console.group(`⚠️  ERROR REPORT - ${skippedRows.length} skipped lines (processing continued):`);
        skippedRows.forEach(lineNum => {
          console.log(`📍 Line ${lineNum}: ${errorDetails[lineNum] || 'Unspecified error'}`);
        });
        console.groupEnd();
        
        console.info(`✅ Final processing completed: ${comparisonRows.length} lines processed, ${skippedRows.length} lines skipped`);
      }

      if (comparisonRows.length === 0) {
        // Create a more detailed error message
        const errorSummary = Object.entries(errorDetails)
          .slice(0, 5) // show only the first 5 errors
          .map(([line, error]) => `Line ${line}: ${error}`)
          .join('\n');
        
        throw new Error(`❌ No valid lines were processed. All ${rows.length - 1} data lines had errors in JSON.\n\nFirst errors found:\n${errorSummary}\n\n💡 Suggestions:\n- Check if JSON in cells is escaped correctly\n- Test an individual line in console\n- Consider using a tool to validate the CSV`);
      }

      const totalProcessed = comparisonRows.length;
      const totalSkipped = skippedRows.length;
      const totalLines = rows.length - 1; // excluding header
      
      let message = `✅ ${totalProcessed} of ${totalLines} lines processed`;
      
      if (totalSkipped > 0) {
        message += ` (${totalSkipped} skipped lines: ${skippedRows.join(', ')})`;
      }
      
      if (totalProcessed > 0) {
        message += `\n🎯 System now is more tolerant: lines with partial errors are kept with fallback structures`;
      }
      
      console.log(message);
      setIsLoading(false);
      return comparisonRows;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('💥 Error in CSV parser:', error);
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