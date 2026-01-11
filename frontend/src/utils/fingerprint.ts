import FingerprintJS from '@fingerprintjs/fingerprintjs';

export interface DeviceFingerprint {
  visitorId: string;
  components: Record<string, { value: unknown }>;
  confidence: {
    score: number;
  };
}

let fpPromise: Promise<any> | null = null;

/**
 * Initialize FingerprintJS and get device fingerprint
 */
export async function generateFingerprint(): Promise<DeviceFingerprint> {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load();
  }
  
  const fp = await fpPromise;
  const result = await fp.get();
  
  return {
    visitorId: result.visitorId,
    components: result.components,
    confidence: {
      score: result.confidence.score
    }
  };
}

/**
 * Create a hash of the fingerprint for display/verification
 */
export function createFingerprintHash(fingerprint: DeviceFingerprint): string {
  // Simple hash for display purposes
  return fingerprint.visitorId.substring(0, 16);
}
