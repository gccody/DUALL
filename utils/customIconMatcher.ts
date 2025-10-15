import { Service } from '@/types';
import totpData from '../assets/totp.json';
import { customIcons } from './customIcons';

// Interface for TOTP service data
interface TotpServiceData {
  name: string;
  domain: string;
}

// Cache for domain lookups to improve performance
const domainCache = new Map<string, string | null>();

/**
 * Normalize a string for comparison by converting to lowercase and removing special characters
 */
function normalizeString(str: string | undefined): string {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Extract domain from issuer using various heuristics
 */
function extractDomainFromIssuer(issuer: string | undefined): string | null {
  if (!issuer) return null;
  
  const normalized = issuer.toLowerCase().trim();
  
  // Direct domain patterns
  const domainPatterns = [
    // Match domains with TLD
    /([a-z0-9-]+\.[a-z]{2,})/,
    // Match subdomains
    /([a-z0-9-]+\.[a-z0-9-]+\.[a-z]{2,})/,
  ];
  
  for (const pattern of domainPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Find matching domain from totp.json based on issuer
 */
function findMatchingDomain(issuer: string | undefined): string | null {
  if (!issuer) return null;
  
  // Check cache first
  const cacheKey = normalizeString(issuer);
  if (domainCache.has(cacheKey)) {
    return domainCache.get(cacheKey) || null;
  }
  
  const normalizedIssuer = normalizeString(issuer);
  let bestMatch: string | null = null;
  let bestScore = 0;
  
  // Try exact issuer match first
  const directDomain = extractDomainFromIssuer(issuer);
  if (directDomain) {
    const exactMatch = (totpData as TotpServiceData[]).find(
      service => service.domain === directDomain
    );
    if (exactMatch) {
      domainCache.set(cacheKey, exactMatch.domain);
      return exactMatch.domain;
    }
  }
  
  // Search through all services for matches
  for (const service of totpData as TotpServiceData[]) {
    const normalizedName = normalizeString(service.name);
    const normalizedDomain = normalizeString(service.domain);
    
    // Exact name match (highest priority)
    if (normalizedName === normalizedIssuer) {
      bestMatch = service.domain;
      bestScore = 100;
      break;
    }
    
    // Domain contains issuer
    if (normalizedDomain.includes(normalizedIssuer) && normalizedIssuer.length > 2) {
      const score = (normalizedIssuer.length / normalizedDomain.length) * 80;
      if (score > bestScore) {
        bestMatch = service.domain;
        bestScore = score;
      }
    }
    
    // Issuer contains domain (without TLD)
    const domainWithoutTld = normalizedDomain.replace(/\.[a-z]{2,}$/, '');
    if (normalizedIssuer.includes(domainWithoutTld) && domainWithoutTld.length > 2) {
      const score = (domainWithoutTld.length / normalizedIssuer.length) * 70;
      if (score > bestScore) {
        bestMatch = service.domain;
        bestScore = score;
      }
    }
    
    // Name contains issuer
    if (normalizedName.includes(normalizedIssuer) && normalizedIssuer.length > 2) {
      const score = (normalizedIssuer.length / normalizedName.length) * 60;
      if (score > bestScore) {
        bestMatch = service.domain;
        bestScore = score;
      }
    }
    
    // Issuer contains name
    if (normalizedIssuer.includes(normalizedName) && normalizedName.length > 2) {
      const score = (normalizedName.length / normalizedIssuer.length) * 50;
      if (score > bestScore) {
        bestMatch = service.domain;
        bestScore = score;
      }
    }
  }
  
  // Only return matches with a reasonable confidence score
  const result = bestScore >= 30 ? bestMatch : null;
  domainCache.set(cacheKey, result);
  return result;
}

/**
 * Get custom icon for a service based on its issuer
 */
export function getCustomIcon(service: Service): any | null {
  try {
    const domain = findMatchingDomain(service.otp.issuer);
    if (!domain) {
      return null;
    }
    
    const iconKey = `${domain}.avif`;
    return customIcons[iconKey] || null;
  } catch (error) {
    console.error('Error getting custom icon:', error);
    return null;
  }
}

/**
 * Check if a custom icon exists for a service
 */
export function hasCustomIcon(service: Service): boolean {
  return getCustomIcon(service) !== null;
}

/**
 * Get all available custom icon domains
 */
export function getAvailableCustomIconDomains(): string[] {
  return Object.keys(customIcons).map(key => key.replace('.avif', ''));
}

/**
 * Search for custom icons by domain or name
 */
export function searchCustomIcons(query: string): { domain: string; name: string; icon: any }[] {
  const normalizedQuery = normalizeString(query);
  const results: { domain: string; name: string; icon: any }[] = [];
  
  for (const service of totpData as TotpServiceData[]) {
    const normalizedName = normalizeString(service.name);
    const normalizedDomain = normalizeString(service.domain);
    const iconKey = `${service.domain}.avif`;
    
    if (customIcons[iconKey] && 
        (normalizedName.includes(normalizedQuery) || 
         normalizedDomain.includes(normalizedQuery))) {
      results.push({
        domain: service.domain,
        name: service.name,
        icon: customIcons[iconKey]
      });
    }
  }
  
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get service name from domain (reverse lookup)
 */
export function getServiceNameFromDomain(domain: string): string | null {
  const service = (totpData as TotpServiceData[]).find(s => s.domain === domain);
  return service?.name || null;
}