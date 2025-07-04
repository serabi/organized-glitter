/**
 * @fileoverview This file re-exports the secureLogger for consistent import paths.
 * The original development-only logger has been replaced by the environment-aware secureLogger.
 */
import { secureLogger } from './secureLogger';

export const logger = secureLogger;
