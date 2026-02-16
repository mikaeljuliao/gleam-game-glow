const MenuBackground = () => {
    return (
        <div className="absolute inset-0 overflow-hidden bg-black">

            {/* Very subtle red ambient glow - barely visible warmth */}
            <div className="absolute inset-0 bg-gradient-to-b from-black via-red-950/8 to-black" />

            {/* Soft central warmth - like distant fire glow, very subtle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px]">
                <div className="absolute inset-0 bg-gradient-to-b from-red-900/15 via-red-950/8 to-transparent blur-3xl rounded-full opacity-60" />
            </div>

            {/* Gentle floating embers - very few, very subtle */}
            <div className="absolute inset-0">
                {[...Array(12)].map((_, i) => (
                    <div
                        key={`ember-${i}`}
                        className="absolute rounded-full animate-float opacity-30"
                        style={{
                            left: `${15 + (i * 6)}%`,
                            top: `${20 + ((i * 13) % 60)}%`,
                            width: '2px',
                            height: '2px',
                            background: 'radial-gradient(circle, rgba(255,100,50,0.6) 0%, transparent 70%)',
                            animationDelay: `${i * 2}s`,
                            animationDuration: `${20 + i * 3}s`,
                            filter: 'blur(0.5px)',
                        }}
                    />
                ))}
            </div>

            {/* Very subtle heat haze at bottom */}
            <div className="absolute bottom-0 w-full h-1/4 bg-gradient-to-t from-red-950/10 to-transparent opacity-50" />

            {/* Professional vignette - keeps focus centered */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_transparent_40%,_rgba(0,0,0,0.6)_80%,_rgba(0,0,0,0.9)_100%)]" />

            {/* Corner darkness - creates depth */}
            <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-gradient-to-br from-black/90 via-black/50 to-transparent" />
            <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-to-bl from-black/90 via-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-gradient-to-tr from-black/95 via-black/60 to-transparent" />
            <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-gradient-to-tl from-black/95 via-black/60 to-transparent" />

        </div>
    );
};

export default MenuBackground;
