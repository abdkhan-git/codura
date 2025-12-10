/**
 * Performance monitoring utilities
 */

export function measurePageLoad() {
  if (typeof window === 'undefined') return;

  // Wait for page to fully load
  window.addEventListener('load', () => {
    // Use Performance API
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    const connectTime = perfData.responseEnd - perfData.requestStart;
    const renderTime = perfData.domComplete - perfData.domLoading;

    if (process.env.NODE_ENV === 'development') {
      console.log('Performance Metrics:');
      console.log(`  Page Load Time: ${pageLoadTime}ms`);
      console.log(`  Server Response: ${connectTime}ms`);
      console.log(`  DOM Render: ${renderTime}ms`);
    }

    // Report to analytics if needed
    // trackEvent('performance', {
    //   pageLoadTime,
    //   connectTime,
    //   renderTime
    // });
  });
}

export function measureAPICall(name: string, startTime: number) {
  const duration = Date.now() - startTime;

  if (process.env.NODE_ENV === 'development') {
    console.log(`API Call [${name}]: ${duration}ms`);
  }

  return duration;
}

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  measurePageLoad();
}