import confetti from 'canvas-confetti';

/**
 * Triggers a beautiful confetti explosion from the bottom corners of the screen.
 */
export function triggerWinConfetti() {
  const duration = 2.5 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    // since particles fall down, animate a bit higher than they would
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
  }, 250);
}

/**
 * Renders stylized falling heartbreak emojis on the screen for game over losses.
 */
export function triggerLossHeartbreaks() {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '99999';
  container.style.overflow = 'hidden';
  document.body.appendChild(container);

  const emojiCount = 24;
  for (let i = 0; i < emojiCount; i++) {
    const heart = document.createElement('div');
    heart.innerText = '💔';
    heart.style.position = 'absolute';
    heart.style.top = '-50px';
    heart.style.left = `${Math.random() * 100}vw`;
    heart.style.fontSize = `${20 + Math.random() * 30}px`;
    heart.style.opacity = `${0.4 + Math.random() * 0.6}`;
    
    // Add fallback animation inline
    const speed = 2 + Math.random() * 3;
    const delay = Math.random() * 2;
    
    heart.style.transition = `transform ${speed}s linear ${delay}s, opacity ${speed}s linear ${delay}s`;
    container.appendChild(heart);

    // Trigger animation via requestAnimationFrame
    requestAnimationFrame(() => {
      setTimeout(() => {
        heart.style.transform = `translateY(110vh) rotate(${randomAngle()}deg)`;
        heart.style.opacity = '0';
      }, 50);
    });
  }

  setTimeout(() => {
    container.remove();
  }, 6000);
}

function randomAngle() {
  return Math.random() * 360 - 180;
}

/**
 * Handles smooth auto-scroll to a DOM element selector, optionally restricted to single-player mode.
 */
export function autoScrollToResult(selector, isRaidSession = false) {
  if (isRaidSession) return; // Only auto-scroll in single mode as requested
  setTimeout(() => {
    const el = document.querySelector(selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 350);
}
