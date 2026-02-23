export interface Biome {
    name: string;
    theme: 'crystal' | 'forest' | 'volcano';
    floor: string;
    floorAlt: string;
    seam: string;
    wall: string;
    wallTop: string;
    wallDetail: string;
    accent: string;
    accentGlow: string;
    detail: string;     // Moss/Ash/Rust
    fog: string;        // Atmospheric fog color
    rays: string;       // God ray color
    bgLayer1: string;   // Closest background layer
    bgLayer2: string;   // Furthest background layer
}

export const BIOMES: Biome[] = [
    {
        // Floors 1-2
        name: "Cripta Submersa",
        theme: 'crystal',
        floor: "#12121e",
        floorAlt: "#161628",
        seam: "#080810",
        wall: "#1c1c30",
        wallTop: "#2a2a45",
        wallDetail: "#0f0f1a",
        accent: "#4fd1ff",
        accentGlow: "rgba(79, 209, 255, 0.2)",
        detail: "rgba(100, 180, 255, 0.4)",
        fog: "rgba(10, 15, 30, 0.7)",
        rays: "rgba(100, 220, 255, 0.1)",
        bgLayer1: "#0a0a1a",
        bgLayer2: "#050510"
    },
    {
        // Floors 3-4
        name: "Arquivos Esquecidos",
        theme: 'forest',
        floor: "#1e1a12",
        floorAlt: "#252016",
        seam: "#0f0d08",
        wall: "#2d251a",
        wallTop: "#3d3225",
        wallDetail: "#1a160e",
        accent: "#99ff55",
        accentGlow: "rgba(153, 255, 85, 0.2)",
        detail: "rgba(74, 138, 59, 0.5)",
        fog: "rgba(15, 20, 10, 0.6)",
        rays: "rgba(180, 255, 120, 0.08)",
        bgLayer1: "#141a0e",
        bgLayer2: "#0a0d07"
    },
    {
        // Floors 5-6
        name: "Abismo de Lava",
        theme: 'volcano',
        floor: "#120a0a",
        floorAlt: "#181010",
        seam: "#050202",
        wall: "#251212",
        wallTop: "#351a1a",
        wallDetail: "#120505",
        accent: "#ff3300",
        accentGlow: "rgba(255, 51, 0, 0.3)",
        detail: "rgba(255, 100, 0, 0.2)",
        fog: "rgba(25, 10, 5, 0.8)",
        rays: "rgba(255, 120, 50, 0.12)",
        bgLayer1: "#1a0808",
        bgLayer2: "#100404"
    }
];

export function getBiome(floor: number): Biome {
    const index = Math.min(BIOMES.length - 1, Math.floor((floor - 1) / 2));
    return BIOMES[index];
}
