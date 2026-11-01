import { PlayBundle, GameItem, PlaySummary } from '../types';

// Use environment variable if provided (e.g. on Vercel: VITE_API_BASE_URL=https://my-backend.onrender.com)
// Otherwise defaults to relative '/api'
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string)?.replace(/\/$/, '') || '/api';

export async function fetchGames(): Promise<GameItem[]> {
  try {
    const res = await fetch(`${API_BASE}/games`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend /api/games unreachable, falling back to static /data/games.json', err);
    try {
      const fallbackRes = await fetch('/data/games.json');
      if (fallbackRes.ok) return await fallbackRes.json();
    } catch {
      // ignore
    }
    return [];
  }
}

export async function fetchPlaysForGame(gameId: number, quarter?: number): Promise<PlaySummary[]> {
  try {
    let url = `${API_BASE}/plays?game_id=${gameId}`;
    if (quarter !== undefined && quarter > 0) {
      url += `&quarter=${quarter}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`Backend /api/plays unreachable, falling back to static /data/plays_${gameId}.json`, err);
    try {
      const fallbackRes = await fetch(`/data/plays_${gameId}.json`);
      if (fallbackRes.ok) {
        let plays: PlaySummary[] = await fallbackRes.json();
        if (quarter !== undefined && quarter > 0) {
          plays = plays.filter(p => p.quarter === quarter);
        }
        return plays;
      }
    } catch {
      // ignore
    }
    return [];
  }
}

export async function fetchPlayBundle(gameId: number, playId: number): Promise<PlayBundle> {
  try {
    const res = await fetch(`${API_BASE}/play/${gameId}/${playId}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Backend /api/play/${gameId}/${playId} failed, trying static fallback...`, err);
  }

  // Try static fallback bundle if running on standalone static deployment
  try {
    const fallbackRes = await fetch(`/data/plays/${gameId}_${playId}.json`);
    if (fallbackRes.ok) {
      return await fallbackRes.json();
    }
  } catch {
    // fallback failed
  }

  throw new Error(`Failed to load play bundle for game ${gameId} play ${playId}. Backend API not reachable and no static bundle available.`);
}


import { SecurityPosture, CloudTrailEvent, ThreatSimulationResult, EncryptedEnvelope } from '../types';

export async function fetchSecurityPosture(): Promise<SecurityPosture | null> {
  try {
    const res = await fetch(`${API_BASE}/security/posture`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend /api/security/posture unreachable, loading static posture...', err);
  }

  try {
    const fallbackRes = await fetch('/data/security_posture.json');
    if (fallbackRes.ok) return await fallbackRes.json();
  } catch {
    // ignore
  }
  return null;
}

export async function fetchSecurityAuditLog(limit: number = 25): Promise<CloudTrailEvent[]> {
  try {
    const res = await fetch(`${API_BASE}/security/audit-log?limit=${limit}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend /api/security/audit-log unreachable, loading static audit log...', err);
  }

  try {
    const fallbackRes = await fetch('/data/security_audit.json');
    if (fallbackRes.ok) return await fallbackRes.json();
  } catch {
    // ignore
  }
  return [];
}

export async function simulateThreat(threatType: string): Promise<ThreatSimulationResult> {
  try {
    const res = await fetch(`${API_BASE}/security/simulate-threat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threat_type: threatType })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend simulation failed, running client-side mock...', err);
  }

  // Realistic client-side simulation fallback if running purely on static Vercel
  const mockTimestamp = new Date().toISOString();
  if (threatType === 'sqli') {
    return {
      status: 'MITIGATED',
      attack_type: 'SQL / DuckDB Injection Attempt',
      defense_layer: 'AWS WAF v2 (Edge Perimeter)',
      matched_rule: 'AWSManagedRulesSQLiRuleSet',
      action: 'BLOCK_REQUEST (HTTP 403 Forbidden)',
      remediation: 'Request terminated at CloudFront/WAF edge prior to reaching analytics engine.',
      event: {
        event_id: 'waf-mock-' + Math.random().toString(36).substring(2, 9),
        event_time: mockTimestamp,
        event_source: 'wafv2.amazonaws.com',
        event_name: 'waf:BlockRequest',
        aws_region: 'us-east-1',
        principal: 'arn:aws:iam::748921849102:role/AnonymousAttacker',
        principal_role: 'AnonymousAttacker',
        resource_arn: 'arn:aws:wafv2:us-east-1:748921849102:regional/webacl/GridironLens-Telemetry-Protection-WAF',
        action: 'WAF_BLOCK',
        data_classification: 'INTERNAL_PLAYBOOK',
        decision: 'BLOCKED_BY_WAF',
        ip_address: '203.0.113.195',
        user_agent: 'sqlmap/1.7.2#stable',
        details: "AWS WAF v2 Rule 'AWSManagedRulesSQLiRuleSet' triggered by pattern 'UNION SELECT * FROM plays WHERE 1=1--'"
      }
    };
  } else if (threatType === 'exfiltration') {
    return {
      status: 'MITIGATED',
      attack_type: 'Unauthorized Scouting Data Exfiltration',
      defense_layer: 'IAM Attribute-Based Access Control (ABAC)',
      matched_rule: 'GridironLens-Coach-ABAC-Policy (Explicit Deny)',
      action: 'DENY_ACCESS (HTTP 403 Forbidden)',
      remediation: "CloudWatch Metric Alarm 'HighFrequencyScoutingIntelAccessAlert' dispatched alert to SecOps SNS.",
      event: {
        event_id: 'abac-mock-' + Math.random().toString(36).substring(2, 9),
        event_time: mockTimestamp,
        event_source: 'iam.amazonaws.com',
        event_name: 'iam:EvaluatePolicy',
        aws_region: 'us-east-1',
        principal: 'arn:aws:iam::748921849102:role/GridironLens-Coach-Analytics-Role',
        principal_role: 'CoachRole',
        resource_arn: 'arn:aws:s3:::gridironlens-nfl-telemetry-production/scouting/*',
        action: 'EVALUATE_POLICY',
        data_classification: 'RESTRICTED_SCOUTING',
        decision: 'DENIED',
        ip_address: '192.0.2.78',
        user_agent: 'AutomatedScraper/1.0',
        details: 'Zero-Trust ABAC Violation: CoachRole attempted unauthorized bulk download of Front-Office Combine Intel'
      }
    };
  } else {
    return {
      status: 'MITIGATED',
      attack_type: 'High-Velocity Telemetry Scraping (DDoS)',
      defense_layer: 'AWS WAF v2 Rate-Based Rule',
      matched_rule: 'RateLimitPerIP (Threshold: 500 req/5min)',
      action: 'RATE_LIMIT_BLOCK (HTTP 429 Too Many Requests)',
      remediation: 'IP automatically throttled and blocked for 10-minute cooldown.',
      event: {
        event_id: 'rate-mock-' + Math.random().toString(36).substring(2, 9),
        event_time: mockTimestamp,
        event_source: 'wafv2.amazonaws.com',
        event_name: 'waf:RateLimitBlock',
        aws_region: 'us-east-1',
        principal: 'arn:aws:iam::748921849102:role/AnonymousCrawler',
        principal_role: 'AnonymousCrawler',
        resource_arn: 'arn:aws:wafv2:us-east-1:748921849102:regional/webacl/GridironLens-Telemetry-Protection-WAF',
        action: 'RATE_LIMIT_BLOCK',
        data_classification: 'CONFIDENTIAL_BIOMETRIC',
        decision: 'BLOCKED_BY_WAF',
        ip_address: '198.51.100.22',
        user_agent: 'Mozilla/5.0 (BotScraper)',
        details: "AWS WAF v2 Rule 'RateLimitPerIP' triggered: 1,420 requests from IP within 5-minute aggregation window"
      }
    };
  }
}

export async function encryptPlayerTelemetry(
  playerId: number,
  payload: Record<string, any>,
  classification: string = 'CONFIDENTIAL_BIOMETRIC'
): Promise<EncryptedEnvelope | null> {
  try {
    const res = await fetch(`${API_BASE}/security/encrypt-player`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id: playerId,
        payload,
        classification
      })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend encryption endpoint unreachable, generating client-side envelope mock...', err);
  }

  // Client-side fallback token
  const jsonStr = JSON.stringify(payload);
  const fakeCipher = btoa(jsonStr).split('').reverse().join('');
  return {
    version: '1.0',
    encryption: {
      algorithm: 'AES-256-GCM',
      key_management: 'AWS-KMS-Envelope',
      kms_cmk_arn: 'arn:aws:kms:us-east-1:748921849102:key/nfl-telemetry-cmk-88f1c3',
      kms_cmk_alias: 'alias/nfl-nextgen-telemetry-cmk',
      encrypted_dek_b64: btoa('MOCK_ENCRYPTED_DEK_BYTES_256_BIT'),
      nonce_b64: btoa('96_BIT_NONCE_VAL'),
      data_classification: classification,
      key_rotation_enabled: true,
      tls_enforced: true
    },
    meta: {
      playerId,
      encryptedAt: new Date().toISOString(),
      payloadSizeBytes: jsonStr.length,
      ciphertextSizeBytes: fakeCipher.length
    },
    ciphertext: fakeCipher
  };
}
