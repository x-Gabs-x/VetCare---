# VetCare — Backend (Integrante 1: Setup, Auth e Usuários)

Módulo responsável pela fundação do backend: setup do projeto, conexão com o
MongoDB, autenticação JWT e CRUD de usuários.

## Estrutura de pastas

```
vetcare-backend/
├── src/
│   ├── config/
│   │   └── db.js              # conexão com o MongoDB (Mongoose)
│   ├── models/
│   │   └── Usuario.js         # schema do usuário (com hash de senha)
│   ├── middlewares/
│   │   ├── auth.js            # verificarToken + autorizar (perfis)
│   │   └── errorHandler.js    # tratamento global de erros
│   ├── controllers/
│   │   ├── authController.js  # login
│   │   └── usuarioController.js # CRUD de usuários
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── usuarioRoutes.js
│   ├── utils/
│   │   └── asyncHandler.js
│   ├── app.js                 # configuração do Express
│   └── server.js              # ponto de entrada
├── .env.example
├── .gitignore
└── package.json
```

## Como rodar

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Copie o arquivo de variáveis de ambiente e ajuste os valores:
   ```bash
   cp .env.example .env
   ```
   - `MONGO_URI`: string de conexão do MongoDB (local ou Atlas)
   - `JWT_SECRET`: chave secreta para assinar o token
3. Suba o MongoDB localmente (ou use o Atlas) e rode o servidor:
   ```bash
   npm run dev   # com nodemon, reinicia sozinho a cada alteração
   # ou
   npm start
   ```
4. A API sobe em `http://localhost:3000` (health check em `GET /`).

## Endpoints implementados

| Método | Endpoint         | Protegido?              | Descrição                                            |
|--------|------------------|--------------------------|-------------------------------------------------------|
| POST   | /usuarios        | Público                 | Cadastra um novo usuário (tutor, vet, recepcionista)  |
| POST   | /auth/login      | Público                 | Autentica e retorna o token JWT                       |
| GET    | /usuarios        | Admin                   | Lista todos os usuários (aceita `?perfil=`)            |
| GET    | /usuarios/:id    | Admin                   | Consulta um usuário específico                         |
| PUT    | /usuarios/:id    | Autenticado (dono/admin)| Atualiza dados; só admin altera `perfil`/`ativo`        |
| DELETE | /usuarios/:id    | Admin                   | Remove um usuário                                       |

### Exemplo — cadastrar usuário

```bash
curl -X POST http://localhost:3000/usuarios \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Ana Souza",
    "email": "ana@exemplo.com",
    "senha": "123456",
    "perfil": "tutor"
  }'
```

### Exemplo — login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "ana@exemplo.com", "senha": "123456" }'
```

Resposta:
```json
{
  "token": "eyJhbGciOi...",
  "usuario": { "id": "...", "nome": "Ana Souza", "email": "ana@exemplo.com", "perfil": "tutor" }
}
```

### Exemplo — usando o token em rotas protegidas

```bash
curl http://localhost:3000/usuarios \
  -H "Authorization: Bearer <token>"
```

## Como os outros integrantes usam este módulo

Para proteger as rotas dos outros módulos (pets, consultas/vacinas,
agendamentos), basta importar o middleware `auth.js`:

```js
const { verificarToken, autorizar } = require('../middlewares/auth');

// Exige apenas estar logado
router.get('/pets', verificarToken, listarPets);

// Exige estar logado E ter um dos perfis informados
router.delete('/pets/:id', verificarToken, autorizar('veterinario', 'administrador'), removerPet);
```

Depois de autenticado, `req.usuario` fica disponível em qualquer rota
protegida com os dados `{ id, nome, email, perfil }` extraídos do token.

## Padrão de resposta de erro

Todos os erros seguem o formato `{ "erro": "mensagem explicando o problema" }`,
tratado centralmente em `middlewares/errorHandler.js`. Sigam esse mesmo
padrão nos demais módulos para manter consistência no projeto.
