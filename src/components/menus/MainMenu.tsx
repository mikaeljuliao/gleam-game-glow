import { useState } from 'react';
import HomeScreen from './HomeScreen';
import RankScreen from './RankScreen';
import SettingsScreen from './SettingsScreen';
import CreditsScreen from './CreditsScreen';

type MenuScreen = 'home' | 'settings' | 'rank' | 'credits';

interface MainMenuProps {
    onStart: (continueGame?: boolean) => void;
    onOpenDevMenu?: () => void;
    hasSave: boolean;
}

const MainMenu = ({ onStart, onOpenDevMenu, hasSave }: MainMenuProps) => {
    const [currentScreen, setCurrentScreen] = useState<MenuScreen>('home');

    const renderScreen = () => {
        switch (currentScreen) {
            case 'home':
                return <HomeScreen onStart={onStart} onNavigate={(s) => setCurrentScreen(s as MenuScreen)} hasSave={hasSave} onOpenDevMenu={onOpenDevMenu} />;
            case 'rank':
                return <RankScreen onBack={() => setCurrentScreen('home')} />;
            case 'settings':
                return <SettingsScreen onBack={() => setCurrentScreen('home')} />;
            case 'credits':
                return <CreditsScreen onBack={() => setCurrentScreen('home')} />;
            default:
                return <HomeScreen onStart={onStart} onNavigate={(s) => setCurrentScreen(s as MenuScreen)} hasSave={hasSave} />;
        }
    };

    return (
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
            {/* Background Overlay for better text readability over particles */}
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />

            {/* Content Container */}
            <div className="relative z-20 w-full h-full flex items-center justify-center">
                {renderScreen()}
            </div>
        </div>
    );
};

export default MainMenu;
