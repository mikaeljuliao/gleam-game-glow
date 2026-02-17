import { GameEngine } from '../engine';

export class AlchemistNPC {
    static getDialogue(): string[] {
        return [
            'Silêncio... as essências estão instáveis hoje.',
            'Ah, um novo espécime. Você cheira a sangue e... determinação.',
            'A alquimia é a arte da transmutação absoluta.',
            'Posso destilar sua agonia em cura, se tiver as almas necessárias.',
            'Meus elixires não são baratos, mas são... eficazes.',
            'Negociaremos o fluxo da vida?',
        ];
    }

    static onInteract(engine: GameEngine) {
        (engine as any).shopType = 'potion';
        engine.startDialogue(this.getDialogue());
    }
}
