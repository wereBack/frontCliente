import type { RefObject } from 'react'
import { useLayoutEffect, useState } from 'react'

const MIN_WIDTH = 320
const MIN_HEIGHT = 320

export function useElementSize<T extends HTMLElement>(
  ref: RefObject<T | null>,
): { width: number; height: number } {
  const [size, setSize] = useState({ width: MIN_WIDTH, height: MIN_HEIGHT })

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) {
      return
    }

    const updateSize = () => {
      setSize({
        width: Math.max(element.clientWidth, MIN_WIDTH),
        height: Math.max(element.clientHeight, MIN_HEIGHT),
      })
    }

    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(element)

    return () => observer.disconnect()
  }, [ref])

  return size
}


