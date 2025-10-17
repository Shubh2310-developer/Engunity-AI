/**
 * Service Loader - Lazy load backend services on-demand
 */

const API_BASE = 'http://localhost:8000';

export interface ServiceStatus {
  service_id: string;
  name: string;
  status: 'running' | 'stopped' | 'starting' | 'error';
  port: number | null;
  pid: number | null;
  uptime: number | null;
  memory_mb: number | null;
}

export interface ServiceRequirement {
  service_id: string;
  name: string;
  port: number;
  is_running: boolean;
  is_healthy: boolean;
  estimated_startup_time: number;
}

// Map dashboard features to service requirements
const FEATURE_SERVICE_MAP: Record<string, string[]> = {
  'documents': ['hybrid_rag'],
  'document_qa': ['hybrid_rag'],
  'research': ['citation_classifier'],
  'editor': ['code_executor'],
  'chatandcode': ['agentic_rag'],
  'advanced_chat': ['agentic_rag'],
};

/**
 * Get all services status
 */
export async function getServicesStatus(): Promise<ServiceStatus[]> {
  try {
    const response = await fetch(`${API_BASE}/api/services/status`);
    if (!response.ok) throw new Error('Failed to fetch services status');
    return await response.json();
  } catch (error) {
    console.error('Error fetching services status:', error);
    return [];
  }
}

/**
 * Get required services for a feature
 */
export async function getRequiredServices(feature: string): Promise<ServiceRequirement[]> {
  try {
    const response = await fetch(`${API_BASE}/api/services/required-for/${feature}`);
    if (!response.ok) throw new Error('Failed to fetch required services');
    const data = await response.json();
    return data.required_services || [];
  } catch (error) {
    console.error('Error fetching required services:', error);
    return [];
  }
}

/**
 * Start a specific service
 */
export async function startService(serviceId: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/api/services/start/${serviceId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to start service');
    return await response.json();
  } catch (error) {
    console.error(`Error starting service ${serviceId}:`, error);
    throw error;
  }
}

/**
 * Stop a specific service
 */
export async function stopService(serviceId: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/api/services/stop/${serviceId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to stop service');
    return await response.json();
  } catch (error) {
    console.error(`Error stopping service ${serviceId}:`, error);
    throw error;
  }
}

/**
 * Start all services required for a feature
 */
export async function startServicesForFeature(feature: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/api/services/start-for-feature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ feature }),
    });
    if (!response.ok) throw new Error('Failed to start services for feature');
    return await response.json();
  } catch (error) {
    console.error(`Error starting services for feature ${feature}:`, error);
    throw error;
  }
}

/**
 * Check if all required services for a feature are running
 */
export async function areServicesReadyForFeature(feature: string): Promise<boolean> {
  const required = await getRequiredServices(feature);
  if (required.length === 0) return true; // No services required

  return required.every(service => service.is_running && service.is_healthy);
}

/**
 * Wait for a service to be ready
 */
export async function waitForService(
  serviceId: string,
  maxWaitMs: number = 30000,
  pollIntervalMs: number = 2000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const statuses = await getServicesStatus();
    const service = statuses.find(s => s.service_id === serviceId);

    if (service && service.status === 'running') {
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  return false;
}

/**
 * Ensure services are ready for a feature, starting them if needed
 * Returns a promise that resolves when services are ready
 */
export async function ensureServicesReady(
  feature: string,
  onProgress?: (message: string, progress: number) => void
): Promise<void> {
  // Check if services are already running
  const isReady = await areServicesReadyForFeature(feature);
  if (isReady) {
    onProgress?.('Services ready', 100);
    return;
  }

  // Get required services
  const required = await getRequiredServices(feature);
  if (required.length === 0) {
    onProgress?.('No services required', 100);
    return;
  }

  // Start services that aren't running
  onProgress?.('Starting required services...', 10);

  const result = await startServicesForFeature(feature);

  // Wait for each service to be ready
  const servicesToWait = result.services?.filter((s: any) => s.status === 'started') || [];

  if (servicesToWait.length === 0) {
    onProgress?.('Services ready', 100);
    return;
  }

  onProgress?.(`Starting ${servicesToWait.length} service(s)...`, 30);

  // Wait for all services to be ready
  const maxWait = Math.max(...servicesToWait.map((s: any) => s.estimated_ready_time || 15)) * 1000;

  for (let i = 0; i < servicesToWait.length; i++) {
    const service = servicesToWait[i];
    const progress = 30 + ((i + 1) / servicesToWait.length) * 60;

    onProgress?.(
      `Waiting for ${service.service || service.service_id} to be ready...`,
      progress
    );

    await waitForService(service.service_id, maxWait);
  }

  onProgress?.('All services ready', 100);
}
