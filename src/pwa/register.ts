export async function registerServiceWorker(
  container: Pick<ServiceWorkerContainer, 'register'> | undefined,
  enabled: boolean,
): Promise<boolean> {
  if (!enabled || !container) {
    return false;
  }
  try {
    await container.register('/sw.js', { scope: '/' });
    return true;
  } catch {
    return false;
  }
}
