'use client'

import dynamic from 'next/dynamic'

/**
 * The canvas is purely decorative and touches window/document immediately, so
 * it is loaded client-side only. Keeping the dynamic() call in its own file
 * lets the server-rendered Hero stay a server component.
 */
const AsciiCanvas = dynamic(() => import('./ascii-canvas'), { ssr: false })

export default AsciiCanvas
