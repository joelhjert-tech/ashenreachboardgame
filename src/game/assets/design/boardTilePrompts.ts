import type { ImagePromptSpec } from "./imagePrompts.js";

const style =
  "original dark gothic science-fantasy board-game art, premium tabletop component, aged blackened metal, worn parchment, blue-white rift glow, cinematic lighting, clear silhouette, readable composition, original symbols only";

const negative =
  "Warhammer, Warhammer 40k, Space Marine, Astartes, Imperium, Emperor, Aquila, Chaos, Daemon, Eldar, Tyranid, Necron, Mechanicus, official faction logo, copied board game art, copied card art, copied portrait, copyrighted symbols, readable copyrighted text, real-world brand, low resolution, blurry, bad anatomy, cluttered UI, unreadable layout";

type TilePromptSeed = {
  id: string;
  fileName: string;
  outputPath: string;
  prompt: string;
};

type MiddleTileSeed = [string, string];
type InnerCenterSeed = [string, string, string, string];

const fullBoardPrompt: ImagePromptSpec = {
  id: "full_board_main",
  fileName: "ashen_reach_board_main.png",
  outputPath: "/assets/riftfall/board/full-board/ashen_reach_board_main.png",
  assetType: "fullBoard",
  size: "wide",
  prompt: `${style}; top-down premium tabletop board game map for Ashen Reach, rectangular board with ornate aged black metal frame, worn brass corners, original route-sigil symbols, large outer ring, smaller middle ring, one-way inner gauntlet into a central scenario chamber, readable path layout, no tiny text, dramatic but usable board presentation`,
  negativePrompt: negative,
  usage: "Primary TV board background replacing placeholder map art."
};

const outerTileSeeds: TilePromptSeed[] = [
  {
    id: "tile_outer_saint_sanctuary",
    fileName: "outer_saint_sanctuary.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_saint_sanctuary.png",
    prompt: "top-down board tile art, ruined sanctuary refuge, cracked saint statue, blue-white light through broken dome, candles, field-surgery shrine, safe recovery atmosphere, no text"
  },
  {
    id: "tile_outer_ashstack_city",
    fileName: "outer_ashstack_city.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_ashstack_city.png",
    prompt: "top-down board tile art, towering ashstack district, stacked black towers, bronze bridges, neon smog, crowded alleys, original frontier city, no text"
  },
  {
    id: "tile_outer_agri_fields",
    fileName: "outer_agri_fields.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_agri_fields.png",
    prompt: "top-down board tile art, moonlit agri-fields, crop grids, irrigation canals, small gothic farm machinery, distant burning horizon, no text"
  },
  {
    id: "tile_outer_plains",
    fileName: "outer_plains.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_plains.png",
    prompt: "top-down board tile art, wind-cut plains, survey towers, rusted convoy tracks, low storm clouds, readable open terrain, no text"
  },
  {
    id: "tile_outer_woods",
    fileName: "outer_woods.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_woods.png",
    prompt: "top-down board tile art, dense shadow woods, black trees, yellow scanner lights, hidden tracks, blue spores, ambush atmosphere, no text"
  },
  {
    id: "tile_outer_shrine_road",
    fileName: "outer_shrine_road.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_shrine_road.png",
    prompt: "top-down board tile art, cracked pilgrim road lined with original saint shrines, broken lanterns, blue candles, worn stone and metal, no text"
  },
  {
    id: "tile_outer_tavern",
    fileName: "outer_tavern.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_tavern.png",
    prompt: "top-down board tile art, frontier void tavern interior, brass tables, glowing drink vats, rogues and pilots as tiny silhouettes, warm amber light, no text"
  },
  {
    id: "tile_outer_spaceport",
    fileName: "outer_spaceport.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_spaceport.png",
    prompt: "top-down board tile art, orbital spaceport pads, cargo cranes, shuttle silhouettes, blue runway lights, black rain, travel hub atmosphere, no text"
  },
  {
    id: "tile_outer_caverns",
    fileName: "outer_caverns.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_caverns.png",
    prompt: "top-down board tile art, crystal caverns, teal mineral veins, narrow paths, old mining lights, dangerous exploration shadows, no text"
  },
  {
    id: "tile_outer_mine",
    fileName: "outer_mine.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_mine.png",
    prompt: "top-down board tile art, industrial mine shaft, rails, ore carts, hazard lamps, cracked rock, red warning glow, no text"
  },
  {
    id: "tile_outer_forge_dock",
    fileName: "outer_forge_dock.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_forge_dock.png",
    prompt: "top-down board tile art, forge dock with molten channels, black cranes, cargo chains, orange furnace light, machine workers as tiny silhouettes, no text"
  },
  {
    id: "tile_outer_iron_synod_workshop",
    fileName: "outer_iron_synod_workshop.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_iron_synod_workshop.png",
    prompt: "top-down board tile art, Iron Synod workshop, brass articulated arms, glowing diagnostic panels, repair benches, blue sparks, original industrial cult imagery, no text"
  },
  {
    id: "tile_outer_toxic_wastes",
    fileName: "outer_toxic_wastes.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_toxic_wastes.png",
    prompt: "top-down board tile art, toxic waste flats, green acid pools, rusted pipes, cracked pylons, sickly mist, no text"
  },
  {
    id: "tile_outer_outcast_camp",
    fileName: "outer_outcast_camp.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_outcast_camp.png",
    prompt: "top-down board tile art, outcast camp with patchwork tents, scrap walls, cooking fires, dangerous negotiation atmosphere, no text"
  },
  {
    id: "tile_outer_frozen_plains",
    fileName: "outer_frozen_plains.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_frozen_plains.png",
    prompt: "top-down board tile art, frozen plains, snow over buried ruins, survival beacons, black mountains, no text"
  },
  {
    id: "tile_outer_ice_world",
    fileName: "outer_ice_world.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_ice_world.png",
    prompt: "top-down board tile art, ice world settlement ruins, cracked glacier, blue aurora, frozen antenna towers, no text"
  },
  {
    id: "tile_outer_crash_site",
    fileName: "outer_crash_site.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_crash_site.png",
    prompt: "top-down board tile art, crashed route-barge hull split in crater, sparks, smoke, salvage crates, emergency lights, no text"
  },
  {
    id: "tile_outer_shardvine_verge",
    fileName: "outer_shardvine_verge.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_shardvine_verge.png",
    prompt: "top-down board tile art, alien jungle verge with luminous vines, clawed tracks, strange flowers, yellow mist, original creature ecology, no text"
  },
  {
    id: "tile_outer_temple",
    fileName: "outer_temple.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_temple.png",
    prompt: "top-down board tile art, ancient void temple, bronze doors, blue flame braziers, broken route-sigil mosaic, no text"
  },
  {
    id: "tile_outer_desert",
    fileName: "outer_desert.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_desert.png",
    prompt: "top-down board tile art, red desert dunes, half-buried machine bones, heat haze, caravan trail, no text"
  },
  {
    id: "tile_outer_oasis",
    fileName: "outer_oasis.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_oasis.png",
    prompt: "top-down board tile art, hidden oasis under broken orbital mirror, blue water, dark palms, shrine stones, no text"
  },
  {
    id: "tile_outer_warlord_camp",
    fileName: "outer_warlord_camp.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_warlord_camp.png",
    prompt: "top-down board tile art, warlord camp with scrap banners, armored tents, arena ring, smoke and firelight, no text"
  },
  {
    id: "tile_outer_city",
    fileName: "outer_city.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_city.png",
    prompt: "top-down board tile art, fortified frontier city, market streets, guard towers, tram lines, bronze lights, no text"
  },
  {
    id: "tile_outer_black_market",
    fileName: "outer_black_market.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_black_market.png",
    prompt: "top-down board tile art, black market alley under neon tarps, hidden weapons, masked traders, yellow stealth lighting, no text"
  },
  {
    id: "tile_outer_graveyard",
    fileName: "outer_graveyard.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_graveyard.png",
    prompt: "top-down board tile art, starship graveyard cemetery, metal tomb slabs, blue ghost lights, solemn supernatural danger, no text"
  },
  {
    id: "tile_outer_ruins",
    fileName: "outer_ruins.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_ruins.png",
    prompt: "top-down board tile art, ancient black-stone ruins, collapsed arches, hidden trap plates, artifact glow, no text"
  },
  {
    id: "tile_outer_rift_touched_woods",
    fileName: "outer_rift_touched_woods.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_rift_touched_woods.png",
    prompt: "top-down board tile art, rift-touched woods, twisted trees bending toward a violet-blue tear in the sky, floating leaves, no text"
  },
  {
    id: "tile_outer_portal_ruins",
    fileName: "outer_portal_ruins.png",
    outputPath: "/assets/riftfall/board/tiles/outer/outer_portal_ruins.png",
    prompt: "top-down board tile art, broken circular portal ruins leaking blue-white energy from cracked machinery, no text"
  }
];

const middleTileSeeds: MiddleTileSeed[] = [
  ["ashstack_sprawl", "dense violent ashstack sprawl, burning alleys, gang barricades, high towers blocking the sky, red and yellow danger lighting"],
  ["tomb_gate", "sealed tomb gate, black stone doors, blue glyph light, trap corridors, ancient dust"],
  ["ancient_machine_ruins", "ancient machine ruins, sleeping metal guardians, broken crystal circuits, cold green-blue light"],
  ["hidden_valley", "hidden valley inside a crater, lush growth, crashed satellites, suspicious calm surrounded by danger"],
  ["shardvine_depths", "deep alien jungle, huge luminous plants, bone-white predator trails, red warning flares"],
  ["relay_spire", "broken relay spire with floating blue signal rings, cracked consoles, storm clouds, mind-pressure atmosphere"],
  ["breach_conduit", "colossal power conduit, blue-white energy column, broken stairs, brass pylons, unstable light"],
  ["guardian_span", "final gate before the inner tier, giant silent guardian statue, three colored sigils, violent rift behind sealed doors"],
  ["breachspawn_pit", "writhing organic-metal pit, red-black chasm, blue Heat cracks, monstrous original shadows"],
  ["cinder_wastes", "rift-scarred wastes, broken ground floating upward, violet scars, dead machines, blue-black storm"],
  ["burning_battlefield", "burning battlefield, trenches, wrecked vehicles, red flare smoke, scattered weapons"],
  ["monastery", "fortified void monastery, black stone walls, blue candles, field-surgery chapel, shielded sanctuary"],
  ["mortuary_reach", "spectral battlefield of tombs and broken starship ribs, pale blue ghosts, black fog"],
  ["mirror_crypt", "ancient mirror crypt with reflective shards, teal channels, half-buried archive machinery"],
  ["webglass_breach", "fractured transit corridor of glass-like paths over black void, unstable teal routes, broken bridge geometry"],
  ["forge_bastion", "fortress forge with soot-black towers, assembly lines, molten vents, siege mood"],
  ["industrial_hellscape", "industrial hellscape of pipelines, smelters, acid runoff, warning lamps, brutal machine pressure"],
  ["void_shield_generator", "vast shield generator array waking under blue light, coil towers, defense field bloom"]
] as Array<[string, string]>;

const innerCenterSeeds: InnerCenterSeed[] = [
  ["veil_rift", "inner_veil_rift.png", "/assets/riftfall/board/tiles/inner/inner_veil_rift.png", "top-down board tile art, impossible tunnel of blue-white energy, fractured stars, torn metal walkway, final gauntlet atmosphere, no text"],
  ["tomb_complex", "inner_tomb_complex.png", "/assets/riftfall/board/tiles/inner/inner_tomb_complex.png", "top-down board tile art, severe tomb approach with moving trap plates, black brass architecture, no text"],
  ["lattice_maze", "inner_lattice_maze.png", "/assets/riftfall/board/tiles/inner/inner_lattice_maze.png", "top-down board tile art, reality maze of glowing lattice bridges and impossible angles, no text"],
  ["rift_gate", "inner_rift_gate.png", "/assets/riftfall/board/tiles/inner/inner_rift_gate.png", "top-down board tile art, screaming breach gate with blue and violet pressure cracks, no text"],
  ["spawn_pit", "inner_spawn_pit.png", "/assets/riftfall/board/tiles/inner/inner_spawn_pit.png", "top-down board tile art, final spawn pit with molten organic growth and jagged catwalks, no text"],
  ["mortuary_domain", "inner_mortuary_domain.png", "/assets/riftfall/board/tiles/inner/inner_mortuary_domain.png", "top-down board tile art, death domain of tomb slabs and pale furnace fog, no text"],
  ["gilded_stair", "inner_gilded_stair.png", "/assets/riftfall/board/tiles/inner/inner_gilded_stair.png", "top-down board tile art, final stair of black metal and gold trim climbing into blinding blue core light, no text"],
  ["scenario_space", "center_scenario_space.png", "/assets/riftfall/board/center/center_scenario_space.png", "top-down board tile art, violent blue-white reality tear inside a ruined command chamber, sacred but not imperial, no text"]
] as Array<[string, string, string, string]>;

export const boardTilePrompts: ImagePromptSpec[] = [
  fullBoardPrompt,
  ...outerTileSeeds.map((seed) => ({
    id: seed.id,
    fileName: seed.fileName,
    outputPath: seed.outputPath,
    assetType: "boardTile" as const,
    size: "square" as const,
    prompt: `${style}; ${seed.prompt}`,
    negativePrompt: negative,
    usage: "Outer-tier modular tile art."
  })),
  ...middleTileSeeds.map(([suffix, prompt]) => ({
    id: `tile_middle_${suffix}`,
    fileName: `middle_${suffix}.png`,
    outputPath: `/assets/riftfall/board/tiles/middle/middle_${suffix}.png`,
    assetType: "boardTile" as const,
    size: "square" as const,
    prompt: `${style}; top-down board tile art, ${prompt}, no text`,
    negativePrompt: negative,
    usage: "Middle-tier modular tile art."
  })),
  ...innerCenterSeeds.map(([suffix, fileName, outputPath, prompt]) => ({
    id: `tile_${suffix === "scenario_space" ? "center" : "inner"}_${suffix}`,
    fileName,
    outputPath,
    assetType: "boardTile" as const,
    size: "square" as const,
    prompt: `${style}; ${prompt}`,
    negativePrompt: negative,
    usage: suffix === "scenario_space" ? "Center scenario-space art." : "Inner-tier modular tile art."
  }))
];
