import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'SportAI - AI-Powered Sports Video Analysis'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

// Ball trace configuration - follows 135deg gradient direction (top-left to bottom-right)
const ballTraces = [
  // Top trace - fast moving ball (shifted left so trail[1] hits center of O)
  {
    ball: { x: 127, y: 110, size: 48, opacity: 0.85 },
    trail: [
      { x: 92, y: 65, size: 36, opacity: 0.5 },
      { x: 65, y: 38, size: 28, opacity: 0.35 },  // This one hits center of O
      { x: 43, y: 16, size: 20, opacity: 0.2 },
      { x: 25, y: -2, size: 14, opacity: 0.1 },
    ]
  },
  // Middle trace - arc trajectory  
  {
    ball: { x: 800, y: 520, size: 42, opacity: 0.75 },
    trail: [
      { x: 1020, y: 485, size: 32, opacity: 0.45 },
      { x: 995, y: 455, size: 24, opacity: 0.3 },
      { x: 975, y: 430, size: 18, opacity: 0.18 },
      { x: 958, y: 408, size: 12, opacity: 0.08 },
    ]
  },
  // Subtle background trace
  {
    ball: { x: 85, y: 480, size: 28, opacity: 0.4 },
    trail: [
      { x: 62, y: 457, size: 22, opacity: 0.25 },
      { x: 44, y: 439, size: 16, opacity: 0.15 },
      { x: 30, y: 425, size: 10, opacity: 0.08 },
    ]
  },
]

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
        
        {/* Ball traces with motion trails - following 135deg gradient direction */}
        {ballTraces.map((trace, traceIndex) => (
          <div key={traceIndex} style={{ display: 'flex' }}>
            {/* Trail circles - rendered first so ball appears on top */}
            {trace.trail.map((dot, dotIndex) => (
              <div
                key={`trail-${traceIndex}-${dotIndex}`}
                style={{
                  position: 'absolute',
                  left: `${dot.x}px`,
                  top: `${dot.y}px`,
                  width: `${dot.size}px`,
                  height: `${dot.size}px`,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, rgba(200, 230, 100, ${dot.opacity}) 0%, rgba(180, 210, 80, ${dot.opacity * 0.6}) 50%, transparent 100%)`,
                  display: 'flex',
                }}
              />
            ))}
            {/* Main ball with highlight */}
            <div
              style={{
                position: 'absolute',
                left: `${trace.ball.x}px`,
                top: `${trace.ball.y}px`,
                width: `${trace.ball.size}px`,
                height: `${trace.ball.size}px`,
                borderRadius: '50%',
                background: `radial-gradient(circle at 35% 35%, rgba(220, 245, 120, ${trace.ball.opacity}) 0%, rgba(190, 220, 80, ${trace.ball.opacity}) 40%, rgba(160, 190, 60, ${trace.ball.opacity}) 100%)`,
                boxShadow: `0 0 ${trace.ball.size / 3}px rgba(200, 230, 100, ${trace.ball.opacity * 0.5})`,
                display: 'flex',
              }}
            />
          </div>
        ))}
        
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
