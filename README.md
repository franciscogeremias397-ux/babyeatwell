# 宝贝乖乖吃饭

这是根据交接文档和本机素材恢复出的微信小程序源码。

## 当前状态

- 已恢复小程序基础结构，可用微信开发者工具导入当前目录。
- 已恢复总入口页、监督吃饭通话页、食谱首页、宝宝档案、一周食谱、随机一餐和食谱详情页。
- 食谱数据来自 `data/recipes.json` 等结构化数据文件。
- 监督吃饭视频资源继续使用 CloudBase 公网域名 `https://sg.gouqii.com`，不把大视频放入小程序包。
- 已在微信开发者工具中本地验证：食谱流程、宝宝档案、一周食谱、随机一餐、监督吃饭拨打/提醒/鼓励/结束均可运行。

## 导入前需要确认

`project.config.json` 里的 `appid` 已设置为 `wxd23e3a3fbd980d36`。

## 素材策略

CloudBase 文件存储仍是视频、音频等大资源的来源。公网播放域名使用：

`https://sg.gouqii.com`

当前监督吃饭模块会优先尝试交接记录中的路径：

`https://sg.gouqii.com/guai-guai-chi-fan/assets/miniprogram-hq-20260604`

如果具体文件路径与云端不同，需要只改 `pages/supervise/assets.js`。

当前已确认云端实际视频路径带有分类子目录，例如：

- `videos/opening/opening-001.mp4`
- `videos/idle/idle-001.mp4`
- `videos/praise/praise-001.mp4`
- `videos/warning/warning-001.mp4`
- `videos/finish/finish-001.mp4`

呼叫等待铃声当前使用小程序包内的 `/assets/audio/ringtone.m4a`；正式通话视频不分离音轨，直接播放云端 MP4 自带声音。

## 上传提醒

当前恢复版只做了本地导入和验证，尚未点击微信开发者工具的“上传”。上传或重新提交审核前，先确认这是要覆盖旧审核通过版本的新版本。
