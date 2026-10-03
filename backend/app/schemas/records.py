"""Evidence and Finding records, following docs/12_DATA_MODELS_AND_SCHEMAS.md sections 4 and 5."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.core.config import SCHEMA_VERSION

Severity = Literal["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
AccessMode = Literal["WHITE_BOX", "BLACK_BOX", "FILE_ONLY", "N_A"]
FindingStatus = Literal["OPEN", "UNDER_REVIEW", "CLOSED"]
Disposition = Literal["ACCEPT", "MONITOR", "REVIEW", "QUARANTINE", "ROLLBACK"]


class _Strict(BaseModel):
    # Unknown fields and unknown enum values are rejected (doc 12 section 9).
    model_config = ConfigDict(extra="forbid")


class Evidence(_Strict):
    evidence_id: str = Field(pattern=r"^EV-")
    evidence_type: Literal["DATA_ANOMALY", "MODEL_BEHAVIOR", "PROVENANCE", "DISTRIBUTION_SHIFT"]
    detector: str
    detector_version: str
    access_mode: AccessMode
    asset_ids: list[str]
    observation: str
    measurements: dict[str, Any]
    baseline: dict[str, Any]
    decision_rule: str
    confidence: float = Field(ge=0.0, le=1.0)
    severity: Severity
    limitations: list[str]
    related_evidence_ids: list[str] = []
    created_at: str
    schema_version: str = SCHEMA_VERSION


class Finding(_Strict):
    finding_id: str = Field(pattern=r"^FND-")
    incident_id: str | None = None
    assessment_id: str | None = None
    contributor_id: str | None = None
    summary: str
    reason: str
    evidence_ids: list[str] = Field(min_length=1)
    affected_asset_ids: list[str] = Field(min_length=1)
    severity: Severity
    confidence: float = Field(ge=0.0, le=1.0)
    status: FindingStatus = "OPEN"
    recommended_disposition: Disposition
    limitations: list[str] = []
    coverage: dict[str, Any] = {}
    schema_version: str = SCHEMA_VERSION
