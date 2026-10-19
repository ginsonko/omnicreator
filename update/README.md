# update/ · 更新源占位目录

这个目录目前是空的，只放这份说明。

发布正式版本时，会在这里放一个 `omni-update-neutral.json`，作为万能创作终端（通用版）检查更新时读取的更新清单。软件读取到比自己新的版本后，会提示用户「一键更新」，**从不强制更新**。

注意：

- 不要手工编造或提前放入 `omni-update-neutral.json`。它由发布流程根据真实的安装包（版本号、文件名、大小、SHA256）生成。
- 清单里的下载地址应指向 `https://github.com/ginsonko/omnicreator/releases/download/v<版本号>/<文件名>`，可以另附镜像地址。
- 发布后可以用浏览器直接打开该 JSON 文件，确认内容和 GitHub Release 上的文件一致。
