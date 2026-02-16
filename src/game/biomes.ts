export interface Biome {
    name: string;
    floor: string;      // Main slab color
    floorAlt: string;   // Secondary slab variation
    seam: string;       // Mortar/crack color
    wall: string;       // Side wall base
    wallTop: string;    // Top architectural face
    wallDetail: string; // Bricks/lines on walls
    accent: string;     // Torches/Glow color
    accentGlow: string; // Torch light color
    detail: string;     // Moss/Ash/Rust
}

export const BIOMES: Biome[] = [
    {
        // Floors 1-2
        name: "Cripta Submersa",
        floor: "#1a1a24",
        floorAlt: "#1e1e2a",
        seam: "#0d0d12",
        wall: "#252538",
        wallTop: "#32324d",
        wallDetail: "#181825",
        accent: "#66ccff",
        accentGlow: "rgba(80, 180, 255, 0.15)",
        detail: "rgba(40, 60, 80, 0.3)" // Cold condensation / faint moss
    },
    {
        // Floors 3-4
        name: "Arquivos Esquecidos",
        floor: "#2a241a",
        floorAlt: "#2d281e",
        seam: "#1a160e",
        wall: "#3d3225",
        wallTop: "#4d4032",
        wallDetail: "#251e16",
        accent: "#aaff44",
        accentGlow: "rgba(150, 255, 80, 0.15)",
        detail: "rgba(60, 100, 40, 0.4)" // Overgrown moss / vines
    },
    {
        // Floors 5-6
        name: "Abismo de Lava",
        floor: "#181010",
        floorAlt: "#1d1212",
        seam: "#0a0505",
        wall: "#2a1515",
        wallTop: "#3a1d1d",
        wallDetail: "#1a0a0a",
        accent: "#ff5500",
        accentGlow: "rgba(255, 80, 0, 0.2)",
        detail: "rgba(255, 50, 0, 0.1)" // Ash / Heat glow
    }
];

export function getBiome(floor: number): Biome {
    const index = Math.min(BIOMES.length - 1, Math.floor((floor - 1) / 2));
    return BIOMES[index];
}
