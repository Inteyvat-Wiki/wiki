# Attribution and licensing notes

## Project code

Inteyvat-Wiki is maintained by the Inteyvat-Wiki organization. Project-authored code is provided under the [MIT License](LICENSE). Preserve existing copyright notices; Git history records individual contributions. Third-party code and assets retain their own applicable terms.

## Application and server

The application uses Nuxt, Vue and Element Plus and other dependencies listed in package.json. These projects retain their own copyright and license notices. The `server` directory is the separate [wiki-server](https://github.com/Inteyvat-Wiki/wiki-server) repository; preserve its LICENSE and NOTICES.md when distributing it.

Published game data is prepared by [wiki-data](https://github.com/Inteyvat-Wiki/wiki-data), using derivatives of theBowja's genshin-db and GenshinData-scripts. This attribution does not imply endorsement by their original authors. Keep upstream code notices when including that code; do not describe all published game content as MIT-licensed.

## Game content and external material

Genshin Impact / 原神 is a game by miHoYo / HoYoverse. Game text, images, audio, Lua, other assets, names and trademarks remain subject to their respective rights holders' rights. Extraction, conversion, hosting or display does not transfer ownership or grant permission to redistribute that content. The code's MIT license does not independently relicense game content in generated data, caches or website resources. External datasets and community-authored material must retain their applicable source and license information.

This is an unofficial community project, not affiliated with or endorsed by the game rights holders.

## Dependencies and maintenance

### Embedded asset provenance

`app/assets/icons/sparkle.svg` matches Glyphs' `sparkle-bold` path exactly. Glyphs is by Goran Spasojevic and licensed under MIT; the complete original text is retained at [public/licenses/glyphs-MIT.txt](public/licenses/glyphs-MIT.txt), served as `/licenses/glyphs-MIT.txt`. Preserve it with deployments containing the icon. This attribution follows the original icon set rather than the license of an unrelated aggregator.

For `public/favicon.svg`, the project owner states that its embedded flower image was AI-generated. It is not recorded as an extracted game asset or a download from another wiki. The generation service and applicable terms have not been supplied, and no guarantee of exclusive copyright or absence of third-party rights is made. See [ASSETS.md](ASSETS.md) for evidence, modifications and remaining limits.

### Release-specific dependency checks

The current lockfile includes lightningcss 1.32.0 (MPL-2.0), caniuse-lite (CC-BY-4.0), argparse 2.0.1 (Python-2.0) and node-forge 1.4.0 (BSD-3-Clause OR GPL-2.0). These are review flags, not a claim that every package is delivered to website visitors. node-forge's supplied license permits the BSD alternative. tosource 2.0.0-alpha.3 omits package-level license metadata but supplies a complete zlib-style LICENSE; missing metadata alone is not missing permission. Inspect actual browser and deployment artifacts, retain applicable notices and provide MPL source-access information when required. This repository notice is not a complete bundled-dependency license collection.

Dependencies retain their own licenses. Before distributing bundles, copied code, fonts, icons or binaries, verify their applicable licenses and include required notices. A dependency lockfile alone is not a license notice. Record new copied or adapted components with their source, revision, affected paths and license; include the actual license text where required.
