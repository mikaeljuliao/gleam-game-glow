import { ButtonHTMLAttributes } from 'react';
import { SFX } from '@/game/audio';

interface MenuButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    icon?: React.ReactNode;
}

const MenuButton = ({ children, variant = 'primary', icon, className, ...props }: MenuButtonProps) => {
    const baseStyles = "relative w-full py-4 px-6 text-left group overflow-hidden transition-all duration-300 ease-out border backdrop-blur-sm";

    const variants = {
        primary: "bg-black/40 hover:bg-gray-800/40 border-white/10 hover:border-white/20 text-gray-300 hover:text-white hover:pl-8",
        secondary: "bg-black/20 hover:bg-gray-800/40 border-white/5 hover:border-white/20 text-gray-400 hover:text-gray-200 hover:pl-8",
        danger: "bg-red-950/10 hover:bg-red-900/20 border-red-900/20 hover:border-red-500/30 text-red-400/80 hover:text-red-300 hover:pl-8"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${className || ''}`}
            onMouseEnter={() => SFX.uiOpen()}
            onClick={() => SFX.uiClose()}
            {...props}
        >
            {/* Hover Glow Effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                    background: variant === 'danger'
                        ? 'linear-gradient(90deg, transparent, rgba(200,50,50,0.1), transparent)'
                        : 'linear-gradient(90deg, transparent, rgba(180,180,200,0.08), transparent)'
                }}
            />

            {/* Active Indicator Line */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-current transition-colors duration-300" />

            <div className="relative flex items-center justify-between z-10">
                <span className="font-cinzel tracking-widest text-lg font-medium flex items-center gap-3">
                    {icon && <span className="opacity-50 group-hover:opacity-100 transition-opacity">{icon}</span>}
                    {children}
                </span>

                {/* Arrow on hover */}
                <span className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-sm">
                    ▶
                </span>
            </div>
        </button>
    );
};

export default MenuButton;
