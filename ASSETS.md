# Supercell fan-kit assets

All listed Supercell artwork and fonts are © Supercell. Source collection: https://fankit.supercell.com/d/vkEdmkUCngKw/game-assets. Font collection: https://fankit.supercell.com/d/vkEdmkUCngKw/font. This is unofficial fan content, not endorsed by Supercell. Review https://supercell.com/en/fan-content-policy/ before redistributing or publishing.

| Local asset | Official asset name |
| --- | --- |
| archer.webp | Troop_HV_Archer_9 |
| wizard.webp | Troop_HV_Wizard_8 |
| bomber.webp | Troop_BB_Bomber_no_grass |
| ice.webp | Seasonal_Troop_HV_Ice_Wizard_1 |
| tree.webp | Obstacle_BB_Big_Tree |
| rock.webp | Obstacle_HV_Stone_large |
| font-bold/Clash_Bold.otf.ttf | Clash_Bold.otf.zip |
| font-regular/Clash_Regular.otf.ttf | Clash_Regular.otf.zip |

Exact public image URLs are retained in `public/assets/sources.json`. `scripts/download-assets.mjs` downloads the official preview derivatives, trims transparent margins, resizes them and encodes local WebP copies. Large character portraits are 35–55 KB each; gameplay sprites are 4–6 KB each. Textures and fonts are served locally with caching. Gameplay uses the supplied character poses with facing flips, movement bobbing, projectiles, hit numbers and explosion effects; the fan-kit PNGs are not directional animation sheets.

Map layouts, stone/wood tiles, bridges, traps, runes, terrain texture and interface artwork are original code-drawn elements. Official tree and rock props are composited into a cached terrain layer. Decorative edge props are noncollidable; walls, live crates and pools are collidable, while the cyan ice patches affect movement.
