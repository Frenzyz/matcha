import React from 'react';
    import './FloatingLeaves.css';

    const getRandom = (min: number, max: number) => Math.random() * (max - min) + min;

    const Leaf = () => {
      const size = getRandom(10, 30);
      const animationDuration = getRandom(5, 15);
      const animationDelay = getRandom(0, 5);
      const startPosition = getRandom(0, 100);
      const horizontalOffset = getRandom(-20, 20);

      const style = {
        width: `${size}px`,
        height: `${size}px`,
        animationDuration: `${animationDuration}s`,
        animationDelay: `${animationDelay}s`,
        left: `${startPosition}%`,
        transform: `translateX(${horizontalOffset}px) rotate(45deg)`
      };

      return <div className="floating-leaf" style={style} />;
    };

    export default function FloatingLeaves() {
      const numLeaves = 20;
      return (
        <div className="floating-leaves-container" aria-hidden="true">
          {Array.from({ length: numLeaves }, (_, i) => <Leaf key={i} />)}
        </div>
      );
    }
