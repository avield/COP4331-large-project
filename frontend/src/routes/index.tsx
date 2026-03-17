import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import reactLogo from '../assets/react.svg'
import viteLogo from '/vite.svg'
import { Button } from '../components/ui/button'

export const Route = createFileRoute('/')({
  component: Home,
})

export default function Home() {
  const[count, setCount] = useState(0)

  return (
    <div className="flex min-h-screen min-w-[320px] place-items-center justify-center bg-white text-[#213547] dark:bg-[#242424] dark:text-[rgba(255,255,255,0.87)]">
      <div className="max-w-7xl p-8 text-center">
        <Button>This is a test</Button>
        <div>
          <a href="https://vite.dev" target="_blank" rel="noreferrer">
            <img 
              src={viteLogo} 
              className="inline-block box-content h-[6em] p-[1.5em] will-change-[filter] transition-[filter] duration-300 hover:drop-shadow-[0_0_2em_#646cffaa]" 
              alt="Vite logo" 
            />
          </a>
          <a href="https://react.dev" target="_blank" rel="noreferrer">
            <img 
              src={reactLogo} 
              className="inline-block box-content h-[6em] p-[1.5em] will-change-[filter] transition-[filter] duration-300 hover:drop-shadow-[0_0_2em_#61dafbaa] motion-safe:animate-[spin_20s_linear_infinite]" 
              alt="React logo" 
            />
          </a>
        </div>

        <h1 className="my-[0.67em] text-[3.2em] font-bold leading-[1.1]">
          Vite + React
        </h1>

        <div className="p-[2em]">
          <button 
            onClick={() => setCount((count) => count + 1)}
            className="cursor-pointer rounded-lg border border-transparent bg-[#f9f9f9] px-[1.2em] py-[0.6em] text-[1em] font-medium transition-[border-color] duration-250 hover:border-[#646cff] focus:outline-4 focus:outline-[-webkit-focus-ring-color] dark:bg-[#1a1a1a]"
          >
            count is {count}
          </button>
          <p className="my-[1em]">
            Edit <code>src/App.tsx</code> and save to test HMR
          </p>
        </div>
        
        <p className="text-[#888]">
          Click on the Vite and React logos to learn more
        </p>

      </div>
    </div>
  )
}