import { useState, useEffect, useCallback } from 'react';
import { getBrightness, setBrightness } from '@/game/brightness';

interface BrightnessSettingsProps {
  open: boolean;
  onClose: () => void;
}

const BrightnessSettings = ({ open, onClose }: BrightnessSettingsProps) => {
  const [value, setValue] = useState(getBrightness());

  useEffect(() => {
    if (open) setValue(getBrightness());
  }, [open]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setValue(v);
    setBrightness(v);
  }, []);

  const handleReset = useCallback(() => {
    setValue(0);
    setBrightness(0);
  }, []);

  if (!open) return null;

  // Calculate symbol visibility based on brightness
  // At default (0), bright symbol should be clearly visible, dark one barely visible
  const brightAlpha = Math.max(0.1, 0.85 + value * 0.3);
  const darkAlpha = Math.max(0.02, 0.08 + value * 0.15);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.92)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md mx-4 rounded-xl border overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0a0a14 0%, #080810 100%)',
          borderColor: '#2a2a44',
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <h2
            className="text-center text-lg font-medium uppercase tracking-widest"
            style={{ fontFamily: "'Cinzel', serif", color: '#b0a0cc', letterSpacing: '0.2em' }}
          >
            AJUSTE DE BRILHO
          </h2>
          <p className="text-center mt-2" style={{ color: '#555566', fontFamily: 'monospace', fontSize: '11px' }}>
            Ajuste o slider até que o símbolo da esquerda<br />
            esteja <span style={{ color: '#888899' }}>claramente visível</span> e o da direita<br />
            esteja <span style={{ color: '#888899' }}>quase invisível</span>.
          </p>
        </div>

        {/* Reference symbols area */}
        <div className="px-6 py-8">
          <div
            className="rounded-lg flex items-center justify-around py-10 px-4"
            style={{ background: '#050508' }}
          >
            {/* Bright symbol — should be clearly visible */}
            <div className="text-center">
              <div
                className="text-5xl select-none"
                style={{
                  opacity: brightAlpha,
                  filter: `brightness(${1 + value})`,
                  transition: 'opacity 0.1s, filter 0.1s',
                }}
              >
                ☀️
              </div>
              <p className="mt-3" style={{ color: '#555566', fontFamily: 'monospace', fontSize: '9px', letterSpacing: '0.1em' }}>
                VISÍVEL
              </p>
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '60px', background: '#1a1a2a' }} />

            {/* Dark symbol — should be barely visible */}
            <div className="text-center">
              <div
                className="text-5xl select-none"
                style={{
                  opacity: darkAlpha,
                  filter: `brightness(${0.3 + value * 0.5})`,
                  transition: 'opacity 0.1s, filter 0.1s',
                }}
              >
                🌑
              </div>
              <p className="mt-3" style={{ color: '#555566', fontFamily: 'monospace', fontSize: '9px', letterSpacing: '0.1em' }}>
                QUASE INVISÍVEL
              </p>
            </div>
          </div>
        </div>

        {/* Slider */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-4">
            <span style={{ color: '#444455', fontFamily: 'monospace', fontSize: '10px' }}>🌑</span>
            <input
              type="range"
              min="-0.5"
              max="0.5"
              step="0.01"
              value={value}
              onChange={handleChange}
              className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(90deg, #1a1020, #3a2850 50%, #887799)`,
                outline: 'none',
                accentColor: '#8866aa',
              }}
            />
            <span style={{ color: '#444455', fontFamily: 'monospace', fontSize: '10px' }}>☀️</span>
          </div>
          <p className="text-center mt-2" style={{ color: '#444455', fontFamily: 'monospace', fontSize: '10px' }}>
            {value > 0.01 ? `+${Math.round(value * 100)}%` : value < -0.01 ? `${Math.round(value * 100)}%` : 'Padrão'}
          </p>
        </div>

        {/* Buttons */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 py-2.5 text-sm border rounded-lg transition-all duration-200 hover:opacity-80 active:scale-95"
            style={{
              fontFamily: 'monospace',
              color: '#666677',
              letterSpacing: '0.1em',
              background: 'rgba(20, 20, 35, 0.6)',
              borderColor: '#2a2a44',
              fontSize: '11px',
            }}
          >
            RESETAR
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm border rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-95"
            style={{
              fontFamily: "'Cinzel', serif",
              color: '#ccbbee',
              letterSpacing: '0.15em',
              background: 'linear-gradient(180deg, rgba(100, 60, 160, 0.35), rgba(80, 45, 130, 0.25))',
              borderColor: '#554488',
              fontSize: '12px',
            }}
          >
            CONFIRMAR
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrightnessSettings;
