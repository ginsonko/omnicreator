# update/ · 通用版更新源

`omni-update-neutral.json` 是万能创作终端（通用版）检查更新时读取的更新清单（schema `omni-update/1`）。软件读取到比自己新的版本后会提示用户，可以「立即更新」「稍后」或「跳过此版本」，**从不强制更新**。

软件按顺序尝试这三个地址（写在软件的版本配置里），任何一个能读到就行：

1. `https://cdn.jsdelivr.net/gh/ginsonko/omnicreator@main/update/omni-update-neutral.json`
2. `https://ginsonko.github.io/omnicreator/update/omni-update-neutral.json`（由 `.github/workflows/pages.yml` 把本目录的清单一起发布到 Pages）
3. `https://raw.githubusercontent.com/ginsonko/omnicreator/main/update/omni-update-neutral.json`

注意：

- 清单由发布流程根据真实的安装包（版本号、文件名、字节数、SHA256）生成，不要手工编造。
- 下载地址指向 `https://github.com/ginsonko/omnicreator/releases/download/v<版本号>/<文件名>`。Windows 用 Setup / Portable 的 exe，Mac 用同名的 `.zip`（网站上给用户的是 `.dmg`，两者是同一个应用）。
- 发布后可以用浏览器直接打开上面的地址，确认内容和 GitHub Release 上的文件一致。jsDelivr 有缓存，更新后可能要等一会儿才生效。
