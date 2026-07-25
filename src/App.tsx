import { useState } from 'react'
import { DrawingCanvas } from './scene/DrawingCanvas'
import './App.css'

function App() {
  const [area, setArea] = useState<number | null>(null)

  return (
    <div className="app">
      <div className="hud">
        <div className="instructions">
          ลากบนพื้นที่ว่างเพื่อวาดกำแพง · ลากที่จุดสีส้มเพื่อย้าย node ·
          บีบสองนิ้ว/scroll เพื่อซูม
        </div>
        <div className="area">
          พื้นที่ห้อง: {area !== null ? `${area.toFixed(2)} ตร.ม.` : '—'}
        </div>
      </div>
      <div className="canvas-wrap">
        <DrawingCanvas onAreaChange={setArea} />
      </div>
    </div>
  )
}

export default App
