# Inteyvat-Wiki

原神文本与资料研究站点，由 Inteyvat-Wiki 组织维护。项目代码采用 [MIT 许可](LICENSE)，原始作者与贡献记录保留在 Git 历史中。游戏文本、图片及其他第三方内容不因代码许可而获得再授权，来源与许可边界见 [NOTICES.md](NOTICES.md)。本项目为非官方社区项目，不代表游戏权利人。

服务端为独立的 [wiki-server](https://github.com/Inteyvat-Wiki/wiki-server) 子模块，应保留其许可证与署名说明。

随附图标及 favicon 的来源记录见 [ASSETS.md](ASSETS.md)。

## 共享数据协议

Wiki 与 wiki-data 共同使用 [`@inteyvat-wiki/wiki-contracts`](https://github.com/Inteyvat-Wiki/wiki-contracts)，维护已转换的文档、页面响应、对话和基础校验，不包含游戏原始数据。当前通过本地 npm 依赖接入：将该仓库克隆到与本仓库同级的 `Inteyvat-Wiki-contracts` 文件夹，在其中执行 `npm install`、`npm run build`，再在本仓库执行 `npm install`。修改契约源码后需重新构建；发布包已包含产物，安装时不编译。server 子模块也使用主仓库安装的此依赖，无需单独安装。纯公共类型直接从包导入，本地 types 仅保留扩展与语义适配。

纯转发的旧类型文件已移除；`app/types` 与 `shared` 仅保留实际适配及展示逻辑。原始键映射仍在 wiki-data。普通内容通过公共包 `registry` 将栏目绑定到导出文档、列表和展示响应，地图与菜单维持独立协议。JSON 读取首先返回 unknown；服务端 `content_boundary` 检查容器、基础页面及部分语义字段，并明确保留对可信导出文档的内部信任边界，不能视为完整深层校验。

常规验证为 `npm run typecheck`、`npm run test:misc`、`npm run typecheck:misc`、`npm run typecheck:content` 和 `npm run build`。后两项使用 Vue 类型检查器，包含目录组合、错误泛型、未校验 JSON 等编译期反例。服务端与共享代码也可分别用 `tsc --noEmit -p .nuxt/tsconfig.server.json` 和 `tsc --noEmit -p .nuxt/tsconfig.shared.json` 检查；先执行 `nuxt prepare`。

`npm run check` 是不依赖游戏导出的统一入口，包含应用、服务端、共享代码与检查脚本的类型检查，以及内容读取、地图、装扮的合成数据回归。`test:misc` 仍用于核验本地正式数据，不作为无游戏输入环境的前提。

内容详情每次读取一份当前 ID 索引，不再跨请求永久缓存；新增和删除条目无需重启才能识别。发布时仍应先在独立目录完成导出及检查，再整体切换数据目录，避免上传半途混合新旧文件；这不是逐文件上传的事务保证。

## 开发说明（Nuxt starter）

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
