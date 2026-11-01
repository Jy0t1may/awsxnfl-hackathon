import uuid
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from collections import deque


class ZeroTrustGovernanceManager:
    """
    Manages Zero-Trust Attribute-Based Access Control (ABAC), data classification,
    and structured CloudTrail audit logging for NFL Next Gen Stats telemetry.
    """

    # Data Classifications
    DATA_CLASSIFICATIONS = {
        "PUBLIC": {
            "label": "Public Match Context",
            "badge_color": "emerald",
            "fields": ["gameId", "week", "gameDate", "homeTeam", "visitorTeam", "score", "quarter", "clock"],
            "allowed_roles": ["*"]
        },
        "INTERNAL_PLAYBOOK": {
            "label": "Internal Playbook Schemes",
            "badge_color": "blue",
            "fields": ["offenseFormation", "personnelO", "coverage", "epa", "cpoe", "playDescription", "pff_role"],
            "allowed_roles": ["CoachRole", "SecOpsAdmin"]
        },
        "CONFIDENTIAL_BIOMETRIC": {
            "label": "Confidential Athlete Biometrics (KMS Encrypted)",
            "badge_color": "purple",
            "fields": ["x", "y", "s", "speed_mph", "a", "dis", "o", "dir", "separation_distance", "heart_rate_est"],
            "allowed_roles": ["CoachRole", "ScoutRole", "SecOpsAdmin"]
        },
        "RESTRICTED_SCOUTING": {
            "label": "Restricted Front-Office Scouting Intel",
            "badge_color": "amber",
            "fields": ["forty", "vertical", "broad_jump", "cone", "shuttle", "bench", "pfr_av", "draft_capital"],
            "allowed_roles": ["ScoutRole", "SecOpsAdmin"]
        }
    }

    ROLES_DEFINITION = {
        "CoachRole": {
            "department": "Coaching",
            "clearance": "PlaybookSchemes",
            "allowed_classifications": ["PUBLIC", "INTERNAL_PLAYBOOK", "CONFIDENTIAL_BIOMETRIC"],
            "denied_classifications": ["RESTRICTED_SCOUTING"]
        },
        "ScoutRole": {
            "department": "Scouting",
            "clearance": "ScoutingIntel",
            "allowed_classifications": ["PUBLIC", "CONFIDENTIAL_BIOMETRIC", "RESTRICTED_SCOUTING"],
            "denied_classifications": ["INTERNAL_PLAYBOOK"]
        },
        "ZebraIngestRole": {
            "department": "StadiumOperations",
            "clearance": "RawIngest",
            "allowed_classifications": ["CONFIDENTIAL_BIOMETRIC"],
            "denied_classifications": ["INTERNAL_PLAYBOOK", "RESTRICTED_SCOUTING"]
        },
        "SecOpsAdmin": {
            "department": "SecurityOperations",
            "clearance": "ZeroTrustSuperuser",
            "allowed_classifications": ["PUBLIC", "INTERNAL_PLAYBOOK", "CONFIDENTIAL_BIOMETRIC", "RESTRICTED_SCOUTING"],
            "denied_classifications": []
        }
    }

    def __init__(self, max_audit_entries: int = 100):
        self.max_audit_entries = max_audit_entries
        self.audit_log: deque = deque(maxlen=max_audit_entries)
        self._seed_initial_audit_log()

    def _seed_initial_audit_log(self):
        """Seed authentic CloudTrail audit records for initial UI rendering."""
        seeds = [
            {
                "event_id": str(uuid.uuid4()),
                "event_time": datetime.now(timezone.utc).isoformat(),
                "event_source": "kms.amazonaws.com",
                "event_name": "kms:GenerateDataKey",
                "aws_region": "us-east-1",
                "principal": "arn:aws:iam::748921849102:role/GridironLens-RFID-TelemetryIngestion-Role",
                "principal_role": "ZebraIngestRole",
                "resource_arn": "arn:aws:kms:us-east-1:748921849102:key/nfl-telemetry-cmk-88f1c3",
                "action": "ENCRYPT_DEK",
                "data_classification": "CONFIDENTIAL_BIOMETRIC",
                "decision": "ALLOWED",
                "ip_address": "52.95.12.44",
                "user_agent": "aws-sdk-python/1.34.0 (ZebraRFID/SensorNetwork)",
                "details": "Generated 256-bit AES-GCM data encryption key for 10Hz tracking frame ingestion"
            },
            {
                "event_id": str(uuid.uuid4()),
                "event_time": datetime.now(timezone.utc).isoformat(),
                "event_source": "s3.amazonaws.com",
                "event_name": "s3:GetObject",
                "aws_region": "us-east-1",
                "principal": "arn:aws:iam::748921849102:role/GridironLens-Coach-Analytics-Role",
                "principal_role": "CoachRole",
                "resource_arn": "arn:aws:s3:::gridironlens-nfl-telemetry-production/schemes/game_2021090900.parquet",
                "action": "READ_TACTICAL_SCHEME",
                "data_classification": "INTERNAL_PLAYBOOK",
                "decision": "ALLOWED",
                "ip_address": "192.0.2.78",
                "user_agent": "GridironLens/2.0 (CoachView)",
                "details": "Authorized read of offensive formation EPA benchmark & pass coverage shell"
            },
            {
                "event_id": str(uuid.uuid4()),
                "event_time": datetime.now(timezone.utc).isoformat(),
                "event_source": "kms.amazonaws.com",
                "event_name": "kms:Decrypt",
                "aws_region": "us-east-1",
                "principal": "arn:aws:iam::748921849102:role/GridironLens-Scout-Recruiter-Role",
                "principal_role": "ScoutRole",
                "resource_arn": "arn:aws:kms:us-east-1:748921849102:key/nfl-telemetry-cmk-88f1c3",
                "action": "DECRYPT_COMBINE_PROFILE",
                "data_classification": "RESTRICTED_SCOUTING",
                "decision": "ALLOWED",
                "ip_address": "198.51.100.12",
                "user_agent": "GridironLens/2.0 (RecruiterView)",
                "details": "Decrypted PFR Combine percentiles and peak game speed scatter telemetry"
            }
        ]
        for s in seeds:
            self.audit_log.appendleft(s)

    def log_event(
        self,
        event_name: str,
        principal_role: str,
        data_classification: str,
        decision: str,
        details: str,
        event_source: str = "kms.amazonaws.com",
        ip_address: str = "127.0.0.1",
        user_agent: str = "GridironLens/2.0"
    ) -> Dict[str, Any]:
        """Record an immutable CloudTrail audit entry."""
        entry = {
            "event_id": str(uuid.uuid4()),
            "event_time": datetime.now(timezone.utc).isoformat(),
            "event_source": event_source,
            "event_name": event_name,
            "aws_region": "us-east-1",
            "principal": f"arn:aws:iam::748921849102:role/GridironLens-{principal_role}",
            "principal_role": principal_role,
            "resource_arn": "arn:aws:kms:us-east-1:748921849102:key/nfl-telemetry-cmk-88f1c3",
            "action": event_name.upper(),
            "data_classification": data_classification,
            "decision": decision,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "details": details
        }
        self.audit_log.appendleft(entry)
        return entry

    def evaluate_abac(
        self,
        principal_role: str,
        data_classification: str,
        ip_address: str = "127.0.0.1"
    ) -> Tuple[bool, str]:
        """
        Evaluates Zero-Trust Attribute-Based Access Control (ABAC) rules.
        """
        role_info = self.ROLES_DEFINITION.get(principal_role)
        if not role_info:
            self.log_event(
                event_name="iam:EvaluatePolicy",
                principal_role=principal_role,
                data_classification=data_classification,
                decision="DENIED",
                details=f"Zero-Trust Failure: Unknown principal role '{principal_role}' attempted access",
                event_source="iam.amazonaws.com",
                ip_address=ip_address
            )
            return False, f"Access Denied: Unrecognized principal role '{principal_role}'."

        if data_classification in role_info["denied_classifications"]:
            self.log_event(
                event_name="iam:EvaluatePolicy",
                principal_role=principal_role,
                data_classification=data_classification,
                decision="DENIED",
                details=f"ABAC Boundary Block: {principal_role} denied access to {data_classification} per least-privilege policy",
                event_source="iam.amazonaws.com",
                ip_address=ip_address
            )
            return False, f"Zero-Trust Denial: {principal_role} does not possess clearance for {data_classification}."

        if data_classification in role_info["allowed_classifications"] or "PUBLIC" in role_info["allowed_classifications"]:
            self.log_event(
                event_name="kms:Decrypt" if "CONFIDENTIAL" in data_classification or "RESTRICTED" in data_classification else "s3:GetObject",
                principal_role=principal_role,
                data_classification=data_classification,
                decision="ALLOWED",
                details=f"ABAC Access Granted: {principal_role} authorized under clearance '{role_info['clearance']}'",
                event_source="kms.amazonaws.com" if "CONFIDENTIAL" in data_classification else "s3.amazonaws.com",
                ip_address=ip_address
            )
            return True, "Access Granted."

        return False, "Access Denied by default Zero-Trust boundary."

    def simulate_threat(self, threat_type: str, attacker_ip: str = "203.0.113.195") -> Dict[str, Any]:
        """
        Simulates an active cyber attack against the NFL analytics platform,
        evaluates against AWS WAF v2 and IAM ABAC boundaries, and logs the mitigation.
        """
        if threat_type == "sqli":
            event = self.log_event(
                event_name="waf:BlockRequest",
                principal_role="AnonymousAttacker",
                data_classification="INTERNAL_PLAYBOOK",
                decision="BLOCKED_BY_WAF",
                details="AWS WAF v2 Rule 'AWSManagedRulesSQLiRuleSet' triggered by pattern 'UNION SELECT * FROM plays WHERE 1=1--'",
                event_source="wafv2.amazonaws.com",
                ip_address=attacker_ip,
                user_agent="sqlmap/1.7.2#stable"
            )
            return {
                "status": "MITIGATED",
                "attack_type": "SQL / DuckDB Injection Attempt",
                "defense_layer": "AWS WAF v2 (Edge Perimeter)",
                "matched_rule": "AWSManagedRulesSQLiRuleSet",
                "action": "BLOCK_REQUEST (HTTP 403 Forbidden)",
                "event": event,
                "remediation": "Request terminated at CloudFront/WAF edge prior to reaching DuckDB engine."
            }

        elif threat_type == "exfiltration":
            event = self.log_event(
                event_name="iam:EvaluatePolicy",
                principal_role="CoachRole",
                data_classification="RESTRICTED_SCOUTING",
                decision="DENIED",
                details="Zero-Trust ABAC Violation: CoachRole attempted unauthorized bulk download of Front-Office Combine Intel",
                event_source="iam.amazonaws.com",
                ip_address=attacker_ip,
                user_agent="AutomatedScraper/1.0"
            )
            return {
                "status": "MITIGATED",
                "attack_type": "Unauthorized Scouting Data Exfiltration",
                "defense_layer": "IAM Attribute-Based Access Control (ABAC)",
                "matched_rule": "GridironLens-Coach-ABAC-Policy (Explicit Deny)",
                "action": "DENY_ACCESS (HTTP 403 Forbidden)",
                "event": event,
                "remediation": "CloudWatch Metric Alarm 'HighFrequencyScoutingIntelAccessAlert' dispatched alert to SecOps SNS."
            }

        elif threat_type == "rate_limit":
            event = self.log_event(
                event_name="waf:RateLimitBlock",
                principal_role="AnonymousCrawler",
                data_classification="CONFIDENTIAL_BIOMETRIC",
                decision="BLOCKED_BY_WAF",
                details="AWS WAF v2 Rule 'RateLimitPerIP' triggered: 1,420 requests from IP within 5-minute aggregation window",
                event_source="wafv2.amazonaws.com",
                ip_address=attacker_ip,
                user_agent="Mozilla/5.0 (BotScraper)"
            )
            return {
                "status": "MITIGATED",
                "attack_type": "High-Velocity Telemetry Scraping (DDoS)",
                "defense_layer": "AWS WAF v2 Rate-Based Rule",
                "matched_rule": "RateLimitPerIP (Threshold: 500 req/5min)",
                "action": "RATE_LIMIT_BLOCK (HTTP 429 Too Many Requests)",
                "event": event,
                "remediation": "IP automatically throttled and blocked for 10-minute cooldown."
            }

        else:
            return {"status": "UNKNOWN_THREAT", "message": f"Unrecognized threat type '{threat_type}'"}

    def get_audit_trail(self, limit: int = 25) -> List[Dict[str, Any]]:
        return list(self.audit_log)[:limit]


# Global singleton
zero_trust_manager = ZeroTrustGovernanceManager()
