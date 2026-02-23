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
    obstacleSprites?: string[]; // New paths for obstacle sprites
}

export const BIOMES: Biome[] = [
    {
        // Floors 1-2 — GLACIAL ABYSS
        name: "Abismo Glacial",
        theme: 'crystal',
        floor: "#08121d",
        floorAlt: "#0a1624",
        seam: "#040810",
        wall: "#12253a",
        wallTop: "#1c3858",
        wallDetail: "#06101e",
        accent: "#00f2ff",
        accentGlow: "rgba(0, 242, 255, 0.3)",
        detail: "rgba(180, 240, 255, 0.4)",
        fog: "rgba(4, 10, 20, 0.75)",
        rays: "rgba(160, 245, 255, 0.12)",
        bgLayer1: "#050c16",
        bgLayer2: "#02050b",
        obstacleSprites: [
            "/sprits-cenario-4.png",
            "/sprits-cenario-8.png",
            "/sprits-cenario-5.png",
            "/sprits-cenario-9.png",
            "/sprits-cenario-10.png",
        ]
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
        bgLayer2: "#0a0d07",
        obstacleSprites: ["/obstacles/ancient_shelf.png", "/obstacles/ivy_statue.png"]
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
        bgLayer2: "#100404",
        obstacleSprites: ["/obstacles/lava_pillar.png", "/obstacles/burnt_debris.png"]
    }
];

export function getBiome(floor: number): Biome {
    const index = Math.min(BIOMES.length - 1, Math.floor((floor - 1) / 2));
    return BIOMES[index];
}
