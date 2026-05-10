import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number, duration = 650): number {
  const [count, setCount] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (target === 0) {
      setCount(0)
      return
    }

    const start = performance.now()

    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      setCount(Math.round((1 - Math.pow(1 - t, 3)) * target))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return count
}
