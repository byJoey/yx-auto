// Cloudflare Worker - 简化版优选工具
// 仅保留优选域名、优选IP、GitHub、上报和节点生成功能

// 默认配置
let customPreferredIPs = [];
let customPreferredDomains = [];
let epd = true;  // 启用优选域名
let epi = true;  // 启用优选IP
let egi = true;  // 启用GitHub优选
let ev = true;   // 启用VLESS协议
let et = false;  // 启用Trojan协议
let vm = false;  // 启用VMess协议
let scu = 'https://url.v1.mk/sub';  // 订阅转换地址

// 默认优选域名列表
const directDomains = [
    { name: "cloudflare.182682.xyz", domain: "cloudflare.182682.xyz" },
    { domain: "freeyx.cloudflare88.eu.org" },
    { domain: "bestcf.top" },
    { domain: "cdn.2020111.xyz" },
    { domain: "cf.0sm.com" },
    { domain: "cf.090227.xyz" },
    { domain: "cf.zhetengsha.eu.org" },
    { domain: "cfip.1323123.xyz" },
    { domain: "cloudflare-ip.mofashi.ltd" },
    { domain: "cf.877771.xyz" },
    { domain: "saas.sin.fan" },
    { domain: "xn--b6gac.eu.org" }
];

// 默认优选IP来源URL
const defaultIPURL = 'https://raw.githubusercontent.com/qwer-search/bestip/refs/heads/main/kejilandbestip.txt';

// UUID验证
function isValidUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

// 从环境变量获取配置
function getConfigValue(key, defaultValue) {
    return defaultValue || '';
}

// 获取动态IP列表（支持IPv4/IPv6和运营商筛选）
async function fetchDynamicIPs(ipv4Enabled = true, ipv6Enabled = true, ispMobile = true, ispUnicom = true, ispTelecom = true) {
    const v4Url = "https://www.wetest.vip/page/cloudflare/address_v4.html";
    const v6Url = "https://www.wetest.vip/page/cloudflare/address_v6.html";
    let results = [];

    try {
        const fetchPromises = [];
        if (ipv4Enabled) {
            fetchPromises.push(fetchAndParseWetest(v4Url));
        } else {
            fetchPromises.push(Promise.resolve([]));
        }
        if (ipv6Enabled) {
            fetchPromises.push(fetchAndParseWetest(v6Url));
        } else {
            fetchPromises.push(Promise.resolve([]));
        }

        const [ipv4List, ipv6List] = await Promise.all(fetchPromises);
        results = [...ipv4List, ...ipv6List];
        
        // 按运营商筛选
        if (results.length > 0) {
            results = results.filter(item => {
                const isp = item.isp || '';
                if (isp.includes('移动') && !ispMobile) return false;
                if (isp.includes('联通') && !ispUnicom) return false;
                if (isp.includes('电信') && !ispTelecom) return false;
                return true;
            });
        }
        
        return results.length > 0 ? results : [];
    } catch (e) {
        return [];
    }
}

// 解析wetest页面
async function fetchAndParseWetest(url) {
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) return [];
        const html = await response.text();
        const results = [];
        const rowRegex = /<tr[\s\S]*?<\/tr>/g;
        const cellRegex = /<td data-label="线路名称">(.+?)<\/td>[\s\S]*?<td data-label="优选地址">([\d.:a-fA-F]+)<\/td>[\s\S]*?<td data-label="数据中心">(.+?)<\/td>/;

        let match;
        while ((match = rowRegex.exec(html)) !== null) {
            const rowHtml = match[0];
            const cellMatch = rowHtml.match(cellRegex);
            if (cellMatch && cellMatch[1] && cellMatch[2]) {
                const colo = cellMatch[3] ? cellMatch[3].trim().replace(/<.*?>/g, '') : '';
                results.push({
                    isp: cellMatch[1].trim().replace(/<.*?>/g, ''),
                    ip: cellMatch[2].trim(),
                    colo: colo
                });
            }
        }
        return results;
    } catch (error) {
        return [];
    }
}

// 整理成数组
async function 整理成数组(内容) {
    var 替换后的内容 = 内容.replace(/[	"'\r\n]+/g, ',').replace(/,+/g, ',');
    if (替换后的内容.charAt(0) == ',') 替换后的内容 = 替换后的内容.slice(1);
    if (替换后的内容.charAt(替换后的内容.length - 1) == ',') 替换后的内容 = 替换后的内容.slice(0, 替换后的内容.length - 1);
    const 地址数组 = 替换后的内容.split(',');
    return 地址数组;
}

// 请求优选API
async function 请求优选API(urls, 默认端口 = '443', 超时时间 = 3000) {
    if (!urls?.length) return [];
    const results = new Set();
    await Promise.allSettled(urls.map(async (url) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 超时时间);
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            let text = '';
            try {
                const buffer = await response.arrayBuffer();
                const contentType = (response.headers.get('content-type') || '').toLowerCase();
                const charset = contentType.match(/charset=([^\s;]+)/i)?.[1]?.toLowerCase() || '';

                // 根据 Content-Type 响应头判断编码优先级
                let decoders = ['utf-8', 'gb2312']; // 默认优先 UTF-8
                if (charset.includes('gb') || charset.includes('gbk') || charset.includes('gb2312')) {
                    decoders = ['gb2312', 'utf-8']; // 如果明确指定 GB 系编码，优先尝试 GB2312
                }

                // 尝试多种编码解码
                let decodeSuccess = false;
                for (const decoder of decoders) {
                    try {
                        const decoded = new TextDecoder(decoder).decode(buffer);
                        // 验证解码结果的有效性
                        if (decoded && decoded.length > 0 && !decoded.includes('\ufffd')) {
                            text = decoded;
                            decodeSuccess = true;
                            break;
                        } else if (decoded && decoded.length > 0) {
                            // 如果有替换字符 (U+FFFD)，说明编码不匹配，继续尝试下一个编码
                            continue;
                        }
                    } catch (e) {
                        // 该编码解码失败，尝试下一个
                        continue;
                    }
                }

                // 如果所有编码都失败或无效，尝试 response.text()
                if (!decodeSuccess) {
                    text = await response.text();
                }

                // 如果返回的是空或无效数据，返回
                if (!text || text.trim().length === 0) {
                    return;
                }
            } catch (e) {
                console.error('Failed to decode response:', e);
                return;
            }
            const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l);
            const isCSV = lines.length > 1 && lines[0].includes(',');
            const IPV6_PATTERN = /^[^\[\]]*:[^\[\]]*:[^\[\]]/;
            if (!isCSV) {
                lines.forEach(line => {
                    const hashIndex = line.indexOf('#');
                    const [hostPart, remark] = hashIndex > -1 ? [line.substring(0, hashIndex), line.substring(hashIndex)] : [line, ''];
                    let hasPort = false;
                    if (hostPart.startsWith('[')) {
                        hasPort = /\]:(\d+)$/.test(hostPart);
                    } else {
                        const colonIndex = hostPart.lastIndexOf(':');
                        hasPort = colonIndex > -1 && /^\d+$/.test(hostPart.substring(colonIndex + 1));
                    }
                    const port = new URL(url).searchParams.get('port') || 默认端口;
                    results.add(hasPort ? line : `${hostPart}:${port}${remark}`);
                });
            } else {
                const headers = lines[0].split(',').map(h => h.trim());
                const dataLines = lines.slice(1);
                if (headers.includes('IP地址') && headers.includes('端口') && headers.includes('数据中心')) {
                    const ipIdx = headers.indexOf('IP地址'), portIdx = headers.indexOf('端口');
                    const remarkIdx = headers.indexOf('国家') > -1 ? headers.indexOf('国家') :
                        headers.indexOf('城市') > -1 ? headers.indexOf('城市') : headers.indexOf('数据中心');
                    const tlsIdx = headers.indexOf('TLS');
                    dataLines.forEach(line => {
                        const cols = line.split(',').map(c => c.trim());
                        if (tlsIdx !== -1 && cols[tlsIdx]?.toLowerCase() !== 'true') return;
                        const wrappedIP = IPV6_PATTERN.test(cols[ipIdx]) ? `[${cols[ipIdx]}]` : cols[ipIdx];
                        results.add(`${wrappedIP}:${cols[portIdx]}#${cols[remarkIdx]}`);
                    });
                } else if (headers.some(h => h.includes('IP')) && headers.some(h => h.includes('延迟')) && headers.some(h => h.includes('下载速度'))) {
                    const ipIdx = headers.findIndex(h => h.includes('IP'));
                    const delayIdx = headers.findIndex(h => h.includes('延迟'));
                    const speedIdx = headers.findIndex(h => h.includes('下载速度'));
                    const port = new URL(url).searchParams.get('port') || 默认端口;
                    dataLines.forEach(line => {
                        const cols = line.split(',').map(c => c.trim());
                        const wrappedIP = IPV6_PATTERN.test(cols[ipIdx]) ? `[${cols[ipIdx]}]` : cols[ipIdx];
                        results.add(`${wrappedIP}:${port}#CF优选 ${cols[delayIdx]}ms ${cols[speedIdx]}MB/s`);
                    });
                }
            }
        } catch (e) { }
    }));
    return Array.from(results);
}

// 从GitHub获取优选IP（保留原有功能，同时支持优选API）
async function fetchAndParseNewIPs(piu) {
    const url = piu || defaultIPURL;
    try {
        const response = await fetch(url);
        if (!response.ok) return [];
        const text = await response.text();
        const results = [];
        const lines = text.trim().replace(/\r/g, "").split('\n');
        const regex = /^([^:]+):(\d+)#(.*)$/;

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            const match = trimmedLine.match(regex);
            if (match) {
                results.push({
                    ip: match[1],
                    port: parseInt(match[2], 10),
                    name: match[3].trim() || match[1]
                });
            }
        }
        return results;
    } catch (error) {
        return [];
    }
}

// 生成VLESS链接
function generateLinksFromSource(list, user, workerDomain, disableNonTLS = false, customPath = '/') {
    const CF_HTTP_PORTS = [80, 8080, 8880, 2052, 2082, 2086, 2095];
    const CF_HTTPS_PORTS = [443, 2053, 2083, 2087, 2096, 8443];
    const defaultHttpsPorts = [443];
    const defaultHttpPorts = disableNonTLS ? [] : [80];
    const links = [];
    const wsPath = customPath || '/';
    const proto = 'vless';

    list.forEach(item => {
        let nodeNameBase = item.isp ? item.isp.replace(/\s/g, '_') : (item.name || item.domain || item.ip);
        if (item.colo && item.colo.trim()) {
            nodeNameBase = `${nodeNameBase}-${item.colo.trim()}`;
        }
        const safeIP = item.ip.includes(':') ? `[${item.ip}]` : item.ip;
        
        let portsToGenerate = [];
        
        if (item.port) {
            const port = item.port;
            if (CF_HTTPS_PORTS.includes(port)) {
                portsToGenerate.push({ port: port, tls: true });
            } else if (CF_HTTP_PORTS.includes(port)) {
                portsToGenerate.push({ port: port, tls: false });
            } else {
                portsToGenerate.push({ port: port, tls: true });
            }
        } else {
            defaultHttpsPorts.forEach(port => {
                portsToGenerate.push({ port: port, tls: true });
            });
            defaultHttpPorts.forEach(port => {
                portsToGenerate.push({ port: port, tls: false });
            });
        }

        portsToGenerate.forEach(({ port, tls }) => {
            if (tls) {
                const wsNodeName = `${nodeNameBase}-${port}-WS-TLS`;
                const wsParams = new URLSearchParams({ 
                    encryption: 'none', 
                    security: 'tls', 
                    sni: workerDomain, 
                    fp: 'chrome', 
                    type: 'ws', 
                    host: workerDomain, 
                    path: wsPath
                });
                links.push(`${proto}://${user}@${safeIP}:${port}?${wsParams.toString()}#${encodeURIComponent(wsNodeName)}`);
            } else {
                const wsNodeName = `${nodeNameBase}-${port}-WS`;
                const wsParams = new URLSearchParams({
                    encryption: 'none',
                    security: 'none',
                    type: 'ws',
                    host: workerDomain,
                    path: wsPath
                });
                links.push(`${proto}://${user}@${safeIP}:${port}?${wsParams.toString()}#${encodeURIComponent(wsNodeName)}`);
            }
        });
    });
    return links;
}

// 生成Trojan链接
async function generateTrojanLinksFromSource(list, user, workerDomain, disableNonTLS = false, customPath = '/') {
    const CF_HTTP_PORTS = [80, 8080, 8880, 2052, 2082, 2086, 2095];
    const CF_HTTPS_PORTS = [443, 2053, 2083, 2087, 2096, 8443];
    const defaultHttpsPorts = [443];
    const defaultHttpPorts = disableNonTLS ? [] : [80];
    const links = [];
    const wsPath = customPath || '/';
    const password = user;  // Trojan使用UUID作为密码

    list.forEach(item => {
        let nodeNameBase = item.isp ? item.isp.replace(/\s/g, '_') : (item.name || item.domain || item.ip);
        if (item.colo && item.colo.trim()) {
            nodeNameBase = `${nodeNameBase}-${item.colo.trim()}`;
        }
        const safeIP = item.ip.includes(':') ? `[${item.ip}]` : item.ip;
        
        let portsToGenerate = [];
        
        if (item.port) {
            const port = item.port;
            if (CF_HTTPS_PORTS.includes(port)) {
                portsToGenerate.push({ port: port, tls: true });
            } else if (CF_HTTP_PORTS.includes(port)) {
                if (!disableNonTLS) {
                    portsToGenerate.push({ port: port, tls: false });
                }
            } else {
                portsToGenerate.push({ port: port, tls: true });
            }
        } else {
            defaultHttpsPorts.forEach(port => {
                portsToGenerate.push({ port: port, tls: true });
            });
            defaultHttpPorts.forEach(port => {
                portsToGenerate.push({ port: port, tls: false });
            });
        }

        portsToGenerate.forEach(({ port, tls }) => {
            if (tls) {
                const wsNodeName = `${nodeNameBase}-${port}-Trojan-WS-TLS`;
                const wsParams = new URLSearchParams({ 
                    security: 'tls', 
                    sni: workerDomain, 
                    fp: 'chrome', 
                    type: 'ws', 
                    host: workerDomain, 
                    path: wsPath
                });
                links.push(`trojan://${password}@${safeIP}:${port}?${wsParams.toString()}#${encodeURIComponent(wsNodeName)}`);
            } else {
                const wsNodeName = `${nodeNameBase}-${port}-Trojan-WS`;
                const wsParams = new URLSearchParams({
                    security: 'none',
                    type: 'ws',
                    host: workerDomain,
                    path: wsPath
                });
                links.push(`trojan://${password}@${safeIP}:${port}?${wsParams.toString()}#${encodeURIComponent(wsNodeName)}`);
            }
        });
    });
    return links;
}

// 生成VMess链接
function generateVMessLinksFromSource(list, user, workerDomain, disableNonTLS = false, customPath = '/') {
    const CF_HTTP_PORTS = [80, 8080, 8880, 2052, 2082, 2086, 2095];
    const CF_HTTPS_PORTS = [443, 2053, 2083, 2087, 2096, 8443];
    const defaultHttpsPorts = [443];
    const defaultHttpPorts = disableNonTLS ? [] : [80];
    const links = [];
    const wsPath = customPath || '/';

    list.forEach(item => {
        let nodeNameBase = item.isp ? item.isp.replace(/\s/g, '_') : (item.name || item.domain || item.ip);
        if (item.colo && item.colo.trim()) {
            nodeNameBase = `${nodeNameBase}-${item.colo.trim()}`;
        }
        const safeIP = item.ip.includes(':') ? `[${item.ip}]` : item.ip;
        
        let portsToGenerate = [];
        
        if (item.port) {
            const port = item.port;
            if (CF_HTTPS_PORTS.includes(port)) {
                portsToGenerate.push({ port: port, tls: true });
            } else if (CF_HTTP_PORTS.includes(port)) {
                if (!disableNonTLS) {
                    portsToGenerate.push({ port: port, tls: false });
                }
            } else {
                portsToGenerate.push({ port: port, tls: true });
            }
        } else {
            defaultHttpsPorts.forEach(port => {
                portsToGenerate.push({ port: port, tls: true });
            });
            defaultHttpPorts.forEach(port => {
                portsToGenerate.push({ port: port, tls: false });
            });
        }

        portsToGenerate.forEach(({ port, tls }) => {
            const vmessConfig = {
                v: "2",
                ps: tls ? `${nodeNameBase}-${port}-VMess-WS-TLS` : `${nodeNameBase}-${port}-VMess-WS`,
                add: safeIP,
                port: port.toString(),
                id: user,
                aid: "0",
                scy: "auto",
                net: "ws",
                type: "none",
                host: workerDomain,
                path: wsPath,
                tls: tls ? "tls" : "none"
            };
            if (tls) {
                vmessConfig.sni = workerDomain;
                vmessConfig.fp = "chrome";
            }
            const vmessBase64 = btoa(JSON.stringify(vmessConfig));
            links.push(`vmess://${vmessBase64}`);
        });
    });
    return links;
}

// 从GitHub IP生成链接（VLESS）
function generateLinksFromNewIPs(list, user, workerDomain, customPath = '/') {
    const CF_HTTP_PORTS = [80, 8080, 8880, 2052, 2082, 2086, 2095];
    const CF_HTTPS_PORTS = [443, 2053, 2083, 2087, 2096, 8443];
    const links = [];
    const wsPath = customPath || '/';
    const proto = 'vless';
    
    list.forEach(item => {
        const nodeName = item.name.replace(/\s/g, '_');
        const port = item.port;
        
        if (CF_HTTPS_PORTS.includes(port)) {
            const wsNodeName = `${nodeName}-${port}-WS-TLS`;
            const link = `${proto}://${user}@${item.ip}:${port}?encryption=none&security=tls&sni=${workerDomain}&fp=chrome&type=ws&host=${workerDomain}&path=${wsPath}#${encodeURIComponent(wsNodeName)}`;
            links.push(link);
        } else if (CF_HTTP_PORTS.includes(port)) {
            const wsNodeName = `${nodeName}-${port}-WS`;
            const link = `${proto}://${user}@${item.ip}:${port}?encryption=none&security=none&type=ws&host=${workerDomain}&path=${wsPath}#${encodeURIComponent(wsNodeName)}`;
            links.push(link);
        } else {
            const wsNodeName = `${nodeName}-${port}-WS-TLS`;
            const link = `${proto}://${user}@${item.ip}:${port}?encryption=none&security=tls&sni=${workerDomain}&fp=chrome&type=ws&host=${workerDomain}&path=${wsPath}#${encodeURIComponent(wsNodeName)}`;
            links.push(link);
        }
    });
    return links;
}

// 生成订阅内容
async function handleSubscriptionRequest(request, user, customDomain, piu, ipv4Enabled, ipv6Enabled, ispMobile, ispUnicom, ispTelecom, evEnabled, etEnabled, vmEnabled, disableNonTLS, customPath) {
    const url = new URL(request.url);
    const finalLinks = [];
    const workerDomain = url.hostname;  // workerDomain始终是请求的hostname
    const nodeDomain = customDomain || url.hostname;  // 用户输入的域名用于生成节点时的host/sni
    const target = url.searchParams.get('target') || 'base64';
    const wsPath = customPath || '/';

    async function addNodesFromList(list) {
        // 确保至少有一个协议被启用
        const hasProtocol = evEnabled || etEnabled || vmEnabled;
        const useVL = hasProtocol ? evEnabled : true;  // 如果没有选择任何协议，默认使用VLESS
        
        if (useVL) {
            finalLinks.push(...generateLinksFromSource(list, user, nodeDomain, disableNonTLS, wsPath));
        }
        if (etEnabled) {
            finalLinks.push(...await generateTrojanLinksFromSource(list, user, nodeDomain, disableNonTLS, wsPath));
        }
        if (vmEnabled) {
            finalLinks.push(...generateVMessLinksFromSource(list, user, nodeDomain, disableNonTLS, wsPath));
        }
    }

    // 原生地址
    const nativeList = [{ ip: workerDomain, isp: '原生地址' }];
    await addNodesFromList(nativeList);

    // 优选域名
    if (epd) {
        const domainList = directDomains.map(d => ({ ip: d.domain, isp: d.name || d.domain }));
        await addNodesFromList(domainList);
    }

    // 优选IP
    if (epi) {
        try {
            const dynamicIPList = await fetchDynamicIPs(ipv4Enabled, ipv6Enabled, ispMobile, ispUnicom, ispTelecom);
            if (dynamicIPList.length > 0) {
                await addNodesFromList(dynamicIPList);
            }
        } catch (error) {
            console.error('获取动态IP失败:', error);
        }
    }

    // GitHub优选 / 优选API
    if (egi) {
        try {
            // 检查是否是优选API URL（以https://开头）
            if (piu && piu.toLowerCase().startsWith('https://')) {
                // 从优选API获取IP列表
                const 优选API的IP = await 请求优选API([piu]);
                if (优选API的IP && 优选API的IP.length > 0) {
                    // 解析IP字符串格式：IP:端口#备注
                    const IP列表 = 优选API的IP.map(原始地址 => {
                        // 统一正则: 匹配 域名/IPv4/IPv6地址 + 可选端口 + 可选备注
                        const regex = /^(\[[\da-fA-F:]+\]|[\d.]+|[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*)(?::(\d+))?(?:#(.+))?$/;
                        const match = 原始地址.match(regex);

                        if (match) {
                            const 节点地址 = match[1].replace(/[\[\]]/g, ''); // 移除IPv6的方括号
                            const 节点端口 = match[2] || 443;
                            const 节点备注 = match[3] || 节点地址;
                            return {
                                ip: 节点地址,
                                port: parseInt(节点端口),
                                name: 节点备注
                            };
                        }
                        return null;
                    }).filter(item => item !== null);
                    
                    if (IP列表.length > 0) {
                        const hasProtocol = evEnabled || etEnabled || vmEnabled;
                        const useVL = hasProtocol ? evEnabled : true;
                        
                        if (useVL) {
                            finalLinks.push(...generateLinksFromNewIPs(IP列表, user, nodeDomain, wsPath));
                        }
                    }
                }
            } else if (piu && piu.includes('\n')) {
                // 支持多行文本，包含混合格式（优选API URL + IP列表）
                const 完整优选列表 = await 整理成数组(piu);
                const 优选API = [], 优选IP = [], 其他节点 = [];
                
                for (const 元素 of 完整优选列表) {
                    if (元素.toLowerCase().startsWith('https://')) {
                        优选API.push(元素);
                    } else if (元素.toLowerCase().includes('://')) {
                        其他节点.push(元素);
                    } else {
                        优选IP.push(元素);
                    }
                }
                
                // 从优选API获取IP
                if (优选API.length > 0) {
                    const 优选API的IP = await 请求优选API(优选API);
                    优选IP.push(...优选API的IP);
                }
                
                // 解析所有IP并生成节点
                if (优选IP.length > 0) {
                    const IP列表 = 优选IP.map(原始地址 => {
                        const regex = /^(\[[\da-fA-F:]+\]|[\d.]+|[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*)(?::(\d+))?(?:#(.+))?$/;
                        const match = 原始地址.match(regex);

                        if (match) {
                            const 节点地址 = match[1].replace(/[\[\]]/g, '');
                            const 节点端口 = match[2] || 443;
                            const 节点备注 = match[3] || 节点地址;
                            return {
                                ip: 节点地址,
                                port: parseInt(节点端口),
                                name: 节点备注
                            };
                        }
                        return null;
                    }).filter(item => item !== null);
                    
                    if (IP列表.length > 0) {
                        const hasProtocol = evEnabled || etEnabled || vmEnabled;
                        const useVL = hasProtocol ? evEnabled : true;
                        
                        if (useVL) {
                            finalLinks.push(...generateLinksFromNewIPs(IP列表, user, nodeDomain, wsPath));
                        }
                    }
                }
            } else {
                // 原有的GitHub优选逻辑（单URL）
                const newIPList = await fetchAndParseNewIPs(piu);
                if (newIPList.length > 0) {
                    const hasProtocol = evEnabled || etEnabled || vmEnabled;
                    const useVL = hasProtocol ? evEnabled : true;
                    
                    if (useVL) {
                        finalLinks.push(...generateLinksFromNewIPs(newIPList, user, nodeDomain, wsPath));
                    }
                }
            }
        } catch (error) {
            console.error('获取优选IP失败:', error);
        }
    }

    if (finalLinks.length === 0) {
        const errorRemark = "所有节点获取失败";
        const errorLink = `vless://00000000-0000-0000-0000-000000000000@127.0.0.1:80?encryption=none&security=none&type=ws&host=error.com&path=%2F#${encodeURIComponent(errorRemark)}`;
        finalLinks.push(errorLink);
    }

    let subscriptionContent;
    let contentType = 'text/plain; charset=utf-8';
    
    switch (target.toLowerCase()) {
        case 'clash':
        case 'clashr':
            subscriptionContent = generateClashConfig(finalLinks);
            contentType = 'text/yaml; charset=utf-8';
            break;
        case 'surge':
        case 'surge2':
        case 'surge3':
        case 'surge4':
            subscriptionContent = generateSurgeConfig(finalLinks);
            break;
        case 'quantumult':
        case 'quanx':
            subscriptionContent = generateQuantumultConfig(finalLinks);
            break;
        default:
            subscriptionContent = btoa(finalLinks.join('\n'));
    }
    
    return new Response(subscriptionContent, {
        headers: { 
            'Content-Type': contentType,
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
    });
}

// 生成Clash配置（简化版，返回YAML格式）
function generateClashConfig(links) {
    let yaml = 'port: 7890\n';
    yaml += 'socks-port: 7891\n';
    yaml += 'allow-lan: false\n';
    yaml += 'mode: rule\n';
    yaml += 'log-level: info\n\n';
    yaml += 'proxies:\n';
    
    const proxyNames = [];
    links.forEach((link, index) => {
        const name = decodeURIComponent(link.split('#')[1] || `节点${index + 1}`);
        proxyNames.push(name);
        const server = link.match(/@([^:]+):(\d+)/)?.[1] || '';
        const port = link.match(/@[^:]+:(\d+)/)?.[1] || '443';
        const uuid = link.match(/vless:\/\/([^@]+)@/)?.[1] || '';
        const tls = link.includes('security=tls');
        const path = link.match(/path=([^&#]+)/)?.[1] || '/';
        const host = link.match(/host=([^&#]+)/)?.[1] || '';
        const sni = link.match(/sni=([^&#]+)/)?.[1] || '';
        
        yaml += `  - name: ${name}\n`;
        yaml += `    type: vless\n`;
        yaml += `    server: ${server}\n`;
        yaml += `    port: ${port}\n`;
        yaml += `    uuid: ${uuid}\n`;
        yaml += `    tls: ${tls}\n`;
        yaml += `    network: ws\n`;
        yaml += `    ws-opts:\n`;
        yaml += `      path: ${path}\n`;
        yaml += `      headers:\n`;
        yaml += `        Host: ${host}\n`;
        if (sni) {
            yaml += `    servername: ${sni}\n`;
        }
    });
    
    yaml += '\nproxy-groups:\n';
    yaml += '  - name: PROXY\n';
    yaml += '    type: select\n';
    yaml += `    proxies: [${proxyNames.map(n => `'${n}'`).join(', ')}]\n`;
    yaml += '\nrules:\n';
    yaml += '  - DOMAIN-SUFFIX,local,DIRECT\n';
    yaml += '  - IP-CIDR,127.0.0.0/8,DIRECT\n';
    yaml += '  - GEOIP,CN,DIRECT\n';
    yaml += '  - MATCH,PROXY\n';
    
    return yaml;
}

// 生成Surge配置
function generateSurgeConfig(links) {
    let config = '[Proxy]\n';
    links.forEach(link => {
        const name = decodeURIComponent(link.split('#')[1] || '节点');
        config += `${name} = vless, ${link.match(/@([^:]+):(\d+)/)?.[1] || ''}, ${link.match(/@[^:]+:(\d+)/)?.[1] || '443'}, username=${link.match(/vless:\/\/([^@]+)@/)?.[1] || ''}, tls=${link.includes('security=tls')}, ws=true, ws-path=${link.match(/path=([^&#]+)/)?.[1] || '/'}, ws-headers=Host:${link.match(/host=([^&#]+)/)?.[1] || ''}\n`;
    });
    config += '\n[Proxy Group]\nPROXY = select, ' + links.map((_, i) => decodeURIComponent(links[i].split('#')[1] || `节点${i + 1}`)).join(', ') + '\n';
    return config;
}

// 生成Quantumult配置
function generateQuantumultConfig(links) {
    return btoa(links.join('\n'));
}

// 在线测试延迟 - 测试IP或域名的延迟
async function testLatency(host, port = 443, timeout = 5000) {
    const startTime = Date.now();
    try {
        // 解析地址和端口
        let testHost = host;
        let testPort = port;
        
        // 如果host包含端口，提取出来
        if (host.includes(':')) {
            const parts = host.split(':');
            testHost = parts[0].replace(/[\[\]]/g, ''); // 移除IPv6的方括号
            testPort = parseInt(parts[1]) || port;
        }
        
        // 构建测试URL
        const protocol = testPort === 443 || testPort === 8443 ? 'https' : 'http';
        const testUrl = `${protocol}://${testHost}:${testPort}/cdn-cgi/trace`;
        
        // 使用AbortController控制超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(testUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            clearTimeout(timeoutId);
            
            const responseTime = Date.now() - startTime;
            
            if (response.ok) {
                const text = await response.text();
                const ipMatch = text.match(/ip=([^\s]+)/);
                const locMatch = text.match(/loc=([^\s]+)/);
                const coloMatch = text.match(/colo=([^\s]+)/);
                
                return {
                    success: true,
                    host: host,
                    port: testPort,
                    latency: responseTime,
                    ip: ipMatch ? ipMatch[1] : null,
                    location: locMatch ? locMatch[1] : null,
                    colo: coloMatch ? coloMatch[1] : null
                };
            } else {
                return {
                    success: false,
                    host: host,
                    port: testPort,
                    latency: responseTime,
                    error: `HTTP ${response.status}`
                };
            }
        } catch (fetchError) {
            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;
            
            if (fetchError.name === 'AbortError') {
                return {
                    success: false,
                    host: host,
                    port: testPort,
                    latency: timeout,
                    error: '请求超时'
                };
            }
            
            return {
                success: false,
                host: host,
                port: testPort,
                latency: responseTime,
                error: fetchError.message || '连接失败'
            };
        }
    } catch (error) {
        const responseTime = Date.now() - startTime;
        return {
            success: false,
            host: host,
            port: port,
            latency: responseTime,
            error: error.message || '未知错误'
        };
    }
}

// 批量测试延迟
async function batchTestLatency(hosts, port = 443, timeout = 5000, concurrency = 5) {
    const results = [];
    const chunks = [];
    
    // 将hosts分成多个批次
    for (let i = 0; i < hosts.length; i += concurrency) {
        chunks.push(hosts.slice(i, i + concurrency));
    }
    
    // 按批次测试
    for (const chunk of chunks) {
        const chunkResults = await Promise.allSettled(
            chunk.map(host => testLatency(host, port, timeout))
        );
        
        chunkResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                results.push(result.value);
            } else {
                results.push({
                    success: false,
                    host: chunk[index],
                    port: port,
                    latency: timeout,
                    error: result.reason?.message || '测试失败'
                });
            }
        });
    }
    
    // 按延迟排序
    results.sort((a, b) => {
        if (a.success && !b.success) return -1;
        if (!a.success && b.success) return 1;
        return a.latency - b.latency;
    });
    
    return results;
}

// 生成iOS 26风格的主页
function generateHomePage(scuValue) {
    const scu = scuValue || 'https://url.v1.mk/sub';
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>服务器优选工具</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(180deg, #f5f5f7 0%, #ffffff 100%);
            color: #1d1d1f;
            min-height: 100vh;
            padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
            overflow-x: hidden;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            padding: 40px 20px 30px;
        }
        
        .header h1 {
            font-size: 34px;
            font-weight: 700;
            letter-spacing: -0.5px;
            color: #1d1d1f;
            margin-bottom: 8px;
        }
        
        .header p {
            font-size: 17px;
            color: #86868b;
            font-weight: 400;
        }
        
        .card {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border-radius: 20px;
            padding: 24px;
            margin-bottom: 16px;
            box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
            border: 0.5px solid rgba(0, 0, 0, 0.04);
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            color: #86868b;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .form-group input {
            width: 100%;
            padding: 14px 16px;
            font-size: 17px;
            font-weight: 400;
            color: #1d1d1f;
            background: rgba(142, 142, 147, 0.12);
            border: none;
            border-radius: 12px;
            outline: none;
            transition: all 0.2s ease;
            -webkit-appearance: none;
        }
        
        .form-group input:focus {
            background: rgba(142, 142, 147, 0.16);
            transform: scale(1.01);
        }
        
        .form-group input::placeholder {
            color: #86868b;
        }
        
        .switch-group {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 0;
        }
        
        .switch-group label {
            font-size: 17px;
            font-weight: 400;
            color: #1d1d1f;
            text-transform: none;
            letter-spacing: 0;
        }
        
        .switch {
            position: relative;
            width: 51px;
            height: 31px;
            background: rgba(142, 142, 147, 0.3);
            border-radius: 16px;
            transition: background 0.3s ease;
            cursor: pointer;
        }
        
        .switch.active {
            background: #34c759;
        }
        
        .switch::after {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 27px;
            height: 27px;
            background: #ffffff;
            border-radius: 50%;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .switch.active::after {
            transform: translateX(20px);
        }
        
        .btn {
            width: 100%;
            padding: 16px;
            font-size: 17px;
            font-weight: 600;
            color: #ffffff;
            background: #007aff;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-top: 8px;
            -webkit-appearance: none;
            box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
        }
        
        .btn:active {
            transform: scale(0.98);
            opacity: 0.8;
        }
        
        .btn-secondary {
            background: rgba(142, 142, 147, 0.12);
            color: #007aff;
            box-shadow: none;
        }
        
        .btn-secondary:active {
            background: rgba(142, 142, 147, 0.2);
        }
        
        .result {
            margin-top: 20px;
            padding: 16px;
            background: rgba(142, 142, 147, 0.12);
            border-radius: 12px;
            font-size: 15px;
            color: #1d1d1f;
            word-break: break-all;
            display: none;
        }
        
        .result.show {
            display: block;
        }
        
        .result-url {
            margin-top: 12px;
            padding: 12px;
            background: rgba(0, 122, 255, 0.1);
            border-radius: 8px;
            font-size: 13px;
            color: #007aff;
            word-break: break-all;
        }
        
        .copy-btn {
            margin-top: 8px;
            padding: 10px 16px;
            font-size: 15px;
            background: rgba(0, 122, 255, 0.1);
            color: #007aff;
            border: none;
            border-radius: 8px;
            cursor: pointer;
        }
        
        .client-btn {
            padding: 12px 10px;
            font-size: 14px;
            font-weight: 500;
            color: #007aff;
            background: rgba(0, 122, 255, 0.1);
            border: 1px solid rgba(0, 122, 255, 0.2);
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s ease;
            -webkit-appearance: none;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            min-width: 0;
        }
        
        .client-btn:active {
            transform: scale(0.98);
            background: rgba(0, 122, 255, 0.2);
        }
        
        .checkbox-label {
            display: flex;
            align-items: center;
            cursor: pointer;
            font-size: 17px;
            font-weight: 400;
            user-select: none;
            -webkit-user-select: none;
            position: relative;
            z-index: 1;
        }
        
        .checkbox-label input[type="checkbox"] {
            margin-right: 8px;
            width: 20px;
            height: 20px;
            cursor: pointer;
            flex-shrink: 0;
            position: relative;
            z-index: 2;
            -webkit-appearance: checkbox;
            appearance: checkbox;
        }
        
        .checkbox-label span {
            cursor: pointer;
            position: relative;
            z-index: 1;
        }
        
        @media (max-width: 480px) {
            .client-btn {
                font-size: 12px;
                padding: 10px 8px;
            }
        }
        
        .footer {
            text-align: center;
            padding: 30px 20px;
            color: #86868b;
            font-size: 13px;
        }
        
        .footer a {
            transition: opacity 0.2s ease;
        }
        
        .footer a:active {
            opacity: 0.6;
        }
        
        @media (prefers-color-scheme: dark) {
            body {
                background: linear-gradient(180deg, #000000 0%, #1c1c1e 100%);
                color: #f5f5f7;
            }
            
            .card {
                background: rgba(28, 28, 30, 0.8);
                border: 0.5px solid rgba(255, 255, 255, 0.1);
            }
            
            .form-group input {
                background: rgba(142, 142, 147, 0.2);
                color: #f5f5f7;
            }
            
            .form-group input:focus {
                background: rgba(142, 142, 147, 0.25);
            }
            
            .switch-group label {
                color: #f5f5f7;
            }
            
            .result {
                background: rgba(142, 142, 147, 0.2);
                color: #f5f5f7;
            }
            
            select {
                background: rgba(142, 142, 147, 0.2) !important;
                color: #f5f5f7 !important;
            }
            
            label span {
                color: #f5f5f7;
            }
            
            .client-btn {
                background: rgba(0, 122, 255, 0.15) !important;
                border-color: rgba(0, 122, 255, 0.3) !important;
                color: #5ac8fa !important;
            }
            
            .footer a {
                color: #5ac8fa !important;
            }
            
            textarea {
                background: rgba(142, 142, 147, 0.2) !important;
                color: #f5f5f7 !important;
            }
            
            textarea::placeholder {
                color: #86868b !important;
            }
            
            #testResult, #batchTestResult {
                color: #f5f5f7 !important;
            }
            
            #testResult div, #batchTestResult div {
                color: #f5f5f7 !important;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>服务器优选工具</h1>
            <p>智能优选 • 一键生成</p>
        </div>
        
        <div class="card">
            <div class="form-group">
                <label>域名</label>
                <input type="text" id="domain" placeholder="请输入您的域名">
            </div>
            
            <div class="form-group">
                <label>UUID</label>
                <input type="text" id="uuid" placeholder="请输入UUID">
            </div>
            
            <div class="form-group">
                <label>WebSocket路径（可选）</label>
                <input type="text" id="customPath" placeholder="留空则使用默认路径 /" value="/">
                <small style="display: block; margin-top: 6px; color: #86868b; font-size: 13px;">自定义WebSocket路径，例如：/v2ray 或 /</small>
            </div>
            
            <div class="switch-group">
                <label>启用优选域名</label>
                <div class="switch active" id="switchDomain" onclick="toggleSwitch('switchDomain')"></div>
            </div>
            
            <div class="switch-group">
                <label>启用优选IP</label>
                <div class="switch active" id="switchIP" onclick="toggleSwitch('switchIP')"></div>
            </div>
            
            <div class="switch-group">
                <label>启用GitHub优选</label>
                <div class="switch active" id="switchGitHub" onclick="toggleSwitch('switchGitHub')"></div>
            </div>
            
            <div class="form-group" id="githubUrlGroup" style="margin-top: 12px;">
                <label>GitHub优选URL（可选）</label>
                <input type="text" id="githubUrl" placeholder="留空则使用默认地址" style="font-size: 15px;">
                <small style="display: block; margin-top: 6px; color: #86868b; font-size: 13px;">自定义优选IP列表来源URL，留空则使用默认地址</small>
            </div>
            
            <div class="form-group" style="margin-top: 24px;">
                <label>协议选择</label>
                <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
                    <div class="switch-group">
                        <label>VLESS (vl)</label>
                        <div class="switch active" id="switchVL" onclick="toggleSwitch('switchVL')"></div>
                    </div>
                    <div class="switch-group">
                        <label>Trojan (tj)</label>
                        <div class="switch" id="switchTJ" onclick="toggleSwitch('switchTJ')"></div>
                    </div>
                    <div class="switch-group">
                        <label>VMess (vm)</label>
                        <div class="switch" id="switchVM" onclick="toggleSwitch('switchVM')"></div>
                    </div>
                </div>
            </div>
            
            <div class="form-group" style="margin-top: 24px;">
                <label>客户端选择</label>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-top: 8px;">
                    <button type="button" class="client-btn" onclick="generateClientLink('clash', 'CLASH')">CLASH</button>
                    <button type="button" class="client-btn" onclick="generateClientLink('clash', 'STASH')">STASH</button>
                    <button type="button" class="client-btn" onclick="generateClientLink('surge', 'SURGE')">SURGE</button>
                    <button type="button" class="client-btn" onclick="generateClientLink('sing-box', 'SING-BOX')">SING-BOX</button>
                    <button type="button" class="client-btn" onclick="generateClientLink('loon', 'LOON')">LOON</button>
                    <button type="button" class="client-btn" onclick="generateClientLink('quanx', 'QUANTUMULT X')" style="font-size: 13px;">QUANTUMULT X</button>
                    <button type="button" class="client-btn" onclick="generateClientLink('v2ray', 'V2RAY')">V2RAY</button>
                    <button type="button" class="client-btn" onclick="generateClientLink('v2ray', 'V2RAYNG')">V2RAYNG</button>
                    <button type="button" class="client-btn" onclick="generateClientLink('v2ray', 'NEKORAY')">NEKORAY</button>
                    <button type="button" class="client-btn" onclick="generateClientLink('v2ray', 'Shadowrocket')" style="font-size: 13px;">Shadowrocket</button>
                </div>
                <div class="result-url" id="clientSubscriptionUrl" style="display: none; margin-top: 12px; padding: 12px; background: rgba(0, 122, 255, 0.1); border-radius: 8px; font-size: 13px; color: #007aff; word-break: break-all;"></div>
            </div>
            
            <div class="form-group">
                <label>IP版本选择</label>
                <div style="display: flex; gap: 16px; margin-top: 8px;">
                    <label class="checkbox-label">
                        <input type="checkbox" id="ipv4Enabled" checked>
                        <span>IPv4</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" id="ipv6Enabled" checked>
                        <span>IPv6</span>
                    </label>
                </div>
            </div>
            
            <div class="form-group">
                <label>运营商选择</label>
                <div style="display: flex; gap: 16px; flex-wrap: wrap; margin-top: 8px;">
                    <label class="checkbox-label">
                        <input type="checkbox" id="ispMobile" checked>
                        <span>移动</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" id="ispUnicom" checked>
                        <span>联通</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" id="ispTelecom" checked>
                        <span>电信</span>
                    </label>
                </div>
            </div>
            
            <div class="switch-group" style="margin-top: 20px;">
                <label>仅TLS节点</label>
                <div class="switch" id="switchTLS" onclick="toggleSwitch('switchTLS')"></div>
            </div>
            <small style="display: block; margin-top: -12px; margin-bottom: 12px; color: #86868b; font-size: 13px; padding-left: 0;">启用后只生成带TLS的节点，不生成非TLS节点（如80端口）</small>
        </div>
        
        <div class="card" style="margin-top: 16px;">
            <div class="form-group">
                <label>在线延迟测试</label>
                <input type="text" id="testHost" placeholder="输入IP或域名，例如: 1.1.1.1 或 example.com" style="margin-bottom: 12px;">
                <div style="display: flex; gap: 10px; margin-bottom: 12px;">
                    <input type="number" id="testPort" placeholder="端口" value="443" style="flex: 1; min-width: 0;">
                    <input type="number" id="testTimeout" placeholder="超时(ms)" value="5000" style="flex: 1; min-width: 0;">
                </div>
                <button type="button" class="btn btn-secondary" onclick="testSingleLatency()" id="testBtn" style="margin-top: 0;">测试延迟</button>
                <div id="testResult" style="display: none; margin-top: 12px; padding: 12px; background: rgba(142, 142, 147, 0.12); border-radius: 8px; font-size: 14px;"></div>
            </div>
            
            <div class="form-group" style="margin-top: 24px;">
                <label>批量测试延迟</label>
                <textarea id="batchTestHosts" placeholder="每行一个IP或域名，例如：&#10;1.1.1.1&#10;1.0.0.1&#10;example.com" style="width: 100%; padding: 14px 16px; font-size: 15px; font-weight: 400; color: #1d1d1f; background: rgba(142, 142, 147, 0.12); border: none; border-radius: 12px; outline: none; resize: vertical; min-height: 100px; font-family: inherit;"></textarea>
                <div style="display: flex; gap: 10px; margin-top: 12px;">
                    <input type="number" id="batchTestPort" placeholder="端口" value="443" style="flex: 1; min-width: 0;">
                    <input type="number" id="batchTestTimeout" placeholder="超时(ms)" value="5000" style="flex: 1; min-width: 0;">
                </div>
                <button type="button" class="btn btn-secondary" onclick="testBatchLatency()" id="batchTestBtn" style="margin-top: 12px;">批量测试</button>
                <div id="batchTestResult" style="display: none; margin-top: 12px; max-height: 400px; overflow-y: auto;"></div>
            </div>
        </div>
        
        <div class="footer">
            <p>简化版优选工具 • 仅用于节点生成</p>
            <div style="margin-top: 20px; display: flex; justify-content: center; gap: 24px; flex-wrap: wrap;">
                <a href="https://github.com/byJoey/cfnew" target="_blank" style="color: #007aff; text-decoration: none; font-size: 15px; font-weight: 500;">GitHub 项目</a>
                <a href="https://www.youtube.com/@joeyblog" target="_blank" style="color: #007aff; text-decoration: none; font-size: 15px; font-weight: 500;">YouTube @joeyblog</a>
            </div>
        </div>
    </div>
    
    <script>
        let switches = {
            switchDomain: true,
            switchIP: true,
            switchGitHub: true,
            switchVL: true,
            switchTJ: false,
            switchVM: false,
            switchTLS: false
        };
        
        function toggleSwitch(id) {
            const switchEl = document.getElementById(id);
            switches[id] = !switches[id];
            switchEl.classList.toggle('active');
        }
        
        
        // 订阅转换地址（从服务器注入）
        const SUB_CONVERTER_URL = "${ scu }";
        
        function tryOpenApp(schemeUrl, fallbackCallback, timeout) {
            timeout = timeout || 2500;
            let appOpened = false;
            let callbackExecuted = false;
            const startTime = Date.now();
            
            const blurHandler = () => {
                const elapsed = Date.now() - startTime;
                if (elapsed < 3000 && !callbackExecuted) {
                    appOpened = true;
                }
            };
            
            window.addEventListener('blur', blurHandler);
            
            const hiddenHandler = () => {
                const elapsed = Date.now() - startTime;
                if (elapsed < 3000 && !callbackExecuted) {
                    appOpened = true;
                }
            };
            
            document.addEventListener('visibilitychange', hiddenHandler);
            
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.style.width = '1px';
            iframe.style.height = '1px';
            iframe.src = schemeUrl;
            document.body.appendChild(iframe);
            
            setTimeout(() => {
                if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
                window.removeEventListener('blur', blurHandler);
                document.removeEventListener('visibilitychange', hiddenHandler);
                
                if (!callbackExecuted) {
                    callbackExecuted = true;
                    if (!appOpened && fallbackCallback) {
                        fallbackCallback();
                    }
                }
            }, timeout);
        }
        
        function generateClientLink(clientType, clientName) {
            const domain = document.getElementById('domain').value.trim();
            const uuid = document.getElementById('uuid').value.trim();
            const customPath = document.getElementById('customPath').value.trim() || '/';
            
            if (!domain || !uuid) {
                alert('请先填写域名和UUID');
                return;
            }
            
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
                alert('UUID格式不正确');
                return;
            }
            
            // 检查至少选择一个协议
            if (!switches.switchVL && !switches.switchTJ && !switches.switchVM) {
                alert('请至少选择一个协议（VLESS、Trojan或VMess）');
                return;
            }
            
            const ipv4Enabled = document.getElementById('ipv4Enabled').checked;
            const ipv6Enabled = document.getElementById('ipv6Enabled').checked;
            const ispMobile = document.getElementById('ispMobile').checked;
            const ispUnicom = document.getElementById('ispUnicom').checked;
            const ispTelecom = document.getElementById('ispTelecom').checked;
            
            const githubUrl = document.getElementById('githubUrl').value.trim();
            
            const currentUrl = new URL(window.location.href);
            const baseUrl = currentUrl.origin;
            let subscriptionUrl = \`\${baseUrl}/\${uuid}/sub?domain=\${encodeURIComponent(domain)}&epd=\${switches.switchDomain ? 'yes' : 'no'}&epi=\${switches.switchIP ? 'yes' : 'no'}&egi=\${switches.switchGitHub ? 'yes' : 'no'}\`;
            
            // 添加GitHub优选URL
            if (githubUrl) {
                subscriptionUrl += \`&piu=\${encodeURIComponent(githubUrl)}\`;
            }
            
            // 添加协议选择
            if (switches.switchVL) subscriptionUrl += '&ev=yes';
            if (switches.switchTJ) subscriptionUrl += '&et=yes';
            if (switches.switchVM) subscriptionUrl += '&vm=yes';
            
            if (!ipv4Enabled) subscriptionUrl += '&ipv4=no';
            if (!ipv6Enabled) subscriptionUrl += '&ipv6=no';
            if (!ispMobile) subscriptionUrl += '&ispMobile=no';
            if (!ispUnicom) subscriptionUrl += '&ispUnicom=no';
            if (!ispTelecom) subscriptionUrl += '&ispTelecom=no';
            
            // 添加TLS控制
            if (switches.switchTLS) subscriptionUrl += '&dkby=yes';
            
            // 添加自定义路径
            if (customPath && customPath !== '/') {
                subscriptionUrl += \`&path=\${encodeURIComponent(customPath)}\`;
            }
            
            let finalUrl = subscriptionUrl;
            let schemeUrl = '';
            let displayName = clientName || '';
            
            if (clientType === 'v2ray') {
                finalUrl = subscriptionUrl;
                const urlElement = document.getElementById('clientSubscriptionUrl');
                urlElement.textContent = finalUrl;
                urlElement.style.display = 'block';
                
                if (clientName === 'V2RAY') {
                    navigator.clipboard.writeText(finalUrl).then(() => {
                        alert(displayName + ' 订阅链接已复制');
                    });
                } else if (clientName === 'Shadowrocket') {
                    schemeUrl = 'shadowrocket://add/' + encodeURIComponent(finalUrl);
                    tryOpenApp(schemeUrl, () => {
                        navigator.clipboard.writeText(finalUrl).then(() => {
                            alert(displayName + ' 订阅链接已复制');
                        });
                    });
                } else if (clientName === 'V2RAYNG') {
                    schemeUrl = 'v2rayng://install?url=' + encodeURIComponent(finalUrl);
                    tryOpenApp(schemeUrl, () => {
                        navigator.clipboard.writeText(finalUrl).then(() => {
                            alert(displayName + ' 订阅链接已复制');
                        });
                    });
                } else if (clientName === 'NEKORAY') {
                    schemeUrl = 'nekoray://install-config?url=' + encodeURIComponent(finalUrl);
                    tryOpenApp(schemeUrl, () => {
                        navigator.clipboard.writeText(finalUrl).then(() => {
                            alert(displayName + ' 订阅链接已复制');
                        });
                    });
                }
            } else {
                const encodedUrl = encodeURIComponent(subscriptionUrl);
                finalUrl = SUB_CONVERTER_URL + '?target=' + clientType + '&url=' + encodedUrl + '&insert=false&emoji=true&list=false&xudp=false&udp=false&tfo=false&expand=true&scv=false&fdn=false&new_name=true';
                
                const urlElement = document.getElementById('clientSubscriptionUrl');
                urlElement.textContent = finalUrl;
                urlElement.style.display = 'block';
                
                if (clientType === 'clash') {
                    if (clientName === 'STASH') {
                        schemeUrl = 'stash://install?url=' + encodeURIComponent(finalUrl);
                        displayName = 'STASH';
                    } else {
                        schemeUrl = 'clash://install-config?url=' + encodeURIComponent(finalUrl);
                        displayName = 'CLASH';
                    }
                } else if (clientType === 'surge') {
                    schemeUrl = 'surge:///install-config?url=' + encodeURIComponent(finalUrl);
                    displayName = 'SURGE';
                } else if (clientType === 'sing-box') {
                    schemeUrl = 'sing-box://install-config?url=' + encodeURIComponent(finalUrl);
                    displayName = 'SING-BOX';
                } else if (clientType === 'loon') {
                    schemeUrl = 'loon://install?url=' + encodeURIComponent(finalUrl);
                    displayName = 'LOON';
                } else if (clientType === 'quanx') {
                    schemeUrl = 'quantumult-x://install-config?url=' + encodeURIComponent(finalUrl);
                    displayName = 'QUANTUMULT X';
                }
                
                if (schemeUrl) {
                    tryOpenApp(schemeUrl, () => {
                        navigator.clipboard.writeText(finalUrl).then(() => {
                            alert(displayName + ' 订阅链接已复制');
                        });
                    });
                } else {
                    navigator.clipboard.writeText(finalUrl).then(() => {
                        alert(displayName + ' 订阅链接已复制');
                    });
                }
            }
        }
        
        // 单个延迟测试
        async function testSingleLatency() {
            const host = document.getElementById('testHost').value.trim();
            const port = parseInt(document.getElementById('testPort').value) || 443;
            const timeout = parseInt(document.getElementById('testTimeout').value) || 5000;
            const testBtn = document.getElementById('testBtn');
            const testResult = document.getElementById('testResult');
            
            if (!host) {
                alert('请输入要测试的IP或域名');
                return;
            }
            
            testBtn.disabled = true;
            testBtn.textContent = '测试中...';
            testResult.style.display = 'none';
            
            try {
                const currentUrl = new URL(window.location.href);
                const baseUrl = currentUrl.origin;
                const testUrl = \`\${baseUrl}/test?host=\${encodeURIComponent(host)}&port=\${port}&timeout=\${timeout}\`;
                
                const response = await fetch(testUrl);
                const result = await response.json();
                
                testResult.style.display = 'block';
                
                if (result.success) {
                    testResult.innerHTML = \`
                        <div style="color: #34c759; font-weight: 600; margin-bottom: 8px;">✓ 测试成功</div>
                        <div style="color: #1d1d1f; margin-bottom: 4px;"><strong>延迟:</strong> \${result.latency}ms</div>
                        \${result.ip ? \`<div style="color: #1d1d1f; margin-bottom: 4px;"><strong>IP:</strong> \${result.ip}</div>\` : ''}
                        \${result.location ? \`<div style="color: #1d1d1f; margin-bottom: 4px;"><strong>位置:</strong> \${result.location}</div>\` : ''}
                        \${result.colo ? \`<div style="color: #1d1d1f;"><strong>数据中心:</strong> \${result.colo}</div>\` : ''}
                    \`;
                    testResult.style.background = 'rgba(52, 199, 89, 0.1)';
                } else {
                    testResult.innerHTML = \`
                        <div style="color: #ff3b30; font-weight: 600; margin-bottom: 8px;">✗ 测试失败</div>
                        <div style="color: #1d1d1f; margin-bottom: 4px;"><strong>延迟:</strong> \${result.latency}ms</div>
                        <div style="color: #1d1d1f;"><strong>错误:</strong> \${result.error || '未知错误'}</div>
                    \`;
                    testResult.style.background = 'rgba(255, 59, 48, 0.1)';
                }
            } catch (error) {
                testResult.style.display = 'block';
                testResult.innerHTML = \`
                    <div style="color: #ff3b30; font-weight: 600;">✗ 测试失败</div>
                    <div style="color: #1d1d1f; margin-top: 4px;">\${error.message || '网络错误'}</div>
                \`;
                testResult.style.background = 'rgba(255, 59, 48, 0.1)';
            } finally {
                testBtn.disabled = false;
                testBtn.textContent = '测试延迟';
            }
        }
        
        // 批量延迟测试
        async function testBatchLatency() {
            const hostsText = document.getElementById('batchTestHosts').value.trim();
            const port = parseInt(document.getElementById('batchTestPort').value) || 443;
            const timeout = parseInt(document.getElementById('batchTestTimeout').value) || 5000;
            const batchTestBtn = document.getElementById('batchTestBtn');
            const batchTestResult = document.getElementById('batchTestResult');
            
            if (!hostsText) {
                alert('请输入要测试的IP或域名列表');
                return;
            }
            
            const hosts = hostsText.split('\\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
            
            if (hosts.length === 0) {
                alert('请输入至少一个IP或域名');
                return;
            }
            
            batchTestBtn.disabled = true;
            batchTestBtn.textContent = \`测试中... (0/\${hosts.length})\`;
            batchTestResult.style.display = 'none';
            batchTestResult.innerHTML = '';
            
            try {
                const currentUrl = new URL(window.location.href);
                const baseUrl = currentUrl.origin;
                
                const response = await fetch(\`\${baseUrl}/batch-test\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        hosts: hosts,
                        port: port,
                        timeout: timeout,
                        concurrency: 5
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    batchTestResult.style.display = 'block';
                    let html = \`
                        <div style="padding: 12px; background: rgba(142, 142, 147, 0.12); border-radius: 8px; margin-bottom: 12px;">
                            <div style="font-weight: 600; margin-bottom: 4px;">测试完成</div>
                            <div style="font-size: 13px; color: #86868b;">成功: \${data.successCount} / 总计: \${data.total}</div>
                        </div>
                    \`;
                    
                    data.results.forEach((result, index) => {
                        const bgColor = result.success ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)';
                        const statusColor = result.success ? '#34c759' : '#ff3b30';
                        const statusText = result.success ? '✓' : '✗';
                        
                        html += \`
                            <div style="padding: 12px; background: \${bgColor}; border-radius: 8px; margin-bottom: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                    <div style="font-weight: 600; color: \${statusColor};">\${statusText} \${result.host}:\${result.port}</div>
                                    <div style="font-weight: 600; color: #1d1d1f;">\${result.latency}ms</div>
                                </div>
                                \${result.success ? \`
                                    \${result.ip ? \`<div style="font-size: 13px; color: #86868b;">IP: \${result.ip}</div>\` : ''}
                                    \${result.location ? \`<div style="font-size: 13px; color: #86868b;">位置: \${result.location}</div>\` : ''}
                                    \${result.colo ? \`<div style="font-size: 13px; color: #86868b;">数据中心: \${result.colo}</div>\` : ''}
                                \` : \`
                                    <div style="font-size: 13px; color: #ff3b30;">错误: \${result.error || '未知错误'}</div>
                                \`}
                            </div>
                        \`;
                    });
                    
                    batchTestResult.innerHTML = html;
                } else {
                    batchTestResult.style.display = 'block';
                    batchTestResult.innerHTML = \`
                        <div style="padding: 12px; background: rgba(255, 59, 48, 0.1); border-radius: 8px; color: #ff3b30;">
                            测试失败: \${data.error || '未知错误'}
                        </div>
                    \`;
                }
            } catch (error) {
                batchTestResult.style.display = 'block';
                batchTestResult.innerHTML = \`
                    <div style="padding: 12px; background: rgba(255, 59, 48, 0.1); border-radius: 8px; color: #ff3b30;">
                        网络错误: \${error.message || '未知错误'}
                    </div>
                \`;
            } finally {
                batchTestBtn.disabled = false;
                batchTestBtn.textContent = '批量测试';
            }
        }
        
        // 支持回车键触发测试
        document.addEventListener('DOMContentLoaded', function() {
            const testHostInput = document.getElementById('testHost');
            if (testHostInput) {
                testHostInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        testSingleLatency();
                    }
                });
            }
        });
    </script>
</body>
</html>`;
}

// 主处理函数
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        
        // 主页
        if (path === '/' || path === '') {
            const scuValue = env?.scu || scu;
            return new Response(generateHomePage(scuValue), {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }
        
        // 在线测试延迟 API: /test?host=xxx&port=443
        if (path === '/test') {
            const host = url.searchParams.get('host');
            const port = parseInt(url.searchParams.get('port') || '443');
            const timeout = parseInt(url.searchParams.get('timeout') || '5000');
            
            if (!host) {
                return new Response(JSON.stringify({ 
                    success: false, 
                    error: '缺少host参数' 
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json; charset=utf-8' }
                });
            }
            
            const result = await testLatency(host, port, timeout);
            return new Response(JSON.stringify(result, null, 2), {
                headers: { 
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            });
        }
        
        // 批量测试延迟 API: /batch-test
        if (path === '/batch-test') {
            if (request.method === 'OPTIONS') {
                return new Response(null, {
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    }
                });
            }
            
            if (request.method === 'POST') {
                try {
                    const body = await request.json();
                    const hosts = body.hosts || [];
                    const port = parseInt(body.port || '443');
                    const timeout = parseInt(body.timeout || '5000');
                    const concurrency = parseInt(body.concurrency || '5');
                    
                    if (!Array.isArray(hosts) || hosts.length === 0) {
                        return new Response(JSON.stringify({ 
                            success: false, 
                            error: 'hosts必须是非空数组' 
                        }), {
                            status: 400,
                            headers: { 
                                'Content-Type': 'application/json; charset=utf-8',
                                'Access-Control-Allow-Origin': '*'
                            }
                        });
                    }
                    
                    const results = await batchTestLatency(hosts, port, timeout, concurrency);
                    return new Response(JSON.stringify({ 
                        success: true, 
                        results: results,
                        total: results.length,
                        successCount: results.filter(r => r.success).length
                    }, null, 2), {
                        headers: { 
                            'Content-Type': 'application/json; charset=utf-8',
                            'Access-Control-Allow-Origin': '*'
                        }
                    });
                } catch (error) {
                    return new Response(JSON.stringify({ 
                        success: false, 
                        error: error.message 
                    }), {
                        status: 500,
                        headers: { 
                            'Content-Type': 'application/json; charset=utf-8',
                            'Access-Control-Allow-Origin': '*'
                        }
                    });
                }
            }
        }
        
        // 测试优选API API: /test-optimize-api?url=xxx&port=443
        if (path === '/test-optimize-api') {
            if (request.method === 'OPTIONS') {
                return new Response(null, {
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    }
                });
            }
            
            const apiUrl = url.searchParams.get('url');
            const port = url.searchParams.get('port') || '443';
            const timeout = parseInt(url.searchParams.get('timeout') || '3000');
            
            if (!apiUrl) {
                return new Response(JSON.stringify({ 
                    success: false, 
                    error: '缺少url参数' 
                }), {
                    status: 400,
                    headers: { 
                        'Content-Type': 'application/json; charset=utf-8',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }
            
            try {
                const results = await 请求优选API([apiUrl], port, timeout);
                return new Response(JSON.stringify({ 
                    success: true, 
                    results: results,
                    total: results.length,
                    message: `成功获取 ${results.length} 个优选IP`
                }, null, 2), {
                    headers: { 
                        'Content-Type': 'application/json; charset=utf-8',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            } catch (error) {
                return new Response(JSON.stringify({ 
                    success: false, 
                    error: error.message 
                }), {
                    status: 500,
                    headers: { 
                        'Content-Type': 'application/json; charset=utf-8',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }
        }
        
        // 订阅请求格式: /{UUID}/sub?domain=xxx&epd=yes&epi=yes&egi=yes
        const pathMatch = path.match(/^\/([^\/]+)\/sub$/);
        if (pathMatch) {
            const uuid = pathMatch[1];
            
            if (!isValidUUID(uuid)) {
                return new Response('无效的UUID格式', { status: 400 });
            }
            
            const domain = url.searchParams.get('domain');
            if (!domain) {
                return new Response('缺少域名参数', { status: 400 });
            }
            
            // 从URL参数获取配置
            epd = url.searchParams.get('epd') !== 'no';
            epi = url.searchParams.get('epi') !== 'no';
            egi = url.searchParams.get('egi') !== 'no';
            const piu = url.searchParams.get('piu') || defaultIPURL;
            
            // 协议选择
            const evEnabled = url.searchParams.get('ev') === 'yes' || (url.searchParams.get('ev') === null && ev);
            const etEnabled = url.searchParams.get('et') === 'yes';
            const vmEnabled = url.searchParams.get('vm') === 'yes';
            
            // IPv4/IPv6选择
            const ipv4Enabled = url.searchParams.get('ipv4') !== 'no';
            const ipv6Enabled = url.searchParams.get('ipv6') !== 'no';
            
            // 运营商选择
            const ispMobile = url.searchParams.get('ispMobile') !== 'no';
            const ispUnicom = url.searchParams.get('ispUnicom') !== 'no';
            const ispTelecom = url.searchParams.get('ispTelecom') !== 'no';
            
            // TLS控制
            const disableNonTLS = url.searchParams.get('dkby') === 'yes';
            
            // 自定义路径
            const customPath = url.searchParams.get('path') || '/';
            
            return await handleSubscriptionRequest(request, uuid, domain, piu, ipv4Enabled, ipv6Enabled, ispMobile, ispUnicom, ispTelecom, evEnabled, etEnabled, vmEnabled, disableNonTLS, customPath);
        }
        
        return new Response('Not Found', { status: 404 });
    }
};

