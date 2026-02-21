import { Portal, PortalState, PlayerState } from './types';
import * as C from './constants';

const PORTAL_SAVE_KEY = 'dungeon_of_shadows_portals';

interface PortalSaveData {
    completedPortals: string[];
}

export class PortalManager {
    private portals: Portal[] = [];
    private completedPortals: Set<string> = new Set();

    constructor() {
        this.loadProgress();
    }

    addPortal(portal: Portal) {
        // If already completed in past runs, mark it
        if (this.completedPortals.has(portal.id)) {
            portal.state = 'completed';
        }
        this.portals.push(portal);
    }

    getPortals(): Portal[] {
        return this.portals;
    }

    clearFloorPortals() {
        this.portals = [];
    }

    markCompleted(portalId: string) {
        const portal = this.portals.find(p => p.id === portalId);
        if (portal) {
            portal.state = 'completed';
            this.completedPortals.add(portalId);
            this.saveProgress();
        }
    }

    isCompleted(portalId: string): boolean {
        return this.completedPortals.has(portalId);
    }

    checkProximity(player: PlayerState): Portal | null {
        for (const portal of this.portals) {
            if (portal.state === 'locked') continue;

            const dx = player.x - portal.x;
            const dy = player.y - portal.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 100) {
                return portal;
            }
        }
        return null;
    }

    private saveProgress() {
        try {
            const data: PortalSaveData = {
                completedPortals: Array.from(this.completedPortals)
            };
            localStorage.setItem(PORTAL_SAVE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save portal progress:', e);
        }
    }

    private loadProgress() {
        try {
            const raw = localStorage.getItem(PORTAL_SAVE_KEY);
            if (raw) {
                const data: PortalSaveData = JSON.parse(raw);
                this.completedPortals = new Set(data.completedPortals);
            }
        } catch (e) {
            console.warn('Failed to load portal progress:', e);
        }
    }

    // Progression helper
    getMissingPortals(expectedIds: string[]): string[] {
        return expectedIds.filter(id => !this.completedPortals.has(id));
    }
}
