// Avatar minimalista del fundador: tono de piel y edad
export const SKINS = ['#F1D3B3', '#E0AC83', '#C68642', '#8D5524', '#5C3A1E']
export function Avatar ({ skin, age = 18, shirt = '#D63B2F', size = 72 }: { skin: string; age?: number; shirt?: string; size?: number }) {
  const kid = age < 14
  return (
    <svg viewBox='0 0 64 64' width={size} height={size} aria-hidden>
      <circle cx='32' cy='32' r='31' fill='#F4EFE6' stroke='#2B2D33' strokeWidth='2' />
      <path d={kid ? 'M14 64 C16 46 48 46 50 64 Z' : 'M10 64 C12 44 52 44 54 64 Z'} fill={shirt} stroke='#2B2D33' strokeWidth='2' />
      <circle cx='32' cy={kid ? 30 : 27} r={kid ? 12 : 13} fill={skin} stroke='#2B2D33' strokeWidth='2' />
      <path d={kid ? 'M20 27 C21 17 43 17 44 27 C40 22 26 22 20 27 Z' : 'M19 24 C20 12 44 12 45 24 C41 18 25 18 19 24 Z'} fill='#2B2D33' />
      <circle cx='27.5' cy={kid ? 31 : 28} r='1.6' fill='#2B2D33' /><circle cx='36.5' cy={kid ? 31 : 28} r='1.6' fill='#2B2D33' />
      <path d={`M28 ${kid ? 36 : 33} Q32 ${kid ? 39 : 36} 36 ${kid ? 36 : 33}`} stroke='#2B2D33' strokeWidth='1.6' fill='none' strokeLinecap='round' />
    </svg>
  )
}
