// ws-bridge.mjs
import { spawn } from 'node:child_process';
import { WebSocket } from 'ws';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url); // 兼容 <20.11
const __dirname = path.dirname(__filename);
import { token } from './token.js'

const MCP_ENDPOINT = `wss://api.xiaozhi.me/mcp/?token=${token.token}`;
const serverCmd = 'node'; // 你的 MCP Server 启动命令
const serverArgs = [path.join(__dirname, 'mcp-server.js')]; // 你的 MCP Server 入口

const ws = new WebSocket(MCP_ENDPOINT);
const proc = spawn(serverCmd, serverArgs, { stdio: ['pipe', 'pipe', 'inherit'] });

ws.on('open', () => console.error('[Bridge] WS 已连接'));
ws.on('close', () => proc.kill());
ws.on('error', e => { console.error('[Bridge] WS 错误', e); proc.kill(); });

// 将 WS 消息写入子进程 stdin
ws.on('message', msg => {
    if (proc.stdin) proc.stdin.write(msg + '\n');
});

// 将子进程 stdout 转发回 WS
proc.stdout.on('data', chunk => {
    ws.send(chunk.toString());
});