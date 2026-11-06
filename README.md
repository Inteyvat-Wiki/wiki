# Inteyvat-Wiki

原神文本与资料研究站点，由 Inteyvat-Wiki 组织维护。项目代码采用 [MIT 许可](LICENSE)，原始作者与贡献记录保留在 Git 历史中。游戏文本、图片及其他第三方内容不因代码许可而获得再授权，来源与许可边界见 [NOTICES.md](NOTICES.md)。本项目为非官方社区项目，不代表游戏权利人。

服务端为独立的 [wiki-server](https://github.com/Inteyvat-Wiki/wiki-server) 子模块，应保留其许可证与署名说明。

随附图标及 favicon 的来源记录见 [ASSETS.md](ASSETS.md)。

## 共享数据协议

Wiki 与 wiki-data 共同使用 [`@inteyvat-wiki/wiki-contracts`](https://github.com/Inteyvat-Wiki/wiki-contracts)，维护已转换的文档、页面响应、对话和基础校验，不包含游戏原始数据。代码依赖使用明确版本的 `@inteyvat-wiki` npm 包，不要求源码仓库相邻或消费方先构建共享包；发布包包含产物，server 子模块使用主仓库安装的依赖，无需单独安装。纯公共类型直接从包导入，本地 types 仅保留扩展与语义适配。

当前首批版本尚未正式发布到 npm：维护者使用 wiki-data 仓库的 `npm run packages:local -- --help` 所述显式打包配置，提供源码位置并生成真实 tarball，通过本地包/registry 流程验证与安装，不链接源码、不发布远端。普通消费方不需要同级 clone/build；正式发布后按锁文件执行 `npm ci` 即可。未发布前的本地包验证不能视为公共 registry 已可下载这些版本。

纯转发的旧类型文件已移除；`app/types` 与 `shared` 仅保留实际适配及展示逻辑。原始键映射仍在 wiki-data。普通内容通过公共包 `registry` 将栏目绑定到导出文档、列表和展示响应，地图与菜单维持独立协议。JSON 读取首先返回 unknown；服务端 `content_boundary` 检查容器、基础页面及部分语义字段，并明确保留对可信导出文档的内部信任边界，不能视为完整深层校验。

常规验证为 `npm run typecheck`、`npm run test:misc`、`npm run typecheck:misc`、`npm run typecheck:content` 和 `npm run build`。后两项使用 Vue 类型检查器，包含目录组合、错误泛型、未校验 JSON 等编译期反例。服务端与共享代码也可分别用 `tsc --noEmit -p .nuxt/tsconfig.server.json` 和 `tsc --noEmit -p .nuxt/tsconfig.shared.json` 检查；先执行 `nuxt prepare`。

`npm run check` 是不依赖游戏导出的统一入口，包含应用、服务端、共享代码与检查脚本的类型检查，以及内容读取、地图、装扮、完整上传的合成数据回归。`test:misc` 仍用于核验本地正式数据，不作为无游戏输入环境的前提。

内容详情每次读取一份当前 ID 索引，不再跨请求永久缓存；新增和删除条目无需重启才能识别。认证完整上传通过不可变 release 和原子指针切换生效，整次服务端响应固定同一数据版本，避免多文件读取混用新旧文件。

## 开发说明（Nuxt starter）

### 数据目录（开发与 Node 生产服务）

`WIKI_DATA_ROOT` 是服务端 JSON 与 `/images/**` 的同一个数据根目录。支持绝对路径；相对路径固定相对于构建时的 Wiki 项目根目录，不相对于启动命令的工作目录或 `.output/server`。未设置或为空时使用现有的 `Wiki/data`，不会探测相邻 wiki-data 仓库。

例如在 PowerShell 中设置 `$env:WIKI_DATA_ROOT = 'D:/exports/wiki'` 后运行 `npm run dev`，或运行 `node .output/server/index.mjs`。目录应包含 `common/`、`zh_hans/`、`en/`、`images/`。让生成器直接输出到同一目录即可，无需人工移动数据。

此变量在服务进程运行时读取，不会在构建时固化数据目录。生产产物移动到其他机器时，请在启动前设置该机器上的绝对路径；未设置时，兼容默认值仍指向构建时的 Wiki 项目目录。改变启动环境后需重启服务。

图片通过只读文件路由提供，不再由 Nitro `publicAssets` 复制到 `.output/public/images`；JSON 与图片会一起使用当前配置，新增图片无需重建。此配置针对带 Node 服务的开发/生产运行，不提供纯静态托管的数据发布。不要让反向代理另行提供旧的 `/images` 副本。目录路径属于私有服务端配置，不进入前端数据协议。

服务端仅接收已转换的完整 Wiki 数据，不提取游戏原始数据。设置随机 32 字节编码成的 64 位小写十六进制 `WIKI_UPLOAD_TOKEN` 后，受保护的 `GET /api/admin/data` 返回当前 release 与上传限制，`POST /api/admin/data` 接收完整二进制数据包。未配置密钥即禁用（503）；密钥只通过 Bearer 请求头提交，不放进 URL、Cookie 或前端配置，浏览器 Origin 被拒绝。POST 必须携带 GET 得到的 `x-wiki-base-release`（首次为 `none`），缺失 428、冲突/并发 409。完整文件哈希、共享契约、JSON/PNG、32 字节完成尾标及 EOF 全部通过才切换。

管理状态位于同级 `${WIKI_DATA_ROOT}.publish`，不污染原导出目录或图片目录。第一次发布前仍读原目录；首次空部署只需安全且已存在的父目录，不必手工复制/创建数据目录。发布后读选中 release，修改原目录不再自动激活，必须重新发布。原数据与旧 release 保留，同 manifest 重发不会覆盖已存在 release。默认限制为 250000 文件、单文件 256 MiB、总文件 20 GiB、manifest 64 MiB、总超时 30 分钟、空闲 60 秒；可用 `WIKI_UPLOAD_MAX_FILES`、`WIKI_UPLOAD_MAX_FILE_BYTES`、`WIKI_UPLOAD_MAX_BYTES`、`WIKI_UPLOAD_MAX_MANIFEST_BYTES`、`WIKI_UPLOAD_TIMEOUT_MS`、`WIKI_UPLOAD_IDLE_TIMEOUT_MS` 降低限制。

生产管理接口必须经 TLS 反向代理暴露，Node 后端限制在回环/受控网络。代理 body limit 须另计 manifest/帧/尾标开销（默认可设 21 GiB），配置至少 30 分钟整请求与响应等待、至少 60 秒空闲预算，并避免缓冲巨型请求或记录认证头/请求体。Node 的默认 300 秒整请求截止与空闲超时不同，默认不改动；超过五分钟的上传必须在启动适配器配置足够的 server.requestTimeout，或显式启用 `WIKI_UPLOAD_EXTEND_NODE_TIMEOUT=1`。该开关会在认证上传时提升整个监听器的截止，包括其他路由，因此必须结合代理各路由限制和后端网络隔离；上传自身总时间仍受限。不会盲目信任 forwarded 请求头或启用 CORS。锁恢复、持久化平台差异、线格式、验证边界及部署说明详见 [server/README.md](server/README.md)。

上传回归：`node scripts/check_upload_http.mjs`，只用临时合成数据运行真实 HTTP 测试，不读写正式数据、不执行远程部署。

回归检查：`node scripts/check_data_root.mjs`（合成数据）；完整构建后可运行 `node scripts/check_data_root.mjs --production .output/server/index.mjs`，从不同工作目录启动真实产物并验证运行时目录切换。前者也包含在现有内容读取检查中。

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
