import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'SportAI - AI-Powered Sports Video Analysis'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  // Fetch the logo SVG
  const logoData = await fetch(
    'https://res.cloudinary.com/djtxhrly7/image/upload/v1765579947/SportAI_Open_Horizontal_light_ajy8ld.svg'
  ).then((res) => res.text())
  
  // Convert SVG to data URL for embedding
  const logoDataUrl = `data:image/svg+xml;base64,${Buffer.from(logoData).toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #001C0F 0%, #025940 50%, #002B1A 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decorative elements */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(122, 219, 143, 0.15) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(122, 219, 143, 0.1) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        
        {/* Tennis ball decoration */}
        <div
          style={{
            position: 'absolute',
            top: '80px',
            right: '120px',
            fontSize: '72px',
            opacity: 0.6,
            display: 'flex',
          }}
        >
          🎾
        </div>
        
        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '32px',
          }}
        >
          {/* Logo image */}
          <img
            src={logoDataUrl}
            alt="SportAI Open"
            width={550}
            height={165}
            style={{
              objectFit: 'contain',
            }}
          />
          
          {/* Tagline */}
          <div
            style={{
              fontSize: '28px',
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 400,
              display: 'flex',
              textAlign: 'center',
              maxWidth: '800px',
              lineHeight: 1.4,
            }}
          >
            Get immediate performance analysis on any sports video to level-up your game.
          </div>
        </div>
        
        {/* Bottom URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            fontSize: '22px',
            color: 'rgba(255, 255, 255, 0.5)',
            display: 'flex',
          }}
        >
          open.sportai.com
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
