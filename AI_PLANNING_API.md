# API de Planejamento para Agentes de IA

Este guia explica, de forma prática, como um agente de IA externo pode **criar** e **atualizar** o cronograma (WBS) de uma OS no sistema OFFCON.

Base URL local:

`http://localhost:3001/api/planning`

---

## 1) Criar Cronograma em Lote (importação inicial)

Endpoint:

- `POST /ai/import`

Uso recomendado:

- Primeira geração do cronograma da OS.
- Cenário em que você quer enviar toda a estrutura WBS de uma vez.

### Payload

```json
{
  "os_id": 1,
  "clearExisting": true,
  "activities": [
    {
      "codigo": "1",
      "descricao": "Planejamento",
      "tipo": "resumo",
      "status": "pendente",
      "data_inicio": "2026-02-14",
      "data_fim": "2026-02-16",
      "responsavel": "Engenharia",
      "progresso": 0,
      "ordem": 1
    },
    {
      "codigo": "1.1",
      "parent_codigo": "1",
      "descricao": "Levantamento de materiais",
      "tipo": "entrega",
      "status": "pendente",
      "data_inicio": "2026-02-14",
      "data_fim": "2026-02-15",
      "responsavel": "Suprimentos",
      "progresso": 0,
      "ordem": 2
    }
  ]
}
```

### Regras

- `os_id`: obrigatório.
- `activities`: obrigatório (lista).
- `codigo`: obrigatório por atividade.
- `parent_codigo`: opcional; se existir, cria hierarquia.
- `clearExisting=true`: apaga atividades atuais da OS antes da importação.

### Exemplo cURL

```bash
curl -X POST "http://localhost:3001/api/planning/ai/import" \
  -H "Content-Type: application/json" \
  -d '{
    "os_id": 1,
    "clearExisting": true,
    "activities": [
      { "codigo": "1", "descricao": "Planejamento", "tipo": "resumo" },
      { "codigo": "1.1", "parent_codigo": "1", "descricao": "Levantamento de materiais", "tipo": "entrega" }
    ]
  }'
```

---

## 2) Atualizar Cronograma de Forma Incremental (novo endpoint)

Endpoint:

- `POST /ai/update`

Uso recomendado:

- Agente de IA revisando cronograma existente.
- Upsert por `codigo` (cria se não existir, atualiza se existir).
- Remoções específicas ou sincronização total.

### Payload

```json
{
  "os_id": 1,
  "activities": [
    {
      "codigo": "1",
      "descricao": "Planejamento detalhado",
      "status": "em_andamento",
      "progresso": 40,
      "ordem": 1
    },
    {
      "codigo": "1.2",
      "parent_codigo": "1",
      "descricao": "Inspeção de recebimento",
      "tipo": "entrega",
      "status": "pendente",
      "data_inicio": "2026-02-17",
      "data_fim": "2026-02-18",
      "responsavel": "Qualidade",
      "progresso": 0,
      "ordem": 3
    }
  ],
  "remove_codes": ["3.4", "7.2"],
  "delete_missing": false
}
```

### Comportamento do `POST /ai/update`

- **Upsert por `codigo`**:
  - Se o `codigo` já existe na OS: atualiza.
  - Se não existe: cria.
- **Hierarquia**:
  - Se `parent_codigo` vier no payload, o vínculo pai-filho é atualizado.
  - Se `parent_codigo` vier `null`, remove vínculo de pai.
- **Remoção explícita**:
  - `remove_codes`: remove as atividades informadas (com recursão nos filhos).
- **Sincronização completa opcional**:
  - `delete_missing=true`: remove do banco tudo que não veio em `activities`.

### Campos aceitos em `activities`

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| `codigo` | string | Sim | Chave técnica para upsert |
| `descricao` | string | Não | Se omitido em update, mantém valor atual |
| `parent_codigo` | string/null | Não | Atualiza hierarquia quando presente |
| `data_inicio` | `YYYY-MM-DD`/null | Não | |
| `data_fim` | `YYYY-MM-DD`/null | Não | |
| `status` | string | Não | `pendente`, `em_andamento`, `concluido`, `cancelado` |
| `progresso` | number | Não | Normalizado para 0..100 |
| `responsavel` | string/null | Não | |
| `tipo` | string | Não | `entrega`, `marco`, `resumo` |
| `ordem` | number | Não | Ordenação |

### Exemplo cURL (incremental)

```bash
curl -X POST "http://localhost:3001/api/planning/ai/update" \
  -H "Content-Type: application/json" \
  -d '{
    "os_id": 1,
    "activities": [
      {
        "codigo": "1",
        "descricao": "Planejamento detalhado",
        "status": "em_andamento",
        "progresso": 40
      },
      {
        "codigo": "1.2",
        "parent_codigo": "1",
        "descricao": "Inspeção de recebimento",
        "tipo": "entrega",
        "status": "pendente"
      }
    ],
    "remove_codes": ["9.9"],
    "delete_missing": false
  }'
```

### Exemplo de resposta

```json
{
  "success": true,
  "message": "Atualização de cronograma concluída com sucesso",
  "os_id": 1,
  "stats": {
    "created": 1,
    "updated": 1,
    "deleted": 1,
    "parentLinked": 1
  },
  "received": {
    "activities": 2,
    "remove_codes": 1,
    "delete_missing": false
  }
}
```

---

## 3) Fluxo recomendado para outro agente de IA

1. Buscar a OS alvo (id da OS).
2. Ler WBS atual:
   - `GET /wbs?os_id=<id>`
3. Decidir estratégia:
   - Geração completa inicial: usar `POST /ai/import` com `clearExisting=true`.
   - Ajuste incremental: usar `POST /ai/update`.
4. Enviar atualização.
5. Validar resultado:
   - `GET /wbs?os_id=<id>`
   - `GET /gantt?os_id=<id>`

---

## 4) Erros comuns e como evitar

- `os_id` ausente: sempre obrigatório.
- `codigo` duplicado no payload de update: não enviar duplicados.
- `parent_codigo` inválido: garantir que o pai exista no payload ou já exista na OS.
- Datas inválidas: usar formato `YYYY-MM-DD`.
- `delete_missing=true` sem querer: isso pode apagar atividades não enviadas.

---

## 5) Endpoint summary

- `POST /api/planning/ai/import` -> criação em lote (full import)
- `POST /api/planning/ai/update` -> atualização incremental (upsert + remoção)
- `GET /api/planning/wbs?os_id=<id>` -> leitura da árvore WBS
- `GET /api/planning/gantt?os_id=<id>` -> leitura para cronograma/Gantt

---

## 6) Assistente IA interno (com contexto WBS completo)

Endpoint novo para o Assistente IA:

- `POST /api/ai/planning-chat`

Objetivo:

- Permitir prompts como: `no item 3.2 ...`
- O backend injeta contexto completo da OS + WBS atual antes de chamar o modelo.
- A resposta volta como comando pronto para confirmação e execução no sistema.

### Payload de entrada

```json
{
  "message": "No item 3.2, mude o fim para 2026-03-10 e progresso para 60%",
  "os_id": 15,
  "provider": "groq",
  "model": "llama-3.3-70b-versatile"
}
```

`apiKey` é opcional quando Groq já está configurado no servidor (ver seção 7).

### Resposta (resumo)

```json
{
  "success": true,
  "message": "Atualizar planejamento da OS ...",
  "command": {
    "action": "PLANNING_UPDATE",
    "payload": {
      "os_id": 15,
      "activities": [...],
      "remove_codes": [],
      "delete_missing": false
    },
    "requires_confirmation": true
  }
}
```

Depois da confirmação, o frontend envia para:

- `POST /api/ai/execute`

E o backend aplica internamente em:

- `POST /api/planning/ai/update`

---

## 7) Groq padrão via `groq.txt`

O backend está configurado para usar `groq` como provider padrão.

Prioridade da chave:

1. `apiKey` enviada na requisição
2. variável de ambiente `GROQ_API_KEY`
3. arquivo `groq.txt` na raiz do projeto
4. arquivo `resources/groq.txt`

Formato esperado de `groq.txt`:

```txt
gsk_sua_chave_groq_aqui
```

Também aceita:

```txt
GROQ_API_KEY=gsk_sua_chave_groq_aqui
```

Observações:

- Pode ter linhas em branco.
- Linhas iniciadas com `#` são ignoradas.
- `groq.txt` já está no `.gitignore`.

Endpoint de status:

- `GET /api/ai/config-status`

Retorna se existe chave server-side e qual provider padrão está ativo.
