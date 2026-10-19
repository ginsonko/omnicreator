# 万能创作终端 · OmniCreator

把 Codex / Claude Code 变成你的创作引擎的桌面软件：在对话里直接出图、出视频、做漫剧、剪辑和讲题视频。

- 官网与下载：https://ginsonko.github.io/omnicreator/
- 安装包：见本仓库 [Releases](https://github.com/ginsonko/omnicreator/releases)（Windows 安装版 / 免安装版，macOS Apple 芯片 / Intel）
- 交流反馈 QQ 群：1131210592

个人使用免费；公司、学校等机构或大范围商用，请先联系授权合作。

## 使用手册

- [通用版快速上手](docs/通用版快速上手.md) · [通用版使用手册](docs/通用版使用手册.md)：接任何标准 new-api / OpenAI 兼容站点
- [智能路由站点快速上手](docs/第三方智能路由站点快速上手.md) · [第三方智能路由站点接入手册](docs/第三方智能路由站点接入手册.md)：站点支持智能 Key 与一键导入时使用

## 仓库内容

| 目录 | 内容 |
| --- | --- |
| `site/` | 官网（纯静态 HTML/CSS/JS，无构建步骤）。下载信息、教程视频、合作站点信息都在 `site/config.json` |
| `docs/` | 使用手册 |
| `update/` | 应用内更新清单的发布位置（发布时放入 `omni-update-neutral.json`） |
| `scripts/` | `check-site.mjs` 站点检查、`make-partner-zip.py` 打包合作站点静态包、`make-images.py` 生成图标与封面 |

### 维护官网

```
node scripts/check-site.mjs --sync      # 修改 config.json 后，同步 file:// 预览用的配置副本
node scripts/check-site.mjs             # 违禁字样、链接、config 结构、无头浏览器检查与截图
python scripts/make-partner-zip.py      # 生成 dist/omnicreator-site-<版本>.zip
```

合作站点如何修改与部署，见 [site/PARTNER_README.md](site/PARTNER_README.md)。推送到 `main` 且改动了 `site/` 时，`.github/workflows/pages.yml` 会发布到 GitHub Pages。
