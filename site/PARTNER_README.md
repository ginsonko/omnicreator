# 万能创作终端 · 合作站点静态页使用说明

这是「万能创作终端」（OmniCreator）的官方下载与介绍页，打包成了纯静态网页。如果你运营一个 API 站点（例如基于 new-api 搭建），可以把它放在自己的域名下，给你的用户提供下载和使用指引，并在页面上显示你的站点名称、注册入口和联系方式。

- 不需要数据库、不需要后端、不需要编译。
- 只改一个文件：`config.json`。
- 页面里的软件名称「万能创作终端」保持不变；你的站点信息会显示在顶部横条、「连接站点」区域和页脚。
- 页面不包含任何统计或追踪脚本，不加载外部字体，国内访问速度快。

## 一、文件说明

```
omnicreator-site-<版本号>/
├─ index.html              页面
├─ config.json             ← 只需要改这个文件
├─ site.webmanifest
├─ PARTNER_README.md       本说明（可以不上传）
└─ assets/
   ├─ css/site.css
   ├─ js/site.js
   ├─ js/config-fallback.js   直接双击打开 index.html 预览时使用的配置副本
   └─ img/                  图标、封面、截图
```

## 二、修改 config.json

用任意文本编辑器（推荐 VS Code、Notepad++；**不要用 Word**）打开 `config.json`，保存时选 **UTF-8** 编码。

### 1. 合作站点信息（`partner`）

```json
"partner": {
  "enabled": true,
  "name": "某某 API",
  "url": "https://api.example.com/",
  "register_url": "https://api.example.com/register",
  "token_page_url": "https://api.example.com/console/token",
  "logo": "assets/img/partner-logo.png",
  "contact": "QQ 群 12345678",
  "one_click_import": true,
  "notice": "新用户注册即送体验额度，详情见站点公告。"
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `enabled` | 是 | `true` 才会显示合作站点信息；`false` 时页面是通用版样子 |
| `name` | 开启时必填 | 你的站点名称，会显示在顶部横条、步骤和按钮里 |
| `url` | 建议 | 站点首页地址 |
| `register_url` | 建议 | 注册页地址；留空时使用 `url` |
| `token_page_url` | 可选 | 令牌 / API Key 页面地址，显示一个「打开令牌页」按钮 |
| `logo` | 可选 | 站点 Logo，正方形 PNG / WebP，建议 96×96。可以放进 `assets/img/` 写相对路径，也可以写 https 地址 |
| `contact` | 可选 | 你的客服或用户群，例如 `QQ 群 12345678`、`客服微信 xxx` |
| `one_click_import` | 是 | 站点支持「智能路由 + 一键导入到万能创作终端」时填 `true`，页面会主推一键导入；否则填 `false`，页面主推手动配置 |
| `notice` | 可选 | 一段公告文字，显示在首屏下载按钮下方。只支持纯文字，不支持 HTML |

### 2. 其他可以改的地方

| 位置 | 说明 |
| --- | --- |
| `release.assets.*.mirror` | 如果你在自己的服务器或对象存储上提供安装包镜像，填镜像下载地址，卡片上会出现「国内镜像」按钮。**请保证文件与 GitHub 发布的完全一致**（可用页面上的 SHA256 核对） |
| `release.mirror_note` | 「GitHub 下载很慢？」里显示的文字，可以写你的镜像说明 |
| `videos[].url` / `videos[].embed` | 教程视频链接。`url` 填视频页面（新窗口打开）或 mp4 地址（页面内播放）；`embed` 填播放器嵌入地址。官方视频上线后会随站点包更新，一般不用改 |
| `videos[].chapters[].start` | 新手教程的章节开始时间（`m:ss`）。填了视频地址后每一章都要有时间，点章节会跳到那里 |

### 3. 请不要修改

- `product.name`（软件名称「万能创作终端」）、`community`（官方用户群）和页面上的「使用许可」内容。
- `release.version`、`release.assets` 里的 `url`、`size`、`bytes`、`sha256`：这些跟随官方发布更新。官方发布新版本时，下载最新的站点包，把你的 `partner` 部分复制过去即可。
- 不要在页面中加入会误导用户的内容，例如声称软件归你所有，或修改安装包。

改完后，在本目录运行下面任一命令，在浏览器打开 `http://localhost:8000` 预览：

```
python -m http.server 8000
npx serve -l 8000
```

> 直接双击 `index.html` 也能打开，但这时浏览器不允许读取 `config.json`，页面会使用 `assets/js/config-fallback.js` 里的默认配置，看不到你的修改。以本地服务器或正式部署的效果为准。

## 三、部署到任意静态托管

把整个文件夹（除 `PARTNER_README.md` 外）上传即可。`index.html` 必须在网站根目录或某个子目录的根部，所有路径都是相对路径，放在子目录（例如 `https://example.com/omni/`）也能用。

### 方式 A：Nginx

```nginx
server {
    listen 80;
    server_name omni.example.com;
    root /var/www/omnicreator-site;
    index index.html;

    location = /config.json { add_header Cache-Control "no-cache"; }
    location /assets/ { add_header Cache-Control "public, max-age=604800"; }
    types { application/manifest+json webmanifest; }
    gzip on;
    gzip_types text/css application/javascript application/json;
}
```

上传后执行 `nginx -t` 检查配置，再 `nginx -s reload`。建议配好 HTTPS（例如使用 Let’s Encrypt）。

### 方式 B：对象存储（阿里云 OSS、腾讯云 COS、七牛等）

1. 新建一个存储桶，权限设为「公共读」。
2. 开启「静态网站托管」，默认首页填 `index.html`。
3. 把文件夹里的所有文件按原目录结构上传。
4. 绑定自己的域名（国内存储桶需要已备案的域名），开启 HTTPS。
5. 给 `config.json` 设置 `Cache-Control: no-cache`，以后修改配置能马上生效。

### 方式 C：宝塔面板 / 虚拟主机

新建站点 → 把文件上传到站点根目录 → 访问域名即可。

### 方式 D：GitHub Pages、Cloudflare Pages、Vercel、Netlify

把文件夹作为仓库根目录上传，构建命令留空，输出目录填 `/`（或文件夹名）。

## 四、上线前检查

- [ ] 顶部横条显示了你的站点名称，链接能打开。
- [ ] 「连接站点」区域的注册按钮指向你的注册页。
- [ ] 四个下载按钮都能开始下载（或跳到 GitHub 发布页）。
- [ ] 如果配置了镜像，下载的文件 SHA256 与页面一致。
- [ ] 手机上打开排版正常。

## 五、需要帮助

加入官方用户群 QQ 群 1131210592。企业、学校等机构使用软件需获得授权，也请在群里联系。
