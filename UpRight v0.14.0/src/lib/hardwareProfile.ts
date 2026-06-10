import { HardwareProfile } from '../types';

// Hardware profile

// Cache key
const PROFILE_KEY = 'upright_hardware_profile';

export const getHardwareProfile = async (forceRefresh = false): Promise<HardwareProfile> => {
  if (!forceRefresh) {
    const cached = localStorage.getItem(PROFILE_KEY);
    if (cached) {
      try {
        const profile: HardwareProfile = JSON.parse(cached);
        // Expire cache
        const daysOld = (Date.now() - new Date(profile.detectedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysOld < 7) {
          return profile;
        }
      } catch {
        // Parse fallback
      }
    }
  }

  // CPU cores
  const cpuCores = navigator.hardwareConcurrency || 4;

  // GPU check
  let hasGPU = false;
  let gpuRenderer = '';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      hasGPU = true;
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        gpuRenderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
    }
  } catch {
    // WebGL failed
  }

  // Micro benchmark
  const runBenchmark = (): number => {
    const start = performance.now();
    let val = 0;
    // Calculation loop
    for (let i = 0; i < 5000000; i++) {
        val += Math.sin(i) * Math.cos(i);
    }
    return performance.now() - start;
  };

  const msElapsed = runBenchmark();
  
  // Calculate tier
  let tier: 'high' | 'balanced' | 'low';
  if (cpuCores >= 8 && msElapsed < 30 && hasGPU) {
    tier = 'high';
  } else if (cpuCores <= 4 && msElapsed > 60) {
    tier = 'low';
  } else if (!hasGPU) {
    tier = 'low';
  } else {
    tier = 'balanced';
  }

  // Boost igpus
  if (gpuRenderer.toLowerCase().includes('apple m1') || gpuRenderer.toLowerCase().includes('apple m2')) {
    tier = 'high';
  }

  const profile: HardwareProfile = {
    tier,
    cpuCores,
    hasGPU,
    detectedAt: new Date().toISOString(),
  };

  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

  return profile;
};
