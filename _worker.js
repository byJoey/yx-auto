// Cloudflare Workers 优选工具
// GitHub: https://github.com/byJoey/yx-auto

const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>优选订阅生成器</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-bottom: 30px; text-align: center; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; color: #555; font-weight: 500; }
        input, select { width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px; transition: border-color 0.3s; }
        input:focus, select:focus { outline: none; border-color: #667eea; }
        .checkbox-group { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
        .checkbox-item { display: flex; align-items: center; }
        .checkbox-item input { width: auto; margin-right: 8px; }
        button { width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
        button:hover { transform: translateY(-2px); }
        .result { margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 6px; word-break: break-all; }
        .info { background: #e3f2fd; padding: 15px; border-radius: 6px; margin-bottom: 20px; color: #1976d2; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 优选订阅生成器</h1>
        <div class="info">
            <strong>使用说明：</strong>填写域名和UUID，选择协议和客户端类型，点击生成订阅链接。
        </div>
        <form id="subForm">
            <div class="form-group">
                <label>域名 *</label>
                <input type="text" id="domain" placeholder="例如: your-domain.com" required>
            </div>
            <div class="form-group">
                <label>UUID *</label>
                <input type="text" id="uuid" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required>
            </div>
            <div class="form-group">
                <label>协议选择</label>
                <div class="checkbox-group">
                    <div class="checkbox-item"><input type="checkbox" id="vless" checked> VLESS</div>
                    <div class="checkbox-item"><input type="checkbox" id="trojan"> Trojan</div>
                    <div class="checkbox-item"><input type="checkbox" id="vmess"> VMess</div>
                </div>
            </div>
            <div class="form-group">
                <label>优选选项</label>
                <div class="checkbox-group">
                    <div class="checkbox-item"><input type="checkbox" id="epd" checked> 默认域名</div>
                    <div class="checkbox-item"><input type="checkbox" id="epi" checked> 优选IP</div>
                    <div class="checkbox-item"><input type="checkbox" id="egi" checked> GitHub优选</div>
                </div>
            </div>
            <div class="form-group">
                <label>运营商筛选</label>
                <div class="checkbox-group">
                    <div class="checkbox-item"><input type="checkbox" id="mobile" checked> 移动</div>
                    <div class="checkbox-item"><input type="checkbox" id="unicom" checked> 联通</div>
                    <div class="checkbox-item"><input type="checkbox" id="telecom" checked> 电信</div>
                </div>
            </div>
            <div class="form-group">
                <label>IP版本</label>
                <div class="checkbox-group">
                    <div class="checkbox-item"><input type="checkbox" id="ipv4" checked> IPv4</div>
                    <div class="checkbox-item"><input type="checkbox" id="ipv6" checked> IPv6</div>
                </div>
            </div>
            <div class="form-group">
                <label>客户端类型</label>
                <select id="target">
                    <option value="base64">通用 (Base64)</option>
                    <option value="clash">Clash</option>
                    <option value="surge">Surge</option>
                    <option value="quantumult">Quantumult X</option>
                </select>
            </div>
            <div class="form-group">
                <label>自定义IP源URL (可选)</label>
                <input type="text" id="piu" placeholder="留空使用默认源">
            </div>
            <button type="submit">生成订阅链接</button>
        </form>
        <div id="result" class="result" style="display:none;"></div>
    </div>
    <script>
        document.getElementById('subForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const domain = document.getElementById('domain').value;
            const uuid = document.getElementById('uuid').value;
            const target = document.getElementById('target').value;
            const piu = document.getElementById('piu').value;
            
            let url = window.location.origin + '/' + uuid + '/sub?domain=' + encodeURIComponent(domain);
            
            if (document.getElementById('vless').checked) url += '&ev=yes';
            if (document.getElementById('trojan').checked) url += '&et=yes';
            if (document.getElementById('vmess').checked) url += '&mess=yes';
            if (document.getElementById('epd').checked) url += '&epd=yes';
            if (document.getElementById('epi').checked) url += '&epi=yes';
            if (document.getElementById('egi').checked) url += '&egi=yes';
            if (document.getElementById('mobile').checked) url += '&ispMobile=yes';
            if (document.getElementById('unicom').checked) url += '&ispUnicom=yes';
            if (document.getElementById('telecom').checked) url += '&ispTelecom=yes';
            if (document.getElementById('ipv4').checked) url += '&ipv4=yes';
            if (document.getElementById('ipv6').checked) url += '&ipv6=yes';
            if (target !== 'base64') url += '&target=' + target;
            if (piu) url += '&piu=' + encodeURIComponent(piu);
            
            document.getElementById('result').style.display = 'block';
            document.getElementById('result').innerHTML = '<strong>订阅链接：</strong><br>' + url;
        });
    </script>
</body>
</html>
`;

// 默认优选域名列表
const DEFAULT_DOMAINS = [
    'www.visa.com.sg',
    'www.visa.com.hk',
    'www.visa.com.tw',
    'www.gstatic.com',
    'www.digitalocean.com'
];

// 从 wetest.vip 获取优选IP
async function fetchOptimalIPs(ipVersion = 'v4', isp = 'all') {
    try {
        const url = `https://api.wetest.vip/api/bestcf/${ipVersion}/${isp}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.ips || [];
    } catch (error) {
        console.error('获取优选IP失败:', error);
        return [];
    }
}

// 从 GitHub 获取IP列表
async function fetchGitHubIPs(url) {
    try {
        const response = await fetch(url);
        const text = await response.text();
        return text.split('\n').filter(line => line.trim());
    } catch (error) {
        console.error('从GitHub获取IP失败:', error);
        return [];
    }
}

// 生成节点配置
function generateNode(protocol, address, port, uuid, domain, index) {
    const name = `${protocol.toUpperCase()}-${address}-${index}`;
    
    if (protocol === 'vless') {
        return `vless://${uuid}@${address}:${port}?encryption=none&security=tls&sni=${domain}&type=ws&host=${domain}&path=%2F#${encodeURIComponent(name)}`;
    } else if (protocol === 'trojan') {
        return `trojan://${uuid}@${address}:${port}?security=tls&sni=${domain}&type=ws&host=${domain}&path=%2F#${encodeURIComponent(name)}`;
    } else if (protocol === 'vmess') {
        const vmessConfig = {
            v: "2",
            ps: name,
            add: address,
            port: port,
            id: uuid,
            aid: "0",
            net: "ws",
            type: "none",
            host: domain,
            path: "/",
            tls: "tls",
            sni: domain
        };
        return 'vmess://' + btoa(JSON.stringify(vmessConfig));
    }
}

// 生成 Clash 配置
function generateClashConfig(nodes, domain) {
    const proxies = nodes.map((node, index) => {
        const url = new URL(node);
        const protocol = url.protocol.replace(':', '');
        const params = new URLSearchParams(url.search);
        
        return {
            name: decodeURIComponent(url.hash.substring(1)),
            type: protocol,
            server: url.hostname,
            port: parseInt(url.port) || 443,
            uuid: url.username,
            tls: true,
            'skip-cert-verify': false,
            network: 'ws',
            'ws-opts': {
                path: params.get('path') || '/',
                headers: { Host: domain }
            }
        };
    });
    
    return {
        proxies: proxies,
        'proxy-groups': [{
            name: '自动选择',
            type: 'url-test',
            proxies: proxies.map(p => p.name),
            url: 'http://www.gstatic.com/generate_204',
            interval: 300
        }]
    };
}

// 处理订阅请求
async function handleSubscription(request, uuid) {
    const url = new URL(request.url);
    const params = url.searchParams;
    
    // 获取参数
    const domain = params.get('domain');
    if (!domain) {
        return new Response('缺少 domain 参数', { status: 400 });
    }
    
    const enableVLESS = params.get('ev') === 'yes';
    const enableTrojan = params.get('et') === 'yes';
    const enableVMess = params.get('mess') === 'yes';
    const enableDefaultDomains = params.get('epd') === 'yes';
    const enableOptimalIP = params.get('epi') === 'yes';
    const enableGitHubIP = params.get('egi') === 'yes';
    const customIPUrl = params.get('piu');
    const target = params.get('target') || 'base64';
    
    const enableIPv4 = params.get('ipv4') !== 'no';
    const enableIPv6 = params.get('ipv6') !== 'no';
    const enableMobile = params.get('ispMobile') !== 'no';
    const enableUnicom = params.get('ispUnicom') !== 'no';
    const enableTelecom = params.get('ispTelecom') !== 'no';
    
    // 收集所有地址
    let addresses = [];
    
    // 添加默认域名
    if (enableDefaultDomains) {
        addresses.push(...DEFAULT_DOMAINS);
    }
    
    // 添加优选IP
    if (enableOptimalIP) {
        const ipVersions = [];
        if (enableIPv4) ipVersions.push('v4');
        if (enableIPv6) ipVersions.push('v6');
        
        const isps = [];
        if (enableMobile) isps.push('mobile');
        if (enableUnicom) isps.push('unicom');
        if (enableTelecom) isps.push('telecom');
        
        for (const version of ipVersions) {
            for (const isp of isps) {
                const ips = await fetchOptimalIPs(version, isp);
                addresses.push(...ips.slice(0, 5)); // 每个运营商取5个
            }
        }
    }
    
    // 添加自定义IP源
    if (customIPUrl) {
        const customIPs = await fetchGitHubIPs(customIPUrl);
        addresses.push(...customIPs);
    }
    
    // 生成节点
    const protocols = [];
    if (enableVLESS) protocols.push('vless');
    if (enableTrojan) protocols.push('trojan');
    if (enableVMess) protocols.push('vmess');
    
    if (protocols.length === 0) {
        protocols.push('vless'); // 默认使用 VLESS
    }
    
    const nodes = [];
    let index = 1;
    for (const protocol of protocols) {
        for (const address of addresses) {
            nodes.push(generateNode(protocol, address, 443, uuid, domain, index++));
        }
    }
    
    // 根据目标格式返回
    if (target === 'clash') {
        const config = generateClashConfig(nodes, domain);
        return new Response(JSON.stringify(config, null, 2), {
            headers: { 'Content-Type': 'application/json' }
        });
    } else {
        // Base64 格式
        const content = nodes.join('\n');
        const base64Content = btoa(unescape(encodeURIComponent(content)));
        return new Response(base64Content, {
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

export default {
    async fetch(request) {
        const url = new URL(request.url);
        
        // 代理 3xui.xlihf.top 到服务器 8080 端口
        if (url.hostname === '3xui.xlihf.top') {
            const targetUrl = `http://192.227.232.131:8080${url.pathname}${url.search}`;
            
            // 创建新的请求头
            const headers = new Headers(request.headers);
            headers.set('Host', '3xui.xlihf.top');
            headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '');
            headers.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || '');
            
            try {
                const response = await fetch(targetUrl, {
                    method: request.method,
                    headers: headers,
                    body: request.body,
                    redirect: 'follow'
                });
                
                // 返回响应
                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers
                });
            } catch (error) {
                return new Response('代理错误: ' + error.message, { status: 502 });
            }
        }
        
        const path = url.pathname;
        
        // 首页
        if (path === '/' || path === '') {
            return new Response(HTML_CONTENT, {
                headers: { 'Content-Type': 'text/html;charset=UTF-8' }
            });
        }
        
        // 订阅路径: /{uuid}/sub
        const match = path.match(/^\/([^\/]+)\/sub$/);
        if (match) {
            const uuid = match[1];
            return handleSubscription(request, uuid);
        }
        
        return new Response('Not Found', { status: 404 });
    }
};
