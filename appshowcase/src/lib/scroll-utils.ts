/**
 * Utility to smooth scroll to an element by ID
 * @param id The element ID to scroll to
 * @param offset Optional offset from the top
 */
export const smoothScrollTo = (id: string, offset: number = 0) => {
  const element = document.getElementById(id);
  if (!element) return;

  const bodyRect = document.body.getBoundingClientRect().top;
  const elementRect = element.getBoundingClientRect().top;
  const elementPosition = elementRect - bodyRect;
  const offsetPosition = elementPosition - offset;

  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth',
  });
};
