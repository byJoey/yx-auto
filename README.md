# 服务器优选工具

一个简化版的Cloudflare Workers优选工具，用来生成订阅链接。

GitHub: https://github.com/byJoey/yx-auto

## 主要功能

- 优选域名：内置了一些常用的优选域名
- 优选IP：从wetest.vip获取动态IP，支持IPv4/IPv6
- GitHub优选：可以从GitHub仓库拉取IP列表
- 多协议支持：VLESS、Trojan、VMess
- 传输方式可选：WebSocket（默认）或 XHTTP（`mode=auto`）
- 多客户端格式：Clash、Surge、Quantumult X等
- 运营商筛选：可以按移动/联通/电信筛选

## 部署

1. 去Cloudflare Dashboard，找到Workers & Pages
2. 创建个新Worker
3. 把`_worker.js`的代码复制进去
4. 保存部署就完事了

## 使用

打开你的Worker地址，会看到一个界面：

1. 填域名和UUID
2. 选择传输方式（WebSocket/XHTTP）和与服务端一致的路径
3. 选协议（VLESS/Trojan/VMess）
4. 选客户端类型并生成订阅链接

就这么简单。

## 订阅链接格式

生成的链接大概长这样：
```
https://your-worker.workers.dev/{UUID}/sub?domain=your-domain.com&epd=yes&epi=yes&egi=yes
```

XHTTP 节点在订阅地址中加入 `&transport=xhttp`。生成的节点使用
`type=xhttp&mode=auto`；不传 `transport` 或传入其他值时仍使用 WebSocket，
因此已有订阅链接无需修改。

可以通过`&target=`参数指定输出格式：
- `base64` - 默认格式
- `clash` - Clash配置
- `surge` - Surge配置  
- `quantumult` - Quantumult配置

## URL参数

所有配置都通过URL参数控制，不需要环境变量。

主要参数：
- `domain` - 你的域名（必填）
- `epd` - 启用优选域名（默认yes）
- `epi` - 启用优选IP（默认yes）
- `egi` - 启用GitHub优选（默认yes）
- `piu` - 自定义IP来源URL（可选）
- `ev` - 启用VLESS（默认yes）
- `et` - 启用Trojan（默认no）
- `mess` - 启用VMess（默认no，注意不是vm，会被屏蔽）
- `transport` - 传输方式：`ws`（默认）或 `xhttp`
- `path` - WebSocket/XHTTP 路径（默认`/`，应与服务端一致）
- `ipv4/ipv6` - IP版本选择（默认都开启）
- `ispMobile/ispUnicom/ispTelecom` - 运营商筛选（默认都开启）
- `target` - 输出格式（base64/clash/surge/quantumult）

## 注意事项

- 这只是一个订阅生成工具，不提供代理服务
- 生成的节点需要配合你自己的服务器使用
- 使用XHTTP时，客户端内核和服务端均需支持XHTTP，且域名、路径必须与服务端配置一致
- UUID必须是标准格式（xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx）
- VMess参数用的是`mess`不是`vm`，因为`vm`会被某些地方屏蔽
