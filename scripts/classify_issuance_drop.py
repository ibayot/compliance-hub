from __future__ import annotations

import csv
import re
from pathlib import Path
from typing import Dict, List, Tuple

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
DROP = ROOT / "regulatory-issuances"
OUT = ROOT / "regulatory-issuances" / "classification-results.csv"
OUT_MD = ROOT / "regulatory-issuances" / "deepdive-assessment.md"

INCLUDED_CANONICAL = {
    "RA-10173": [r"\bra\s*10173\b", r"data privacy act"],
    "RA-10173-IRR": [r"data privacy act\s*.*irr", r"irr.*10173"],
    "RA-8792": [r"\bra\s*8792\b", r"electronic commerce act"],
    "RA-10175": [r"\bra\s*10175\b", r"cybercrime prevention act"],
    "RA-10844": [r"\bra\s*10844\b", r"dict act"],
    "RA-10929": [r"\bra\s*10929\b", r"free internet access"],
    "RA-11032": [r"\bra\s*11032\b", r"ease of doing business"],
    "RA-11032-IRR": [r"eodb.*irr", r"irr.*11032", r"jmc.*eodb"],
    "RA-11313": [r"\bra\s*11313\b", r"safe spaces"],
    "RA-11967": [r"\bra\s*11967\b", r"internet transactions act"],
    "RA-12009": [r"\bra\s*12009\b", r"new government procurement act"],
    "RA-9485": [r"\bra\s*9485\b", r"anti-red tape act"],
    "EO-2-2016": [r"\beo\s*2\b", r"freedom of information"],
    "RA-12254": [r"\bra\s*12254\b", r"e-governance act"],
    "RA-9184": [r"\bra\s*9184\b", r"government procurement reform act"],
    "GPPB-IRR-9184": [r"procurement act.*irr", r"revised irr", r"updated revised irr"],
    "RA-9470": [r"\bra\s*9470\b", r"national archives"],
    "EO-170-2022": [r"executive order\s*no\.?\s*170", r"digital payments"],
    "NCSP-2023-2028": [r"national cybersecurity plan\s*2023[-–]2028", r"eo\s*58"],
    "DICT-ISSUANCES": [r"department circular", r"dict\s*-\s*department circular", r"\bdict\b.*circular"],
    "DICT-CYBER-INDEX": [r"cybersecurity", r"cyber advisories"],
    "NPC-CIRCULARS": [r"npc circular", r"security of personal data"],
}

CANONICAL_RELEVANCE = {
    "RA-10173": "Data privacy governance baseline for lawful processing, security safeguards, and accountability in ICT systems.",
    "RA-10173-IRR": "Operational implementation guide for privacy obligations, breach response, and compliance controls.",
    "RA-8792": "Legal basis for electronic documents, signatures, and digital transactions in e-governance.",
    "RA-10175": "Cybercrime legal framework supporting incident response, cyber investigations, and digital evidence handling.",
    "RA-10844": "Establishes DICT mandate and national ICT governance architecture.",
    "RA-10929": "Public connectivity and service-delivery support for ICT access programs.",
    "RA-11032": "Drives digital service process reform and turnaround governance in public sector workflows.",
    "RA-11032-IRR": "Procedure-level implementation requirements for digital service delivery controls.",
    "RA-11313": "Online safety controls and obligations related to digital harassment prevention.",
    "RA-11967": "Internet transaction governance and online platform accountability baseline.",
    "RA-12009": "Modernized procurement regime affecting digital procurement and ICT acquisition controls.",
    "RA-9485": "Public service process-improvement law requiring anti-red-tape measures, client-facing service standards, and process transparency.",
    "EO-2-2016": "Public transparency directive supporting disclosure and information access processes in public service operations.",
    "RA-12254": "E-governance policy baseline supporting digital public services, interoperability, and service modernization.",
    "RA-9184": "Foundational procurement law with relevance to ICT procurement traceability and compliance.",
    "GPPB-IRR-9184": "Operational procurement rules used to implement digital/e-procurement procedures.",
    "RA-9470": "Records governance and retention controls relevant to electronic records and audit trails.",
    "EO-170-2022": "Government digital payments directive requiring secure interoperable ICT implementation.",
    "NCSP-2023-2028": "National cybersecurity strategy reference for risk reduction and resilience planning.",
    "DICT-ISSUANCES": "Department-level ICT circulars and directives used for practical implementation controls.",
    "DICT-CYBER-INDEX": "Cybersecurity advisories and policy references for operational cyber governance.",
    "NPC-CIRCULARS": "Privacy regulator circular guidance used for implementation and compliance interpretation.",
    "INTERNAL-AO": "Internal Administrative Order relevant to agency-specific ICT governance and operations.",
    "INTERNAL-MC": "Internal Memorandum Circular relevant to agency-specific ICT controls and procedures.",
}

EXTERNAL_CONTEXT = {
    "RA-10173": "Public explainers commonly frame this as the Philippines' primary personal-data rights and accountability law, implemented by the NPC.",
    "RA-10173-IRR": "External compliance blogs typically focus on practical obligations: lawful basis, security measures, breach response, and data subject rights operations.",
    "RA-10175": "Third-party legal commentary often highlights dual themes: cybercrime enforcement utility and free-expression concerns around cyberlibel implementation.",
    "RA-8792": "Technology-law explainers reference this as the legal-enablement law for electronic documents and transactions in government and commerce.",
    "RA-10844": "Policy analysis sources describe this as the institutional anchor that consolidated national ICT policy leadership under DICT.",
    "RA-9485": "Governance and public administration commentary usually frames this as a foundational anti-red-tape and service-delivery reform law for agencies.",
    "EO-2-2016": "Public governance explainers often cite this as the executive FOI operational mechanism for citizen-facing transparency requests.",
    "RA-12254": "E-government policy discussions generally present this as a key digital public-service modernization instrument.",
    "EO-170-2022": "Fintech and public finance commentary often discusses this as a major push for government digital payment adoption and interoperability.",
    "NCSP-2023-2028": "Cybersecurity policy discussions frame this as the strategic roadmap for national cyber resilience and cross-sector coordination.",
    "DICT-ISSUANCES": "ICT governance practitioners usually treat department circulars as immediate operational directives that refine implementation details.",
    "NPC-CIRCULARS": "Privacy advisory reviews frequently cite NPC circulars for concrete compliance expectations beyond statute-level text.",
    "GPPB-IRR-9184": "Procurement compliance commentary generally uses IRR guidance as the day-to-day interpretation layer for implementers and auditors.",
    "NIST-CSF-2.0": "Industry adoption notes position CSF 2.0 as a practical risk-management structure with profiles and mappings for implementation planning.",
    "ISO": "Independent assurance and governance literature describes ISO/IEC information-security standards as widely used control-baseline references.",
    "INTERNAL-AO": "Internal governance practice treats AOs as organization-specific operational policy instruments that should be retained for evidence and auditability.",
    "INTERNAL-MC": "Internal governance practice treats MCs as implementer guidance for day-to-day controls, escalation, and process consistency.",
}

FILENAME_PRIORITY_RULES = [
    (r"\bra\s*10173\b", "RA-10173"),
    (r"\bra\s*10175\b", "RA-10175"),
    (r"\bra\s*10844\b", "RA-10844"),
    (r"\bra\s*10929\b", "RA-10929"),
    (r"\bra\s*11032\b", "RA-11032"),
    (r"\bra\s*11313\b", "RA-11313"),
    (r"\bra\s*11967\b", "RA-11967"),
    (r"\bra\s*12009\b", "RA-12009"),
    (r"\bra\s*9485\b", "RA-9485"),
    (r"\beo\s*2\b|freedom of information", "EO-2-2016"),
    (r"\bra\s*12254\b|e-governance", "RA-12254"),
    (r"\bra\s*9184\b", "RA-9184"),
    (r"\bra\s*8792\b", "RA-8792"),
    (r"\bra\s*9470\b", "RA-9470"),
    (r"\beo\s*170\b", "EO-170-2022"),
    (r"\beo\s*58\b|national cybersecurity plan\s*2023[-–]2028", "NCSP-2023-2028"),
    (r"dict\s*-?\s*department circular|department circular", "DICT-ISSUANCES"),
    (r"npc\s*-?\s*npc circular|npc circular", "NPC-CIRCULARS"),
    (r"revised irr|updated revised irr|government procurement act irr|new government procurement act irr", "GPPB-IRR-9184"),
]

FILENAME_DEFERRED_RULES = [
    (r"hra\s*0?03\s*s\s*2025|derpartment circular no hra 003", "Sector-specific DICT telecom-provider circular; not generally applicable across non-telecom public service offices."),
    (r"\bra\s*12234\b|konektadong", "Deferred pending final operational control mapping in your scope."),
    (r"\bra\s*11927\b|digital workforce", "Deferred pending final operational control mapping in your scope."),
    (r"\bra\s*8484\b|access devices", "Access Devices laws currently deferred unless access-device fraud controls are in scope."),
    (r"\bra\s*8293\b|intellectual property|\bra\s*10372\b", "Intellectual Property laws are ICT-adjacent and deferred from current baseline."),
    (r"\bra\s*9775\b|anti-child pornography", "Deferred; safety-law track not in core ICT baseline."),
    (r"\bra\s*9995\b|voyeurism", "Deferred; safety-law track not in core ICT baseline."),
]

DEFERRED_KEYWORDS = [
    (r"\bra\s*8484\b|access devices", "Access Devices laws currently deferred unless access-device fraud controls are in scope."),
    (r"\bra\s*8293\b|intellectual property", "Intellectual Property laws are ICT-adjacent and deferred from current baseline."),
    (r"\bra\s*10372\b", "IP Code amendment is deferred with the IP track."),
    (r"\bra\s*9775\b|anti-child pornography", "Deferred; safety-law track not in core ICT baseline."),
    (r"\bra\s*9995\b|voyeurism", "Deferred; safety-law track not in core ICT baseline."),
    (r"\bra\s*12234\b|konektadong", "Deferred pending final operational control mapping in your scope."),
    (r"hra\s*0?03\s*s\s*2025|telecommunication business|telecommunications business|telecom providers", "Sector-specific telecom-provider issuance; outside general public-service applicability baseline."),
    (r"\bra\s*11927\b|digital workforce", "Deferred pending final operational control mapping in your scope."),
    (r"\beo\s*2\b|freedom of information", "Deferred unless FOI/transparency controls are explicitly in your ICT compliance baseline."),
]

PUBLIC_SERVICE_KEYWORDS = [
    "public service",
    "service delivery",
    "anti-red tape",
    "citizen charter",
    "government service",
    "transparency",
    "freedom of information",
    "e-governance",
    "ease of doing business",
]


def is_public_service_related(filename_hay: str, text_hay: str) -> bool:
    has_topic = any(keyword in text_hay or keyword in filename_hay for keyword in PUBLIC_SERVICE_KEYWORDS)
    looks_like_issuance = bool(re.search(r"\bra\s*\d+\b|\beo\s*\d+\b|\birr\b|\bcircular\b|\bact\b", f"{filename_hay} {text_hay}", flags=re.IGNORECASE))
    return has_topic and looks_like_issuance

EXCLUDED_KEYWORDS = [
    (r"\bao[_-]", "Internal administrative order track."),
    (r"\bmc[_-]|memorandum circular", "Internal memorandum circular track."),
]


def detect_policy_category(filename: str) -> Tuple[str, str]:
    low = filename.lower()
    if re.search(r"\bao[-_ ]|\badministrative order\b", low):
        return ("INTERNAL-AO", "INTERNAL POLICY - ADMINISTRATIVE ORDER")
    if re.search(r"\bmc[-_ ]|\bmemorandum circular\b", low):
        return ("INTERNAL-MC", "INTERNAL POLICY - MEMORANDUM CIRCULAR")
    return ("", "")


def infer_group(mapped_to: str, category: str) -> str:
    if mapped_to == "PUBLIC-SERVICE-RELATED":
        return "PUBLIC SERVICE"
    if category.startswith("INTERNAL POLICY"):
        return "INTERNAL POLICY"
    if mapped_to in {"RA-10173", "RA-8792", "RA-10175", "RA-10844", "RA-10929", "RA-11032", "RA-11313", "RA-11967", "RA-12009", "RA-9184", "RA-9470", "RA-9485", "RA-12254"}:
        return "LAW"
    if mapped_to.endswith("-IRR") or mapped_to == "GPPB-IRR-9184":
        return "IRR"
    if mapped_to.startswith("EO-"):
        return "EXECUTIVE ORDER"
    if mapped_to.startswith("NCSP"):
        return "PLAN"
    if mapped_to.startswith("DICT") or mapped_to.startswith("NPC"):
        return "CIRCULAR OR ADVISORY"
    return "OTHER"


def guess_title(text: str, filename: str) -> str:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for line in lines[:40]:
        if len(line) > 18 and len(line) < 180:
            return line
    return filename


def topical_keywords(text: str) -> str:
    topics = []
    low = text.lower()
    tests = [
        ("privacy", ["privacy", "personal data", "data subject"]),
        ("cybersecurity", ["cyber", "security", "incident"]),
        ("procurement", ["procurement", "bidding", "gppb"]),
        ("records", ["records", "archiv", "retention"]),
        ("digital services", ["electronic", "e-government", "online services"]),
        ("public service", ["public service", "service delivery", "anti-red tape", "citizen charter", "freedom of information"]),
        ("governance", ["governance", "compliance", "policy"]),
    ]
    for label, words in tests:
        if any(word in low for word in words):
            topics.append(label)
    return ", ".join(topics[:4]) if topics else "unclassified"


def extract_text(pdf_path: Path, max_chars: int = 120000) -> Tuple[str, int]:
    try:
      reader = PdfReader(str(pdf_path))
      chunks: List[str] = []
      total_pages = len(reader.pages)
      total_len = 0
      for page in reader.pages:
          text = page.extract_text() or ""
          if text:
              chunks.append(text)
              total_len += len(text)
          if total_len >= max_chars:
              break
      return ("\n".join(chunks), total_pages)
    except Exception:
      return ("", 0)


def classify(filename: str, text: str) -> Tuple[str, str, str, str]:
    filename_hay = filename.lower()
    text_hay = text.lower()

    internal_map, internal_category = detect_policy_category(filename)
    if internal_map:
        return (
            "INCLUDED",
            internal_map,
            "Included per rule: all AO/MC are classified as INTERNAL_POLICY.",
            internal_category,
        )

    for pattern, reason in FILENAME_DEFERRED_RULES:
        if re.search(pattern, filename_hay, flags=re.IGNORECASE):
            return ("MARK_FOR_REMOVAL", "DEFERRED", reason, "deferred")

    for pattern, mapped in FILENAME_PRIORITY_RULES:
        if re.search(pattern, filename_hay, flags=re.IGNORECASE):
            return ("INCLUDED", mapped, "Mapped by filename legal/circular identifier.", "national_baseline")

    if re.search(r"\bdata privacy act\b.*\birr\b|\birr\b.*\b10173\b", filename_hay, flags=re.IGNORECASE):
        return ("INCLUDED", "RA-10173-IRR", "Mapped by filename IRR identifier.", "national_baseline")

    if re.search(r"\bcybercrime\b.*\birr\b|\birr\b.*\b10175\b", filename_hay, flags=re.IGNORECASE):
        return ("INCLUDED", "RA-10175", "Mapped by filename IRR identifier.", "national_baseline")

    if re.search(r"\bjmc\b.*eodb|eodb.*irr", filename_hay, flags=re.IGNORECASE):
        return ("INCLUDED", "RA-11032-IRR", "Mapped by filename EODB IRR identifier.", "national_baseline")

    for canonical, patterns in INCLUDED_CANONICAL.items():
        for p in patterns:
            if re.search(p, text_hay, flags=re.IGNORECASE):
                return ("INCLUDED", canonical, "Matches current applicable issuance list.", "national_baseline")

    for p, reason in DEFERRED_KEYWORDS:
        if re.search(p, text_hay, flags=re.IGNORECASE):
            return ("MARK_FOR_REMOVAL", "DEFERRED", reason, "deferred")

    for p, reason in EXCLUDED_KEYWORDS:
        if re.search(p, text_hay, flags=re.IGNORECASE):
            if "administrative" in reason.lower():
                return (
                    "INCLUDED",
                    "INTERNAL-AO",
                    "Included per AO/MC internal policy rule (text fallback).",
                    "internal_policy_administrative_order",
                )
            return (
                "INCLUDED",
                "INTERNAL-MC",
                "Included per AO/MC internal policy rule (text fallback).",
                "internal_policy_memorandum_circular",
            )

    if is_public_service_related(filename_hay, text_hay):
        return (
            "INCLUDED",
            "PUBLIC-SERVICE-RELATED",
            "Included by public-service criterion (service delivery/transparency/process-reform relevance).",
            "PUBLIC SERVICE RELATED",
        )

    return (
        "MARK_FOR_REVIEW",
        "UNMAPPED",
        "Could not confidently map; requires manual validation of issuer, legal basis, and ICT control relevance.",
        "review",
    )


def main() -> None:
    files = sorted([p for p in DROP.iterdir() if p.is_file() and p.suffix.lower() == ".pdf"])  # noqa: E501

    rows: List[Dict[str, str]] = []
    md_lines: List[str] = [
        "# Issuance Drop Deep-Dive Assessment",
        "",
        "Generated by `scripts/classify_issuance_drop.py`.",
        "",
        "| File | Status | Policy Group | Mapping | Category | Key Topics | External Context |",
        "|---|---|---|---|---|---|---|",
    ]

    for pdf in files:
        text, page_count = extract_text(pdf)
        status, mapped, reason, category = classify(pdf.name, text)
        title_guess = guess_title(text, pdf.name)
        topics = topical_keywords(text)
        policy_group = infer_group(mapped, category)
        relevance = CANONICAL_RELEVANCE.get(mapped, "Needs manual legal/operational relevance confirmation.")
        external = EXTERNAL_CONTEXT.get(mapped, "No specific external explainer captured yet; rely on legal text and agency guidance.")

        rows.append(
            {
                "file": pdf.name,
                "status": status,
                "policy_group": policy_group,
                "mapped_to": mapped,
                "category": category,
                "page_count": str(page_count),
                "title_guess": title_guess,
                "key_topics": topics,
                "relevance_summary": relevance,
                "external_context": external,
                "reason": reason,
            }
        )

        md_lines.append(
            f"| {pdf.name} | {status} | {policy_group} | {mapped} | {category} | {topics} | {external} |"
        )

    with OUT.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "file",
                "status",
                "policy_group",
                "mapped_to",
                "category",
                "page_count",
                "title_guess",
                "key_topics",
                "relevance_summary",
                "external_context",
                "reason",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    OUT_MD.write_text("\n".join(md_lines), encoding="utf-8")

    summary: Dict[str, int] = {}
    for row in rows:
        summary[row["status"]] = summary.get(row["status"], 0) + 1

    print("Processed PDFs:", len(rows))
    for key in sorted(summary):
        print(f"{key}: {summary[key]}")
    print("Output:", OUT)
    print("Markdown Output:", OUT_MD)


if __name__ == "__main__":
    main()
