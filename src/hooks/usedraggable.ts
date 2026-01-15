import { useState, useRef, useCallback, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

interface DraggableOptions {
  initialPosition?: Position;
  boundToViewport?: boolean;
  mobileBottomOnly?: boolean;
  elementSize?: { width: number; height: number };
  onDragStart?: () => void;
  onDragEnd?: (position: Position) => void;
}

interface DraggableResult {
  position: Position;
  isDragging: boolean;
  dragHandlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
  };
  resetPosition: () => void;
  isDefaultPosition: boolean;
}

const MOBILE_BREAKPOINT = 768;

export function useDraggable(options: DraggableOptions = {}): DraggableResult {
  const {
    initialPosition = { x: 0, y: 0 },
    boundToViewport = true,
    mobileBottomOnly = true,
    elementSize = { width: 120, height: 120 },
    onDragStart,
    onDragEnd,
  } = options;

  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isDefaultPosition, setIsDefaultPosition] = useState(true);

  const dragStartPos = useRef<Position>({ x: 0, y: 0 });
  const elementStartPos = useRef<Position>({ x: 0, y: 0 });

  const isMobile = useCallback(() => {
    return window.innerWidth < MOBILE_BREAKPOINT;
  }, []);

  const getConstrainedPosition = useCallback((newX: number, newY: number): Position => {
    if (!boundToViewport) {
      return { x: newX, y: newY };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const mobile = isMobile();

    const minX = -viewportWidth + elementSize.width + 24;
    const maxX = 0;

    let minY: number;
    let maxY: number;

    if (mobile && mobileBottomOnly) {
      const bottomHalfStart = viewportHeight * 0.5;
      minY = -bottomHalfStart + elementSize.height + 24;
      maxY = 0;
    } else {
      minY = -viewportHeight + elementSize.height + 24;
      maxY = 0;
    }

    return {
      x: Math.max(minX, Math.min(maxX, newX)),
      y: Math.max(minY, Math.min(maxY, newY)),
    };
  }, [boundToViewport, mobileBottomOnly, elementSize, isMobile]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    const deltaX = clientX - dragStartPos.current.x;
    const deltaY = clientY - dragStartPos.current.y;

    const newX = elementStartPos.current.x + deltaX;
    const newY = elementStartPos.current.y + deltaY;

    const constrainedPos = getConstrainedPosition(newX, newY);
    setPosition(constrainedPos);
  }, [getConstrainedPosition]);

  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setIsDefaultPosition(position.x === 0 && position.y === 0);
      onDragEnd?.(position);
    }
  }, [isDragging, position, onDragEnd]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    handleDragMove(e.clientX, e.clientY);
  }, [isDragging, handleDragMove]);

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || e.touches.length === 0) return;
    e.preventDefault();
    const touch = e.touches[0];
    handleDragMove(touch.clientX, touch.clientY);
  }, [isDragging, handleDragMove]);

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const startDrag = useCallback((clientX: number, clientY: number) => {
    dragStartPos.current = { x: clientX, y: clientY };
    elementStartPos.current = { x: position.x, y: position.y };
    setIsDragging(true);
    onDragStart?.();
  }, [position, onDragStart]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  }, [startDrag]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  }, [startDrag]);

  const resetPosition = useCallback(() => {
    setPosition(initialPosition);
    setIsDefaultPosition(true);
  }, [initialPosition]);

  return {
    position,
    isDragging,
    dragHandlers: {
      onMouseDown,
      onTouchStart,
    },
    resetPosition,
    isDefaultPosition,
  };
}
