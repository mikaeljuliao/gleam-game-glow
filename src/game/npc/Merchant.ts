import { GameEngine } from '../engine';

export class MerchantNPC {
    static getDialogue(firstMeet: boolean): string[] {
        if (firstMeet) {
            return [
                'Então é você…',
                'O viajante que está fazendo o andar tremer.',
                'Poucos chegam até mim ainda vivos.',
                'A maioria vira lembrança… ou alimento para as criaturas daqui.',
                'Este lugar corrói coragem, esperança… e ossos.',
                'Eu sou conhecido como O Mercador.',
                'Negocio oportunidades para aqueles teimosos o bastante para continuar subindo.',
                'E se pretende ir mais longe…',
                'vai precisar do que eu tenho.',
            ];
        }
        const shortLines = [
            ['Ainda vivo. Impressionante.', 'Selecionei algumas coisas que você possa gostar.', 'Veja o que eu tenho.'],
            ['Você voltou.', 'Gosto de clientes que sobrevivem.', 'Dê uma olhada.'],
            ['Você continua me surpreendendo.', 'Poucos passam tantas vezes por esta porta.', 'Vamos negociar.'],
        ];
        return shortLines[Math.floor(Math.random() * shortLines.length)];
    }

    static onInteract(engine: GameEngine) {
        (engine as any).shopType = 'normal';
        engine.startDialogue(this.getDialogue((engine as any).vendorFirstMeet));
        (engine as any).vendorFirstMeet = false;
    }
}
