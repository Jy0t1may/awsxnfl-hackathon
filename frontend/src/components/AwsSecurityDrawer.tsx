import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Key, 
  AlertTriangle, 
  FileText, 
  Server, 
  Cpu, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  X, 
  Eye, 
  EyeOff, 
  RefreshCw,
  Terminal,
  Layers,
  ArrowRight
} from 'lucide-react';
import { SecurityPosture, CloudTrailEvent, ThreatSimulationResult, EncryptedEnvelope } from '../types';
import { fetchSecurityPosture, fetchSecurityAuditLog, simulateThreat, encryptPlayerTelemetry } from '../api/client';

interface AwsSecurityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlayer: any | null;
}

export const AwsSecurityDrawer: React.FC<AwsSecurityDrawerProps> = ({
  isOpen,
  onClose,
  selectedPlayer
}) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'cryptography' | 'audit'>('architecture');
  const [posture, setPosture] = useState<SecurityPosture | null>(null);
  const [auditLogs, setAuditLogs] = useState<CloudTrailEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Cryptographic Inspector State
  const [encryptedEnvelope, setEncryptedEnvelope] = useState<EncryptedEnvelope | null>(null);
  const [encrypting, setEncrypting] = useState<boolean>(false);
  const [showPlaintext, setShowPlaintext] = useState<boolean>(true);

  // Threat Simulation State
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<ThreatSimulationResult | null>(null);

  // Load posture and audit logs on open
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([fetchSecurityPosture(), fetchSecurityAuditLog(25)])
        .then(([postureData, auditData]) => {
          if (postureData) setPosture(postureData);
          if (auditData) setAuditLogs(auditData);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  // Handle KMS Encryption on the active player
  const handleEncryptPlayer = async () => {
    const payload = selectedPlayer ? {
      nflId: selectedPlayer.nflId,
      displayName: selectedPlayer.displayName,
      position: selectedPlayer.position,
      playPeakSpeedMph: selectedPlayer.playPeakSpeedMph,
      playPeakAccel: selectedPlayer.playPeakAccel,
      forty: selectedPlayer.combine?.forty || null,
      vertical: selectedPlayer.combine?.vertical || null,
      pffRole: selectedPlayer.pffRole || 'Pass'
    } : {
      nflId: 35481,
      displayName: "Antonio Brown",
      position: "WR",
      playPeakSpeedMph: 21.4,
      playPeakAccel: 4.8,
      forty: 4.48,
      vertical: 38.5,
      pffRole: "Pass Route"
    };

    setEncrypting(true);
    try {
      const envelope = await encryptPlayerTelemetry(
        payload.nflId, 
        payload, 
        'CONFIDENTIAL_BIOMETRIC'
      );
      setEncryptedEnvelope(envelope);
      // Refresh audit logs
      const updatedLogs = await fetchSecurityAuditLog(25);
      setAuditLogs(updatedLogs);
    } finally {
      setEncrypting(false);
    }
  };

  // Handle Threat Simulation
  const handleSimulate = async (threatType: string) => {
    setSimulating(true);
    try {
      const result = await simulateThreat(threatType);
      setSimulationResult(result);
      if (result.event) {
        setAuditLogs(prev => [result.event, ...prev]);
      }
    } finally {
      setSimulating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm transition-opacity">
      <div className="relative w-full max-w-4xl h-full bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black font-mono tracking-tight text-white">
                  AWS CYBER DEFENSE & ZERO-TRUST GOVERNANCE
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  NIST SP 800-207
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                AWS KMS CMK (Envelope AES-256-GCM) • S3 Data Lake TLS/PAB • IAM ABAC • AWS WAF v2
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Posture Status Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-6 py-2.5 bg-slate-900/40 border-b border-slate-800 text-[11px] font-mono">
          <div className="flex items-center space-x-2 p-1.5 rounded bg-slate-900/60 border border-slate-800/60">
            <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">KMS Key Management</span>
              <span className="text-amber-400 font-bold">CMK (AES-256-GCM)</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 p-1.5 rounded bg-slate-900/60 border border-slate-800/60">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">S3 Storage Lake</span>
              <span className="text-emerald-400 font-bold">SSE-KMS + TLS 1.3</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 p-1.5 rounded bg-slate-900/60 border border-slate-800/60">
            <Zap className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">AWS WAF v2</span>
              <span className="text-sky-400 font-bold">Active Rate + SQLi</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 p-1.5 rounded bg-slate-900/60 border border-slate-800/60">
            <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">IAM Authorization</span>
              <span className="text-purple-400 font-bold">ABAC Role Guard</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 px-6 pt-3 border-b border-slate-800 bg-slate-950 font-mono text-xs">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`pb-2.5 px-3 border-b-2 font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'architecture'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Architecture & ABAC Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('cryptography')}
            className={`pb-2.5 px-3 border-b-2 font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'cryptography'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>KMS Envelope Cryptography</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-2.5 px-3 border-b-2 font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'audit'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>CloudTrail Audit & Threat Simulator</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: ARCHITECTURE & ABAC MATRIX */}
          {activeTab === 'architecture' && (
            <div className="space-y-6">
              {/* Architecture Pipeline Flow Diagram */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-400 flex items-center space-x-2">
                    <Server className="w-4 h-4 text-emerald-400" />
                    <span>Zero-Trust Ingestion & Analytics Pipeline</span>
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">Terraform-Managed (infrastructure/aws)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-center text-[11px] font-mono">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
                    <div className="text-slate-400 font-bold mb-1">1. Stadium Edge</div>
                    <div className="text-emerald-400 font-semibold my-1">Zebra RFID Sensors</div>
                    <div className="text-[9px] text-slate-500">10Hz Raw Coordinates</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
                    <div className="text-slate-400 font-bold mb-1">2. Edge Perimeter</div>
                    <div className="text-sky-400 font-semibold my-1">AWS WAF v2</div>
                    <div className="text-[9px] text-slate-500">Rate Limiter + SQLi Rules</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
                    <div className="text-slate-400 font-bold mb-1">3. Authorization</div>
                    <div className="text-purple-400 font-semibold my-1">IAM ABAC Guard</div>
                    <div className="text-[9px] text-slate-500">Coach vs. Scout Scopes</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
                    <div className="text-slate-400 font-bold mb-1">4. Cryptography</div>
                    <div className="text-amber-400 font-semibold my-1">AWS KMS CMK</div>
                    <div className="text-[9px] text-slate-500">AES-256-GCM Envelope</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
                    <div className="text-slate-400 font-bold mb-1">5. Data Lake</div>
                    <div className="text-emerald-400 font-semibold my-1">Amazon S3 Lake</div>
                    <div className="text-[9px] text-slate-500">TLS Only • Block Public</div>
                  </div>
                </div>
              </div>

              {/* ABAC Separation of Duties Table */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200 flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Attribute-Based Access Control (ABAC) Separation of Duties</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Strict separation prevents coaching staff from accessing confidential prospect scouting intel, and prevents scouts from accessing proprietary game plan tactic sheets.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 bg-slate-950">
                        <th className="py-2 px-3">Role / Principal</th>
                        <th className="py-2 px-3">Department</th>
                        <th className="py-2 px-3">Clearance Tag</th>
                        <th className="py-2 px-3">Authorized Telemetry</th>
                        <th className="py-2 px-3">Enforced Deny (Zero-Trust)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      <tr>
                        <td className="py-2 px-3 font-bold text-emerald-400">CoachRole</td>
                        <td className="py-2 px-3 text-slate-300">Coaching</td>
                        <td className="py-2 px-3 text-slate-400">PlaybookSchemes</td>
                        <td className="py-2 px-3 text-emerald-300">Offensive Formations, Coverage EPA, 10Hz Tracking</td>
                        <td className="py-2 px-3 text-red-400 font-semibold">❌ Front-Office Combine Intel</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-amber-400">ScoutRole</td>
                        <td className="py-2 px-3 text-slate-300">Scouting</td>
                        <td className="py-2 px-3 text-slate-400">ScoutingIntel</td>
                        <td className="py-2 px-3 text-amber-300">Combine Measurables, 40-Yd Speeds, Draft Capital</td>
                        <td className="py-2 px-3 text-red-400 font-semibold">❌ Proprietary Playbook Tactics</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-sky-400">ZebraIngestRole</td>
                        <td className="py-2 px-3 text-slate-300">StadiumOps</td>
                        <td className="py-2 px-3 text-slate-400">RawIngest</td>
                        <td className="py-2 px-3 text-sky-300">RFID Raw Coordinates (Write Only)</td>
                        <td className="py-2 px-3 text-red-400 font-semibold">❌ Read Access to Tactics & Scouting</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-purple-400">SecOpsAdmin</td>
                        <td className="py-2 px-3 text-slate-300">SecurityOps</td>
                        <td className="py-2 px-3 text-slate-400">ZeroTrustSuperuser</td>
                        <td className="py-2 px-3 text-purple-300">Full Audit Stream, KMS Key Management</td>
                        <td className="py-2 px-3 text-slate-500">None (Monitored by CloudTrail)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* S3 Security Configuration Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                  <h4 className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>S3 Data Lake Security Controls</span>
                  </h4>
                  <ul className="text-xs space-y-1.5 text-slate-300 font-mono">
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>S3 Public Access Block: <b className="text-white">ENFORCED (All 4 Flags)</b></span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Transport Layer: <b className="text-white">Strict TLS 1.3 Deny Policy</b></span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Encryption: <b className="text-white">SSE-KMS with Bucket Key</b></span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Object Versioning: <b className="text-white">Enabled for Forensic Immutability</b></span>
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                  <h4 className="text-xs font-bold font-mono text-sky-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>AWS WAF v2 Threat Mitigation</span>
                  </h4>
                  <ul className="text-xs space-y-1.5 text-slate-300 font-mono">
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>Rate Limit Rule: <b className="text-white">500 req / 5 min per IP</b></span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>SQLi Defense: <b className="text-white">AWSManagedRulesSQLiRuleSet</b></span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>Common Exploits: <b className="text-white">AWSManagedRulesCommonRuleSet</b></span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>Bot Protection: <b className="text-white">Automated Scraper Blocking</b></span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KMS ENVELOPE CRYPTOGRAPHY */}
          {activeTab === 'cryptography' && (
            <div className="space-y-6">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-amber-400 flex items-center space-x-2">
                      <Key className="w-4 h-4 text-amber-400" />
                      <span>Field-Level Cryptographic Inspector</span>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Encrypting sensitive athlete telemetry using AWS KMS Customer Managed Key (CMK)
                    </p>
                  </div>

                  <button
                    onClick={handleEncryptPlayer}
                    disabled={encrypting}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-amber-950/40 disabled:opacity-50"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>{encrypting ? 'Encrypting via KMS...' : 'Encrypt Player via KMS'}</span>
                  </button>
                </div>

                {/* Selected Player Info */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-slate-400">Target Athlete: </span>
                    <span className="font-bold text-white">
                      {selectedPlayer ? `${selectedPlayer.displayName} (#${selectedPlayer.jerseyNumber || 'N/A'}, ${selectedPlayer.position})` : 'Antonio Brown (#81, WR)'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/40">
                      Classification: Confidential Biometrics
                    </span>
                  </div>
                </div>

                {/* Plaintext vs Ciphertext Inspection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Plaintext Payload */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-300 flex items-center space-x-1">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>Plaintext Telemetry Payload</span>
                      </span>
                      <button
                        onClick={() => setShowPlaintext(!showPlaintext)}
                        className="text-[11px] text-slate-400 hover:text-white font-mono flex items-center space-x-1"
                      >
                        {showPlaintext ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showPlaintext ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>

                    <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-64">
                      {showPlaintext ? JSON.stringify(
                        selectedPlayer ? {
                          nflId: selectedPlayer.nflId,
                          displayName: selectedPlayer.displayName,
                          position: selectedPlayer.position,
                          playPeakSpeedMph: selectedPlayer.playPeakSpeedMph,
                          playPeakAccel: selectedPlayer.playPeakAccel,
                          combine: selectedPlayer.combine || null
                        } : {
                          nflId: 35481,
                          displayName: "Antonio Brown",
                          position: "WR",
                          playPeakSpeedMph: 21.4,
                          playPeakAccel: 4.8,
                          combine: { forty: 4.48, vertical: 38.5, broadJump: 125 }
                        },
                        null,
                        2
                      ) : '•••••••••••••••••••••••••••••••••••••••'}
                    </pre>
                  </div>

                  {/* Right: KMS Envelope Ciphertext */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-amber-400 flex items-center space-x-1">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>KMS Envelope Ciphertext Token</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">AES-256-GCM + DEK</span>
                    </div>

                    {encryptedEnvelope ? (
                      <pre className="p-3 rounded-lg bg-slate-950 border border-amber-900/40 text-[11px] font-mono text-amber-300 overflow-x-auto max-h-64">
                        {JSON.stringify(encryptedEnvelope, null, 2)}
                      </pre>
                    ) : (
                      <div className="p-8 rounded-lg bg-slate-950 border border-slate-800 text-center text-xs font-mono text-slate-500">
                        Click "Encrypt Player via KMS" above to generate a 256-bit encrypted envelope token.
                      </div>
                    )}
                  </div>
                </div>

                {/* KMS Cryptographic Guarantee Footnote */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Each tracking payload uses a uniquely generated 256-bit Data Encryption Key (DEK). The DEK is encrypted under the Customer Managed Key (CMK) and stored alongside the ciphertext, preventing single-key blast radius vulnerabilities.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CLOUDTRAIL AUDIT & THREAT SIMULATOR */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              {/* Interactive Threat Defense Simulator */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-red-400 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span>Interactive Cyber Threat Simulator</span>
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">Test Live AWS Defense Layer</span>
                </div>
                <p className="text-xs text-slate-400">
                  Select a threat scenario to simulate an active attack against the NFL analytics platform. Observe how AWS WAF v2 and IAM ABAC boundaries block the request and record a high-severity security event.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => handleSimulate('sqli')}
                    disabled={simulating}
                    className="p-3 rounded-lg bg-red-950/40 hover:bg-red-900/40 border border-red-800/50 text-left transition-all disabled:opacity-50"
                  >
                    <div className="text-xs font-bold text-red-300 font-mono flex items-center space-x-1.5 mb-1">
                      <Zap className="w-3.5 h-3.5 text-red-400" />
                      <span>1. SQLi Attack</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Injects malicious DuckDB SQL payload into query parameters.
                    </p>
                  </button>

                  <button
                    onClick={() => handleSimulate('exfiltration')}
                    disabled={simulating}
                    className="p-3 rounded-lg bg-amber-950/40 hover:bg-amber-900/40 border border-amber-800/50 text-left transition-all disabled:opacity-50"
                  >
                    <div className="text-xs font-bold text-amber-300 font-mono flex items-center space-x-1.5 mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>2. ABAC Exfiltration</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Coach role attempts unauthorized download of scouting intel.
                    </p>
                  </button>

                  <button
                    onClick={() => handleSimulate('rate_limit')}
                    disabled={simulating}
                    className="p-3 rounded-lg bg-sky-950/40 hover:bg-sky-900/40 border border-sky-800/50 text-left transition-all disabled:opacity-50"
                  >
                    <div className="text-xs font-bold text-sky-300 font-mono flex items-center space-x-1.5 mb-1">
                      <Server className="w-3.5 h-3.5 text-sky-400" />
                      <span>3. Telemetry Scraping</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Automated crawler exceeds WAF 500 req/5min rate limit.
                    </p>
                  </button>
                </div>

                {/* Simulation Result Banner */}
                {simulationResult && (
                  <div className="p-3.5 rounded-lg bg-slate-950 border border-red-500/40 font-mono text-xs space-y-2 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-400 flex items-center space-x-1.5">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span>ATTACK MITIGATED: {simulationResult.attack_type}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] uppercase font-bold border border-red-500/40">
                        {simulationResult.action}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <div><span className="text-slate-500">Defense Layer:</span> {simulationResult.defense_layer}</div>
                      <div><span className="text-slate-500">Triggered Rule:</span> {simulationResult.matched_rule}</div>
                    </div>
                    <p className="text-[11px] text-emerald-400 border-t border-slate-800 pt-1.5">
                      <b>Remediation:</b> {simulationResult.remediation}
                    </p>
                  </div>
                )}
              </div>

              {/* CloudTrail Audit Stream Table */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200 flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>Real-Time CloudTrail Security Audit Stream</span>
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">Immutable Tamper-Proof Log</span>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400">
                      <tr>
                        <th className="py-2 px-2.5">Time (UTC)</th>
                        <th className="py-2 px-2.5">Event Name</th>
                        <th className="py-2 px-2.5">Principal Role</th>
                        <th className="py-2 px-2.5">Data Tier</th>
                        <th className="py-2 px-2.5">Decision</th>
                        <th className="py-2 px-2.5">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {auditLogs.map((log) => {
                        const isAllowed = log.decision === 'ALLOWED';
                        return (
                          <tr key={log.event_id} className="hover:bg-slate-900/50">
                            <td className="py-2 px-2.5 text-slate-400 text-[10px] whitespace-nowrap">
                              {log.event_time.split('T')[1]?.split('.')[0] || log.event_time}
                            </td>
                            <td className="py-2 px-2.5 text-white font-semibold whitespace-nowrap">
                              {log.event_name}
                            </td>
                            <td className="py-2 px-2.5 text-slate-300 whitespace-nowrap">
                              {log.principal_role}
                            </td>
                            <td className="py-2 px-2.5 text-purple-300 text-[10px] whitespace-nowrap">
                              {log.data_classification}
                            </td>
                            <td className="py-2 px-2.5 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isAllowed
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : 'bg-red-500/20 text-red-400 border border-red-500/40'
                              }`}>
                                {log.decision}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 text-slate-400 text-[11px] truncate max-w-xs">
                              {log.details}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-900/80 text-xs font-mono text-slate-400">
          <div>
            <span>AWS Security Posture: </span>
            <span className="font-bold text-emerald-400">100% Zero-Trust Compliant</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
