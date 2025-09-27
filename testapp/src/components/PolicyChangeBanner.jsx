import React from 'react';
import { isDraftLegal } from '../legal/legalMeta.js';

/**
 * Displays a notification banner if policies are draft or if a newer version
 * notification mechanism is later implemented (e.g., comparing stored consent version).
 * For now it simply signals draft status and instructs users that terms may change.
 */
export default function PolicyChangeBanner({ docType, version }) {
  if (!isDraftLegal()) return null;
  const isPrivacy = docType === 'privacy';
  return (
    <div className="mt-4 border border-indigo-300 bg-indigo-50 text-indigo-800 text-xs p-3 rounded">
      <strong className="font-semibold mr-1">{isPrivacy ? 'Privacy Policy' : 'Terms'} Draft</strong>
      This {isPrivacy ? 'policy' : 'document'} is a draft (version {version}). Content may change. You will be asked to re-accept when finalized.
    </div>
  );
}
