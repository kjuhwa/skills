/**
 * MCP Protocol Playground — app.js
 * Browser-based interactive MCP tool schema designer & simulator
 */

'use strict';

// ============================================================
//  TEMPLATES
// ============================================================
const TEMPLATES = {
  file_read: {
    name: 'file_read',
    description: '지정된 경로의 파일 내용을 읽어 반환합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '읽을 파일의 절대 또는 상대 경로'
        },
        encoding: {
          type: 'string',
          description: '파일 인코딩 (기본값: utf-8)',
          enum: ['utf-8', 'utf-16', 'ascii', 'base64'],
          default: 'utf-8'
        },
        max_bytes: {
          type: 'number',
          description: '최대 읽을 바이트 수 (0 = 제한 없음)',
          default: 0
        }
      },
      required: ['path']
    }
  },

  file_write: {
    name: 'file_write',
    description: '지정된 경로에 파일을 생성하거나 덮어씁니다.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '쓸 파일의 경로'
        },
        content: {
          type: 'string',
          description: '파일에 쓸 내용'
        },
        create_dirs: {
          type: 'boolean',
          description: '상위 디렉토리가 없으면 자동 생성',
          default: true
        },
        encoding: {
          type: 'string',
          description: '파일 인코딩',
          enum: ['utf-8', 'utf-16', 'ascii', 'base64'],
          default: 'utf-8'
        }
      },
      required: ['path', 'content']
    }
  },

  web_search: {
    name: 'web_search',
    description: '검색 엔진을 사용하여 웹에서 정보를 검색합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '검색할 쿼리 문자열'
        },
        max_results: {
          type: 'number',
          description: '반환할 최대 결과 수',
          default: 10
        },
        language: {
          type: 'string',
          description: '검색 언어 코드 (예: ko, en, ja)',
          default: 'ko'
        },
        safe_search: {
          type: 'boolean',
          description: '세이프서치 활성화 여부',
          default: true
        }
      },
      required: ['query']
    }
  },

  database_query: {
    name: 'database_query',
    description: '데이터베이스에 SQL 쿼리를 실행하고 결과를 반환합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        connection_id: {
          type: 'string',
          description: '사용할 데이터베이스 연결 ID'
        },
        sql: {
          type: 'string',
          description: '실행할 SQL 쿼리'
        },
        parameters: {
          type: 'array',
          description: '쿼리 파라미터 배열 (prepared statement용)',
          items: { type: 'string' }
        },
        timeout_ms: {
          type: 'number',
          description: '쿼리 타임아웃 (밀리초)',
          default: 30000
        },
        max_rows: {
          type: 'number',
          description: '최대 반환 행 수',
          default: 1000
        }
      },
      required: ['connection_id', 'sql']
    }
  },

  api_call: {
    name: 'api_call',
    description: 'REST API 엔드포인트에 HTTP 요청을 보내고 응답을 반환합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '요청할 API 엔드포인트 URL'
        },
        method: {
          type: 'string',
          description: 'HTTP 메서드',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
          default: 'GET'
        },
        headers: {
          type: 'object',
          description: '요청 헤더 (키-값 쌍)',
          additionalProperties: { type: 'string' }
        },
        body: {
          type: 'string',
          description: '요청 본문 (JSON 문자열)'
        },
        timeout_ms: {
          type: 'number',
          description: '요청 타임아웃 (밀리초)',
          default: 10000
        }
      },
      required: ['url', 'method']
    }
  },

  code_execute: {
    name: 'code_execute',
    description: '지정된 언어로 코드 스니펫을 실행하고 결과를 반환합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        language: {
          type: 'string',
          description: '실행할 프로그래밍 언어',
          enum: ['python', 'javascript', 'typescript', 'bash', 'ruby', 'go']
        },
        code: {
          type: 'string',
          description: '실행할 코드'
        },
        stdin: {
          type: 'string',
          description: '표준 입력 데이터'
        },
        timeout_seconds: {
          type: 'number',
          description: '실행 타임아웃 (초)',
          default: 30
        },
        memory_limit_mb: {
          type: 'number',
          description: '메모리 제한 (MB)',
          default: 256
        }
      },
      required: ['language', 'code']
    }
  },

  image_generate: {
    name: 'image_generate',
    description: '텍스트 프롬프트를 기반으로 이미지를 생성합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: '이미지를 설명하는 텍스트 프롬프트'
        },
        negative_prompt: {
          type: 'string',
          description: '이미지에서 제외할 요소 설명'
        },
        width: {
          type: 'number',
          description: '이미지 너비 (픽셀)',
          default: 1024
        },
        height: {
          type: 'number',
          description: '이미지 높이 (픽셀)',
          default: 1024
        },
        style: {
          type: 'string',
          description: '이미지 스타일',
          enum: ['realistic', 'anime', 'oil-painting', 'watercolor', 'sketch', 'digital-art']
        },
        num_images: {
          type: 'number',
          description: '생성할 이미지 수',
          default: 1
        }
      },
      required: ['prompt']
    }
  },

  translate: {
    name: 'translate',
    description: '텍스트를 지정된 언어로 번역합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '번역할 원본 텍스트'
        },
        source_language: {
          type: 'string',
          description: '원본 언어 코드 (자동 감지: auto)',
          default: 'auto'
        },
        target_language: {
          type: 'string',
          description: '번역 대상 언어 코드 (예: ko, en, ja, zh)'
        },
        formality: {
          type: 'string',
          description: '번역 격식 수준',
          enum: ['formal', 'informal', 'auto'],
          default: 'auto'
        }
      },
      required: ['text', 'target_language']
    }
  },

  summarize: {
    name: 'summarize',
    description: '긴 텍스트를 지정된 길이로 요약합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '요약할 텍스트 내용'
        },
        max_length: {
          type: 'number',
          description: '요약 최대 길이 (단어 수)',
          default: 150
        },
        style: {
          type: 'string',
          description: '요약 스타일',
          enum: ['bullet-points', 'paragraph', 'keywords'],
          default: 'paragraph'
        },
        language: {
          type: 'string',
          description: '출력 언어 코드',
          default: 'ko'
        }
      },
      required: ['text']
    }
  },

  calendar_event: {
    name: 'calendar_event',
    description: '캘린더에 새 이벤트를 생성합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: '이벤트 제목'
        },
        start_time: {
          type: 'string',
          description: '시작 시간 (ISO 8601 형식, 예: 2025-01-15T09:00:00+09:00)'
        },
        end_time: {
          type: 'string',
          description: '종료 시간 (ISO 8601 형식)'
        },
        description: {
          type: 'string',
          description: '이벤트 설명'
        },
        location: {
          type: 'string',
          description: '이벤트 장소'
        },
        attendees: {
          type: 'array',
          description: '참석자 이메일 목록',
          items: { type: 'string' }
        },
        reminder_minutes: {
          type: 'number',
          description: '알림 시간 (분 전)',
          default: 15
        }
      },
      required: ['title', 'start_time', 'end_time']
    }
  }
};

// ============================================================
//  MOCK RESPONSE GENERATORS
// ============================================================
const MOCK_GENERATORS = {
  file_read: (inputs) => ({
    content: `# ${inputs.path || 'example.md'}\n\n이것은 파일 내용의 모의 데이터입니다.\n생성 시간: ${new Date().toISOString()}\n인코딩: ${inputs.encoding || 'utf-8'}`,
    bytes_read: 1248,
    encoding: inputs.encoding || 'utf-8',
    last_modified: new Date(Date.now() - 86400000).toISOString()
  }),

  file_write: (inputs) => ({
    success: true,
    path: inputs.path || '/tmp/output.txt',
    bytes_written: (inputs.content || '').length,
    created_dirs: inputs.create_dirs !== false ? [] : undefined,
    timestamp: new Date().toISOString()
  }),

  web_search: (inputs) => ({
    query: inputs.query || '',
    total_results: 128400,
    results: [
      { title: `${inputs.query} - 공식 문서`, url: 'https://docs.example.com/search', snippet: '공식 문서에서 상세한 정보를 확인하세요...', relevance: 0.98 },
      { title: `${inputs.query} 튜토리얼 및 예제`, url: 'https://tutorial.example.com', snippet: '단계별 튜토리얼과 실용적인 예제를 제공합니다...', relevance: 0.91 },
      { title: `${inputs.query} GitHub 리포지토리`, url: 'https://github.com/example', snippet: '오픈소스 구현체 및 커뮤니티 기여...', relevance: 0.87 }
    ].slice(0, inputs.max_results || 3),
    language: inputs.language || 'ko',
    search_time_ms: Math.floor(Math.random() * 200) + 50
  }),

  database_query: (inputs) => ({
    rows: [
      { id: 1, name: '홍길동', email: 'hong@example.com', created_at: '2025-01-01T00:00:00Z' },
      { id: 2, name: '김철수', email: 'kim@example.com', created_at: '2025-01-02T00:00:00Z' },
      { id: 3, name: '이영희', email: 'lee@example.com', created_at: '2025-01-03T00:00:00Z' }
    ],
    row_count: 3,
    affected_rows: 0,
    execution_time_ms: Math.floor(Math.random() * 50) + 5,
    query: inputs.sql || 'SELECT * FROM users'
  }),

  api_call: (inputs) => ({
    status: 200,
    status_text: 'OK',
    headers: {
      'content-type': 'application/json',
      'x-request-id': `req_${Math.random().toString(36).slice(2, 11)}`,
      'x-response-time': `${Math.floor(Math.random() * 100) + 20}ms`
    },
    body: {
      success: true,
      data: { message: '요청이 성공적으로 처리되었습니다.', timestamp: new Date().toISOString() },
      url: inputs.url || 'https://api.example.com',
      method: inputs.method || 'GET'
    },
    latency_ms: Math.floor(Math.random() * 200) + 30
  }),

  code_execute: (inputs) => ({
    stdout: inputs.language === 'python'
      ? 'Hello, World!\n처리 완료: 42\n[1, 2, 3, 4, 5]'
      : inputs.language === 'javascript'
      ? 'Hello, World!\n{ result: 42, items: [ 1, 2, 3 ] }'
      : '코드 실행 결과가 여기에 표시됩니다.',
    stderr: '',
    exit_code: 0,
    execution_time_ms: Math.floor(Math.random() * 500) + 100,
    memory_used_mb: Math.floor(Math.random() * 50) + 10,
    language: inputs.language || 'python'
  }),

  image_generate: (inputs) => ({
    images: Array.from({ length: inputs.num_images || 1 }, (_, i) => ({
      id: `img_${Math.random().toString(36).slice(2, 11)}`,
      url: `https://cdn.example.com/generated/${Date.now()}_${i}.png`,
      width: inputs.width || 1024,
      height: inputs.height || 1024,
      format: 'png'
    })),
    prompt: inputs.prompt || '',
    style: inputs.style || 'realistic',
    generation_time_ms: Math.floor(Math.random() * 3000) + 2000,
    seed: Math.floor(Math.random() * 99999999)
  }),

  translate: (inputs) => ({
    original_text: inputs.text || '',
    translated_text: `[번역됨] ${inputs.text || ''}`,
    source_language: inputs.source_language === 'auto' ? 'ko' : (inputs.source_language || 'ko'),
    target_language: inputs.target_language || 'en',
    confidence: 0.97,
    characters_translated: (inputs.text || '').length,
    formality: inputs.formality || 'auto'
  }),

  summarize: (inputs) => ({
    summary: inputs.style === 'bullet-points'
      ? '• 첫 번째 핵심 포인트입니다.\n• 두 번째 중요한 내용입니다.\n• 세 번째 결론 및 시사점입니다.'
      : '제공된 텍스트의 핵심 내용을 요약하면, 주요 개념과 아이디어가 명확하게 전달됩니다. 이 요약은 원본 텍스트의 핵심을 보존하면서 간결하게 표현하였습니다.',
    original_length: (inputs.text || '').length,
    summary_length: 150,
    compression_ratio: 0.15,
    language: inputs.language || 'ko',
    style: inputs.style || 'paragraph'
  }),

  calendar_event: (inputs) => ({
    event_id: `evt_${Math.random().toString(36).slice(2, 11)}`,
    title: inputs.title || '',
    start_time: inputs.start_time || new Date().toISOString(),
    end_time: inputs.end_time || new Date(Date.now() + 3600000).toISOString(),
    location: inputs.location || null,
    attendees_invited: (inputs.attendees || []).length,
    calendar_url: `https://calendar.example.com/event/evt_${Math.random().toString(36).slice(2, 9)}`,
    reminder_set: true,
    created_at: new Date().toISOString()
  })
};

// ============================================================
//  JSON SYNTAX HIGHLIGHTER
// ============================================================
function highlightJSON(code) {
  if (!code) return '';

  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped.replace(
    /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}\[\],:])/g,
    (match) => {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          return `<span class="jk">${match}</span>`;
        }
        return `<span class="js">${match}</span>`;
      }
      if (/true|false/.test(match)) return `<span class="jb">${match}</span>`;
      if (/null/.test(match))       return `<span class="jnl">${match}</span>`;
      if (/^-?\d/.test(match))      return `<span class="jn">${match}</span>`;
      return `<span class="jp">${match}</span>`;
    }
  );
}

// ============================================================
//  JSON VALIDATOR (MCP spec)
// ============================================================
function validateMCPSchema(obj) {
  const errors = [];
  const warnings = [];

  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    errors.push('루트 값은 JSON 객체여야 합니다.');
    return { errors, warnings };
  }

  // name
  if (!('name' in obj)) {
    errors.push('"name" 필드가 없습니다. MCP 툴은 반드시 이름이 있어야 합니다.');
  } else if (typeof obj.name !== 'string') {
    errors.push('"name" 필드는 문자열이어야 합니다.');
  } else if (obj.name.trim() === '') {
    errors.push('"name" 필드가 빈 문자열입니다.');
  } else if (!/^[a-z_][a-z0-9_]*$/.test(obj.name)) {
    warnings.push('"name" 은 소문자, 숫자, 밑줄만 사용하는 것을 권장합니다 (snake_case).');
  }

  // description
  if (!('description' in obj)) {
    warnings.push('"description" 필드가 없습니다. 툴의 기능을 설명하는 것을 권장합니다.');
  } else if (typeof obj.description !== 'string') {
    errors.push('"description" 필드는 문자열이어야 합니다.');
  } else if (obj.description.length < 10) {
    warnings.push('"description" 이 너무 짧습니다. 더 구체적인 설명을 권장합니다.');
  }

  // inputSchema
  if (!('inputSchema' in obj)) {
    errors.push('"inputSchema" 필드가 없습니다. MCP 툴은 입력 스키마가 필요합니다.');
  } else {
    const schema = obj.inputSchema;
    if (typeof schema !== 'object' || schema === null) {
      errors.push('"inputSchema" 는 객체여야 합니다.');
    } else {
      if (schema.type !== 'object') {
        errors.push('"inputSchema.type" 은 반드시 "object" 여야 합니다.');
      }

      if (!('properties' in schema)) {
        warnings.push('"inputSchema.properties" 가 없습니다. 입력 파라미터를 정의하세요.');
      } else if (typeof schema.properties !== 'object' || Array.isArray(schema.properties)) {
        errors.push('"inputSchema.properties" 는 객체여야 합니다.');
      } else {
        const props = schema.properties;
        for (const [key, val] of Object.entries(props)) {
          if (typeof val !== 'object' || val === null) {
            errors.push(`"properties.${key}" 는 객체(JSON Schema)여야 합니다.`);
            continue;
          }
          if (!('type' in val) && !('$ref' in val) && !('anyOf' in val) && !('oneOf' in val)) {
            warnings.push(`"properties.${key}" 에 "type" 이 없습니다.`);
          }
          if (!('description' in val)) {
            warnings.push(`"properties.${key}" 에 "description" 이 없습니다. 각 파라미터에 설명을 추가하세요.`);
          }
        }
      }

      if ('required' in schema) {
        if (!Array.isArray(schema.required)) {
          errors.push('"inputSchema.required" 는 배열이어야 합니다.');
        } else {
          for (const req of schema.required) {
            if (typeof req !== 'string') {
              errors.push('"required" 배열의 모든 항목은 문자열이어야 합니다.');
            } else if (schema.properties && !(req in schema.properties)) {
              errors.push(`"required" 의 "${req}" 가 "properties" 에 정의되어 있지 않습니다.`);
            }
          }
        }
      }

      const knownKeys = ['type', 'properties', 'required', 'additionalProperties', 'description', '$schema'];
      const unknown = Object.keys(schema).filter(k => !knownKeys.includes(k));
      if (unknown.length > 0) {
        warnings.push(`"inputSchema" 에 알 수 없는 필드가 있습니다: ${unknown.join(', ')}`);
      }
    }
  }

  const knownTopKeys = ['name', 'description', 'inputSchema'];
  const unknownTop = Object.keys(obj).filter(k => !knownTopKeys.includes(k));
  if (unknownTop.length > 0) {
    warnings.push(`알 수 없는 최상위 필드: ${unknownTop.join(', ')}`);
  }

  return { errors, warnings };
}

// ============================================================
//  FORM RENDERER
// ============================================================
function renderForm(schema) {
  const container = document.getElementById('formBuilderContainer');

  if (!schema || typeof schema !== 'object' || !schema.name) {
    container.innerHTML = `<div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="9" x2="9" y2="21"></line></svg>
      <p>스키마를 입력하거나 템플릿을 선택하면<br/>폼이 자동으로 렌더링됩니다.</p>
    </div>`;
    return;
  }

  const props = (schema.inputSchema && schema.inputSchema.properties) || {};
  const required = (schema.inputSchema && schema.inputSchema.required) || [];

  let fieldsHtml = '';
  for (const [key, def] of Object.entries(props)) {
    const isRequired = required.includes(key);
    const type = def.type || 'string';
    const desc = def.description || '';
    const defaultVal = def.default !== undefined ? def.default : '';
    const hasEnum = Array.isArray(def.enum);

    let inputHtml = '';
    if (hasEnum) {
      const options = def.enum.map(v =>
        `<option value="${esc(String(v))}"${v === defaultVal ? ' selected' : ''}>${esc(String(v))}</option>`
      ).join('');
      inputHtml = `<select class="form-select" data-field="${esc(key)}" id="field_${esc(key)}">
        <option value="">-- 선택 --</option>
        ${options}
      </select>`;
    } else if (type === 'boolean') {
      const checked = defaultVal === true ? 'checked' : '';
      inputHtml = `<label class="form-checkbox-row">
        <input type="checkbox" data-field="${esc(key)}" id="field_${esc(key)}" ${checked} />
        <span>${desc || key}</span>
      </label>`;
    } else if (type === 'number' || type === 'integer') {
      inputHtml = `<input type="number" class="form-input" data-field="${esc(key)}" id="field_${esc(key)}"
        placeholder="${esc(String(defaultVal || ''))}"
        value="${esc(String(defaultVal || ''))}" />`;
    } else if (type === 'array' || type === 'object') {
      inputHtml = `<textarea class="form-textarea" data-field="${esc(key)}" id="field_${esc(key)}"
        placeholder="${type === 'array' ? '["항목1", "항목2"]' : '{"key": "value"}'}" rows="3"></textarea>`;
    } else {
      // string — use textarea if likely long content
      const isLong = key === 'content' || key === 'code' || key === 'text' || key === 'sql' || key === 'body';
      if (isLong) {
        inputHtml = `<textarea class="form-textarea" data-field="${esc(key)}" id="field_${esc(key)}"
          placeholder="${esc(desc || key)}" rows="4"></textarea>`;
      } else {
        inputHtml = `<input type="text" class="form-input" data-field="${esc(key)}" id="field_${esc(key)}"
          placeholder="${esc(desc || key)}"
          value="${esc(String(defaultVal || ''))}" />`;
      }
    }

    fieldsHtml += `
      <div class="form-field">
        <label class="field-label" for="field_${esc(key)}">
          <span class="fname">${esc(key)}</span>
          <span class="ftype">${esc(type)}</span>
          ${isRequired ? '<span class="required-star">*</span>' : ''}
        </label>
        ${desc ? `<div class="field-desc">${esc(desc)}</div>` : ''}
        ${inputHtml}
      </div>`;
  }

  if (!fieldsHtml) {
    fieldsHtml = `<div class="empty-state" style="min-height:80px">
      <p style="font-size:12px">이 툴은 입력 파라미터가 없습니다.</p>
    </div>`;
  }

  container.innerHTML = `
    <div class="tool-card">
      <div class="tool-card-header">
        <div>
          <div class="tool-name">${esc(schema.name)}</div>
          ${schema.description ? `<div class="tool-desc">${esc(schema.description)}</div>` : ''}
        </div>
        <span class="tool-badge">MCP Tool</span>
      </div>
      <div class="form-fields" id="generatedForm">
        ${fieldsHtml}
      </div>
    </div>`;
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getFormValues() {
  const fields = document.querySelectorAll('#generatedForm [data-field]');
  const values = {};
  fields.forEach(el => {
    const key = el.dataset.field;
    if (el.type === 'checkbox') {
      values[key] = el.checked;
    } else if (el.tagName === 'TEXTAREA') {
      const raw = el.value.trim();
      if (!raw) return;
      try {
        values[key] = JSON.parse(raw);
      } catch {
        values[key] = raw;
      }
    } else {
      const val = el.value.trim();
      if (!val) return;
      const numVal = Number(val);
      if (el.type === 'number' && !isNaN(numVal)) {
        values[key] = numVal;
      } else {
        values[key] = val;
      }
    }
  });
  return values;
}

// ============================================================
//  SIMULATION ENGINE
// ============================================================
function buildMCPRequest(schema, inputs) {
  return {
    jsonrpc: '2.0',
    id: Math.floor(Math.random() * 900000) + 100000,
    method: 'tools/call',
    params: {
      name: schema.name,
      arguments: inputs
    }
  };
}

function buildMCPResponse(schema, inputs, latencyMs) {
  const generator = MOCK_GENERATORS[schema.name];
  const content = generator ? generator(inputs) : { result: '모의 응답 데이터', timestamp: new Date().toISOString() };

  return {
    jsonrpc: '2.0',
    id: null,
    result: {
      content: [
        {
          type: 'text',
          text: JSON.stringify(content, null, 2)
        }
      ],
      isError: false,
      _meta: {
        tool: schema.name,
        latency_ms: latencyMs,
        timestamp: new Date().toISOString(),
        server: 'mcp-playground-simulator/1.0'
      }
    }
  };
}

async function runSimulation(schema, inputs) {
  const latency = Math.floor(Math.random() * 1900) + 100;
  const wrap = document.getElementById('simProgressWrap');
  const fill = document.getElementById('simProgressFill');
  const statusText = document.getElementById('simStatusText');
  const latencyText = document.getElementById('simLatencyText');
  const latencyBadge = document.getElementById('latencyBadge');
  const reqEl = document.getElementById('simRequest');
  const resEl = document.getElementById('simResponse');

  wrap.style.display = 'flex';
  latencyBadge.style.display = 'none';
  fill.style.width = '0%';
  statusText.textContent = '요청 전송 중...';
  latencyText.textContent = `예상 ${latency}ms`;

  const request = buildMCPRequest(schema, inputs);
  reqEl.innerHTML = highlightJSON(JSON.stringify(request, null, 2));

  resEl.innerHTML = '<span class="code-placeholder">응답 대기 중...</span>';

  // Animate progress bar
  const steps = 20;
  const stepMs = latency / steps;
  for (let i = 1; i <= steps; i++) {
    await sleep(stepMs);
    fill.style.width = `${(i / steps) * 100}%`;
    if (i === Math.floor(steps * 0.4)) statusText.textContent = '처리 중...';
    if (i === Math.floor(steps * 0.8)) statusText.textContent = '응답 수신 중...';
  }

  const response = buildMCPResponse(schema, inputs, latency);
  resEl.innerHTML = highlightJSON(JSON.stringify(response, null, 2));

  statusText.textContent = '완료';
  latencyText.textContent = '';
  latencyBadge.style.display = 'inline';
  latencyBadge.textContent = `${latency}ms`;

  setTimeout(() => {
    wrap.style.display = 'none';
    fill.style.width = '0%';
  }, 1500);

  showToast(`시뮬레이션 완료 (${latency}ms)`, 'success');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
//  LINE NUMBERS
// ============================================================
function updateLineNumbers(textarea) {
  const lineEl = document.getElementById('lineNumbers');
  const lines = (textarea.value.match(/\n/g) || []).length + 1;
  let html = '';
  for (let i = 1; i <= lines; i++) html += i + '\n';
  lineEl.textContent = html;
  lineEl.scrollTop = textarea.scrollTop;
}

// ============================================================
//  SYNTAX HIGHLIGHT OVERLAY SYNC
// ============================================================
function updateHighlight(textarea) {
  const overlay = document.getElementById('syntaxHighlight');
  overlay.innerHTML = highlightJSON(textarea.value);
  overlay.scrollTop = textarea.scrollTop;
  overlay.scrollLeft = textarea.scrollLeft;
}

// ============================================================
//  VALIDATION UI
// ============================================================
function runValidation(source) {
  let parsed = null;
  const errors = [];
  const warnings = [];

  try {
    parsed = JSON.parse(source);
  } catch (e) {
    errors.push('JSON 파싱 오류: ' + e.message);
  }

  if (parsed !== null) {
    const result = validateMCPSchema(parsed);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  const list = document.getElementById('validationList');
  const errCount = document.getElementById('vsErrorCount');
  const warnCount = document.getElementById('vsWarnCount');
  const okMsg = document.getElementById('vsOkMsg');

  list.innerHTML = '';
  errCount.textContent = `오류 ${errors.length}`;
  warnCount.textContent = `경고 ${warnings.length}`;

  if (errors.length === 0 && warnings.length === 0) {
    okMsg.style.display = 'inline';
    okMsg.textContent = '스키마 유효함';
    const li = document.createElement('li');
    li.className = 'vitem ok';
    li.textContent = 'MCP Tool Schema 검증을 통과했습니다. 모든 필수 필드가 올바르게 정의되어 있습니다.';
    list.appendChild(li);
    showToast('스키마 검증 통과', 'success');
  } else {
    okMsg.style.display = errors.length === 0 ? 'inline' : 'none';
    if (errors.length === 0) okMsg.textContent = '경고만 있음';

    errors.forEach(msg => {
      const li = document.createElement('li');
      li.className = 'vitem error';
      li.textContent = msg;
      list.appendChild(li);
    });
    warnings.forEach(msg => {
      const li = document.createElement('li');
      li.className = 'vitem warning';
      li.textContent = msg;
      list.appendChild(li);
    });

    if (errors.length > 0) {
      showToast(`검증 실패: 오류 ${errors.length}개`, 'error');
    } else {
      showToast(`경고 ${warnings.length}개 발견`, 'warning');
    }
  }

  // Expand the panel
  const panel = document.getElementById('validationPanel');
  panel.classList.remove('collapsed');
  panel.classList.add('expanded');
  document.getElementById('valChevron').style.transform = '';

  return parsed;
}

// ============================================================
//  TOAST
// ============================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = {
    success: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    error:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    warning: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    info:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
  }[type] || '';

  toast.innerHTML = icon + message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================================
//  EXPORT
// ============================================================
function copySchema() {
  const editor = document.getElementById('schemaEditor');
  const text = editor.value.trim();
  if (!text) { showToast('복사할 내용이 없습니다.', 'warning'); return; }
  navigator.clipboard.writeText(text)
    .then(() => showToast('클립보드에 복사되었습니다.', 'success'))
    .catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      showToast('클립보드에 복사되었습니다.', 'success');
    });
}

function downloadSchema() {
  const editor = document.getElementById('schemaEditor');
  const text = editor.value.trim();
  if (!text) { showToast('내보낼 내용이 없습니다.', 'warning'); return; }

  let filename = 'mcp-tool.json';
  try {
    const obj = JSON.parse(text);
    if (obj.name) filename = `${obj.name}.json`;
  } catch {}

  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`${filename} 다운로드 중...`, 'success');
}

// ============================================================
//  RESIZER (drag to resize panes)
// ============================================================
function initResizers() {
  const r1 = document.getElementById('resizer1');
  const r2 = document.getElementById('resizer2');
  const pEditor = document.getElementById('paneEditor');
  const pForm   = document.getElementById('paneForm');
  const pSim    = document.getElementById('paneSim');

  function makeResizer(resizerEl, leftPane, rightPane) {
    let startX = 0, startLeft = 0, startRight = 0;

    resizerEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startX = e.clientX;
      startLeft = leftPane.getBoundingClientRect().width;
      startRight = rightPane.getBoundingClientRect().width;
      resizerEl.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      function onMove(e) {
        const dx = e.clientX - startX;
        const newLeft = Math.max(140, startLeft + dx);
        const newRight = Math.max(140, startRight - dx);
        const total = newLeft + newRight;
        leftPane.style.flex = `0 0 ${newLeft}px`;
        rightPane.style.flex = `0 0 ${newRight}px`;
      }

      function onUp() {
        resizerEl.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  makeResizer(r1, pEditor, pForm);
  makeResizer(r2, pForm, pSim);
}

// ============================================================
//  THEME TOGGLE
// ============================================================
function initThemeToggle() {
  const btn = document.getElementById('btnTheme');
  const sun = document.getElementById('iconSun');
  const moon = document.getElementById('iconMoon');

  const saved = localStorage.getItem('mcp-theme') || 'dark';
  applyTheme(saved);

  btn.addEventListener('click', () => {
    const current = document.body.classList.contains('dark') ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('mcp-theme', next);
  });

  function applyTheme(theme) {
    document.body.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('light', theme === 'light');
    sun.style.display  = theme === 'light' ? 'block' : 'none';
    moon.style.display = theme === 'dark'  ? 'block' : 'none';
  }
}

// ============================================================
//  VALIDATION PANEL TOGGLE
// ============================================================
function initValidationPanel() {
  const toggle = document.getElementById('validationToggle');
  const panel  = document.getElementById('validationPanel');
  const chevron = document.getElementById('valChevron');

  toggle.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('collapsed');
    if (collapsed) {
      panel.classList.remove('expanded');
      chevron.style.transform = 'rotate(180deg)';
    } else {
      chevron.style.transform = '';
    }
  });
}

// ============================================================
//  FORMAT JSON
// ============================================================
function formatJSON() {
  const editor = document.getElementById('schemaEditor');
  try {
    const parsed = JSON.parse(editor.value);
    editor.value = JSON.stringify(parsed, null, 2);
    updateLineNumbers(editor);
    updateHighlight(editor);
    showToast('JSON 포맷 완료', 'success');
  } catch (e) {
    showToast('포맷 실패: 유효하지 않은 JSON입니다.', 'error');
  }
}

// ============================================================
//  AUTO-PARSE AND RENDER ON EDITOR CHANGE
// ============================================================
let parseDebounce = null;
function onEditorChange(editor) {
  updateLineNumbers(editor);
  updateHighlight(editor);

  clearTimeout(parseDebounce);
  parseDebounce = setTimeout(() => {
    try {
      const parsed = JSON.parse(editor.value);
      renderForm(parsed);
    } catch {
      // Don't re-render if invalid
    }
  }, 400);
}

// ============================================================
//  MAIN INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const editor = document.getElementById('schemaEditor');

  // Sync scroll between textarea and overlay
  editor.addEventListener('scroll', () => {
    document.getElementById('syntaxHighlight').scrollTop = editor.scrollTop;
    document.getElementById('syntaxHighlight').scrollLeft = editor.scrollLeft;
    document.getElementById('lineNumbers').scrollTop = editor.scrollTop;
  });

  editor.addEventListener('input', () => onEditorChange(editor));
  editor.addEventListener('keydown', (e) => {
    // Tab key -> insert 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editor.selectionStart;
      const end   = editor.selectionEnd;
      editor.value = editor.value.slice(0, start) + '  ' + editor.value.slice(end);
      editor.selectionStart = editor.selectionEnd = start + 2;
      onEditorChange(editor);
    }
  });

  // Template selector
  document.getElementById('templateSelect').addEventListener('change', (e) => {
    const key = e.target.value;
    if (!key) return;
    const tpl = TEMPLATES[key];
    if (!tpl) return;
    editor.value = JSON.stringify(tpl, null, 2);
    onEditorChange(editor);
    renderForm(tpl);
    showToast(`템플릿 "${tpl.name}" 로드됨`, 'info');
  });

  // Validate button
  document.getElementById('btnValidate').addEventListener('click', () => {
    runValidation(editor.value);
  });

  // Format button
  document.getElementById('btnFormat').addEventListener('click', formatJSON);

  // Copy / Download
  document.getElementById('btnCopy').addEventListener('click', copySchema);
  document.getElementById('btnDownload').addEventListener('click', downloadSchema);

  // Execute simulation
  document.getElementById('btnExecute').addEventListener('click', () => {
    let schema = null;
    try {
      schema = JSON.parse(editor.value);
    } catch {
      showToast('유효하지 않은 JSON 스키마입니다.', 'error');
      return;
    }
    if (!schema || !schema.name) {
      showToast('스키마에 "name" 필드가 없습니다.', 'error');
      return;
    }
    const inputs = getFormValues();
    runSimulation(schema, inputs);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl+Enter → Validate
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runValidation(editor.value);
    }
    // Ctrl+Shift+E → Export (copy)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      copySchema();
    }
    // Ctrl+Shift+F → Format
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      formatJSON();
    }
  });

  // Paste → auto-format JSON
  editor.addEventListener('paste', () => {
    setTimeout(() => {
      try {
        const parsed = JSON.parse(editor.value);
        editor.value = JSON.stringify(parsed, null, 2);
      } catch {}
      onEditorChange(editor);
    }, 0);
  });

  // Init sub-systems
  initResizers();
  initThemeToggle();
  initValidationPanel();

  // Load default template
  const defaultKey = 'web_search';
  const defaultTpl = TEMPLATES[defaultKey];
  editor.value = JSON.stringify(defaultTpl, null, 2);
  document.getElementById('templateSelect').value = defaultKey;
  onEditorChange(editor);
  renderForm(defaultTpl);
});
