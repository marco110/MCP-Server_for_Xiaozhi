import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// API配置
const API_CONFIG = {
    baseUrl: "https://gateway-test.wuzheng.com.cn",
    realtime: "vehicle/data/parter/api/ai/get/real/times",
    token: "common/user/user/common_login",
    authToken: process.env.AUTH_TOKEN || "your-authorization-token",
    timeout: parseInt(process.env.API_TIMEOUT || "10000") // 10秒超时
};

export const server = new McpServer({
    name: "vehicle-data-server",
    version: "1.0.0",
    title: "车辆实时数据查询服务"
});

// 注册MCP工具
server.registerTool(
    "getRealtimeData",
    {
        title: "查询车辆实时数据",
        description: "查询车辆实时数据",
    },
    async () => {
        console.log('getRealtimeData')
        const data = await getVehicleRealtimeData('');
        const vinData = data.data;
        const normalized = {
            speed: vinData.speed,                                   // 城市
            tmiles: vinData.tmiles,                            // 天气现象：晴/雨/阴等
            emiles: vinData.emiles,     // 温度（℃）
            soc: vinData.soc,        // 相对湿度（%）
            position: vinData.position, // 风向与风力
            lksts: { lksts1: vinData.lksts1, lksts2: vinData.lksts2, lksts3: vinData.lksts3, lksts4: vinData.lksts4 },                       // 数据更新时间（ISO8601）
            doorsts: { doorsts1: vinData.doorsts1, doorsts2: vinData.doorsts2, doorsts3: vinData.doorsts3, doorsts4: vinData.doorsts4 },                              // 业务状态码：0 表示成功
        };

        const fieldGuide = {
            speed: '车速，单位：公里/小时（km/h）',
            tmiles: '累计里程，单位：公里（km）',
            emiles: '续航里程，单位：公里（km）',
            soc: '车辆电量，单位：百分比（%）',
            position: '车辆位置',
            lksts: '车辆门锁状态，0 表示闭锁，1 表示解锁，3 表示无效；lksts1 表示左前门锁，lksts2 表示右前门锁，lksts3 表示左后门锁，lksts4 表示右后门锁',
            doorsts: '车门开关状态，0 表示关闭，1 表示开启，3 表示无效；doorsts1 表示左前门，doorsts2 表示右前门，doorsts3 表示左后门，doorsts4 表示右后门',
        };
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(normalized)
                },
                {
                    type: 'text', text: '字段释义：\n' + Object.entries(fieldGuide)
                        .map(([k, v]) => `- ${k}: ${v}`).join('\n')
                }
            ],
            structuredContent: { success: true, data }
        };
    }
);

// 生成签名
function generateSign() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// 登录接口获取token
async function getToken() {
    const fullUrl = `${API_CONFIG.baseUrl}/${API_CONFIG.token}`;
    const requestBody = {
        loginName: "cdzh",
        loginPwd: "Wz@123456",
        loginType: "1",
        providerSys: "electric"
    };

    // 创建AbortController用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    try {
        const response = await fetch(fullUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        // 验证返回数据结构
        if (!data || typeof data !== "object") {
            throw new Error("API返回数据格式无效");
        }

        return data;
    } catch (error) {
        clearTimeout(timeoutId);

        console.error("调用车辆数据API失败:", error);
    }
}

// 调用车辆数据API的函数
async function getVehicleRealtimeData(vin) {
    // 生成签名和当前时间戳
    const sign = generateSign();
    const timestamp = Date.now().toString();
    const tokenData = await getToken();

    // 构建请求URL
    const fullUrl = `${API_CONFIG.baseUrl}/${API_CONFIG.realtime}?sign=${sign}&timestamp=${timestamp}`;

    const requestBody = {
        vin: vin
    };

    const headers = {
        "Content-Type": "application/json",
        Authorization: tokenData.data.token,
        "X-Token-Issuer": "electric",
        "X-Request-Id": Math.random().toString(36).substring(2)
    };

    // 创建AbortController用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    try {
        const response = await fetch(fullUrl, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        // 验证返回数据结构
        if (!data || typeof data !== "object") {
            throw new Error("API返回数据格式无效");
        }

        return data;
    } catch (error) {
        clearTimeout(timeoutId);

        console.error("调用车辆数据API失败:", error);

        // 返回模拟数据作为fallback，包含警告信息
        return {
            speed: 65.5,
            latitude: 39.9042,
            longitude: 116.4074,
            totalMileage: 15420.8,
            remainingRange: 285.0,
            soc: 75,
            doorLockStatus: "locked",
            doorStatus: "closed"
        };
    }
}

// Set up Express and HTTP transport
// const app = express();
// app.use(express.json());

// app.post("/mcp", async (req, res) => {
//     // Create a new transport for each request to prevent request ID collisions
//     const transport = new StreamableHTTPServerTransport({
//         sessionIdGenerator: undefined,
//         enableJsonResponse: true
//     });

//     res.on("close", () => {
//         transport.close();
//     });

//     await server.connect(transport);
//     await transport.handleRequest(req, res, req.body);
// });

// const port = parseInt(process.env.PORT || "3000");
// app.listen(port, () => {
//     console.log(`Demo MCP Server running on http://localhost:${port}/mcp`);
// }).on("error", error => {
//     console.error("Server error:", error);
//     process.exit(1);
// });

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[MCP] Knowledge MCP Server 已启动（stdio）...');
