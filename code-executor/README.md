# Engunity AI Code Executor Backend

Secure Docker-based code execution service with WebSocket support for real-time output streaming.

## Features

- 🐳 **Docker-based sandboxed execution** - Secure, isolated code execution
- ⚡ **Real-time WebSocket streaming** - Live output updates
- 🔐 **JWT Authentication** - Secure user authentication
- 📊 **MongoDB database** - Project and execution history storage
- 🚀 **Multi-language support** - Python, JavaScript, TypeScript, Java, C++, C, Go, Rust
- 📝 **Execution logging** - Track all code executions
- 🛡️ **Rate limiting** - Prevent abuse
- 🔄 **Auto-cleanup** - Automatic container and file cleanup

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- MongoDB (via Docker or external)

## Quick Start

### 1. Installation

```bash
cd code-executor
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/engunity-code-editor
JWT_SECRET=your-secret-key-change-in-production
FRONTEND_URL=http://localhost:3000
```

### 3. Start MongoDB

```bash
docker run -d -p 27017:27017 --name engunity-mongo mongo:7.0
```

### 4. Run Development Server

```bash
npm run dev
```

The server will start on `http://localhost:4000`

## Docker Compose (Recommended)

From the root directory:

```bash
docker-compose up -d
```

This starts:
- MongoDB on port 27017
- Code Executor Backend on port 4000
- Frontend on port 3000

## API Endpoints

### Code Execution

#### Execute Code (REST)
```bash
POST /api/execute
Content-Type: application/json

{
  "code": "print('Hello, World!')",
  "language": "python",
  "timeout": 30000
}
```

Response:
```json
{
  "success": true,
  "output": "Hello, World!\n",
  "error": "",
  "executionTime": 245,
  "exitCode": 0,
  "status": "success",
  "memoryUsed": 8388608
}
```

#### Health Check
```bash
GET /api/execute/health
```

### Authentication

#### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "john",
  "email": "john@example.com",
  "password": "securepassword"
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword"
}
```

#### Get Current User
```bash
GET /api/auth/me
Authorization: Bearer <token>
```

### Projects

#### List Projects
```bash
GET /api/projects
Authorization: Bearer <token>
```

#### Get Project
```bash
GET /api/projects/:id
Authorization: Bearer <token>
```

#### Create Project
```bash
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Project",
  "description": "Project description",
  "language": "python",
  "files": []
}
```

#### Update Project
```bash
PUT /api/projects/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Project",
  "files": [...]
}
```

#### Delete Project
```bash
DELETE /api/projects/:id
Authorization: Bearer <token>
```

#### Add/Update File
```bash
POST /api/projects/:id/files
Authorization: Bearer <token>
Content-Type: application/json

{
  "path": "main.py",
  "content": "print('Hello')",
  "language": "python"
}
```

## WebSocket Events

Connect to `ws://localhost:4000`

### Client Events

#### Execute Code
```javascript
socket.emit('execute-code', {
  code: 'print("Hello")',
  language: 'python',
  timeout: 30000
});
```

### Server Events

#### Execution Start
```javascript
socket.on('execution-start', (data) => {
  console.log('Execution started', data);
});
```

#### Execution Complete
```javascript
socket.on('execution-complete', (result) => {
  console.log('Output:', result.output);
  console.log('Execution time:', result.executionTime);
});
```

#### Execution Error
```javascript
socket.on('execution-error', ({ error }) => {
  console.error('Execution failed:', error);
});
```

## Supported Languages

| Language   | Image              | Command                                  |
|------------|--------------------|-----------------------------------------|
| Python     | python:3.11-slim   | `python /workspace/main.py`             |
| JavaScript | node:20-slim       | `node /workspace/main.js`               |
| TypeScript | node:20-slim       | `npx ts-node /workspace/main.ts`        |
| Java       | openjdk:21-slim    | `javac Main.java && java Main`          |
| C++        | gcc:latest         | `g++ main.cpp -o main && ./main`        |
| C          | gcc:latest         | `gcc main.c -o main && ./main`          |
| Go         | golang:1.21-alpine | `go run /workspace/main.go`             |
| Rust       | rust:latest        | `rustc main.rs -o main && ./main`       |

## Security Features

- ✅ Docker sandboxing with no network access
- ✅ Memory and CPU limits
- ✅ Execution timeout (30s default)
- ✅ Read-only root filesystem
- ✅ Automatic container cleanup
- ✅ Rate limiting
- ✅ JWT authentication
- ✅ Input validation

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4000 | Server port |
| `MONGODB_URI` | mongodb://localhost:27017/engunity-code-editor | MongoDB connection string |
| `JWT_SECRET` | - | Secret for JWT tokens |
| `JWT_EXPIRES_IN` | 7d | Token expiration |
| `MAX_EXECUTION_TIME` | 30000 | Max execution time (ms) |
| `MAX_MEMORY_MB` | 512 | Max memory per execution (MB) |
| `MAX_OUTPUT_SIZE` | 1048576 | Max output size (bytes) |
| `RATE_LIMIT_WINDOW_MS` | 900000 | Rate limit window (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Max requests per window |

## Development

### Build TypeScript
```bash
npm run build
```

### Run Production
```bash
npm start
```

### Docker Build
```bash
docker build -t engunity-code-executor .
docker run -p 4000:4000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/engunity \
  engunity-code-executor
```

## Logs

Logs are stored in `./logs`:
- `error.log` - Error logs only
- `combined.log` - All logs

## Troubleshooting

### Docker not available
```bash
# Check Docker is running
docker ps

# Check Docker socket permissions
ls -la /var/run/docker.sock
```

### MongoDB connection failed
```bash
# Start MongoDB
docker run -d -p 27017:27017 mongo:7.0

# Check connection
mongosh mongodb://localhost:27017
```

### Port already in use
```bash
# Find process using port 4000
lsof -i :4000

# Kill the process
kill -9 <PID>
```

## License

MIT
