#!/usr/bin/env node
// Central prestart environment validation using shared schema.
import 'dotenv/config';
import { CONFIG } from '../backend/config/env.js';

// If import succeeded, CONFIG is valid per schema. Additional production-only alerts:
if (CONFIG.NODE_ENV === 'production') {
  console.log('[verify-env] Production configuration validated.');
} else {
  console.log('[verify-env] Development configuration validated.');
}

