from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime
from tqdm.auto import tqdm
import pandas as pd
import json


class ExtractionProcessor:
    """Enhanced processor for contract information extraction with section tracking"""

    def __init__(self):
        self.results = []
        self.extraction_types = [
            "Contract Name",
            "Agreement Type",
            "Country of agreement",
            "Contract Details",
            " Entity Name",
            "Counterparty Name",
            "Summary",
            "Department of Contract Owner",
            "SPOC",
            "Agreement Group",
            "Family Agreement",
            "Family Documents Present",
            "Family Hierarchy",
            "Scanned",
            " Signature by:",
            "Effective Date",
            "Contract Start Date",
            "Contract Duration",
            "Contract End Date",
            "Contingent Contract",
            "Perpetual Contract",
            "SLA",
            "Stamping Date",
            "Franking Date",
            "Franking Date_Availablity",
            "Governing Law",
            "Dispute Resolution",
            "Place of Courts",
            "Court Jurisdiction",
            "Place of Arbitration",
            "Arbitration Institution",
            "Number of Arbitrators",
            "Seat of Arbitration",
            "Venue of Arbitration",
            "Legal Action Rights with counterparty",
            "Counterparty - liability cap",
            "Counterparty - liability limitation summary",
            "Indemnification",
            "Indemnification Summary",
            "Counterparty - liquidated damages",
            "Counterparty - damages summary",
            "Penalties",
            "Penal interest rate and other late payment charges",
            " assignment rights",
            "Counterparty assignment rights",
            "Counterparty - assignment summary",
            "Can  terminate for Convenience?",
            "If yes, number of notice days?",
            "Can Counterparty terminate for Convenience?",
            "Counterparty - If yes, number of notice days?",
            "Counterparty - termination summary",
            "Provision for lock-in period",
            "Period of lock in.",
            "Lock-in summary",
            "Counterparty  - Change of Control Provision",
            "Auto-renewal provision",
            "Notice period (in days) to stop auto renewal",
            "Renewal Option Notice Start Date",
            "Renewal Option Notice End Date",
            "Auto-renewal provision summary",
            "Acceleration clause applicable to ",
            "Acceleration clause applicable to Counterparty",
            "Acceleration clause - summary",
            "Exclusivity provision",
            "Scope",
            "Territory",
            "Carve-outs",
            "Exclusivity Period (Start Date)",
            "Exclusivity Period (End Date)",
            "Available to ",
            "Available to Counterparty",
            "Audit Rights - Summary",
            "Copyright",
            "Patent",
            "Trademark",
            "Other",
            "ABAC/FCPA provision",
            "ABAC/FCPA provision - summary",
            "Receive or Pay",
            "Currency",
            "Total Contract Value",
            "Fixed Fee",
            "Security Deposit / Bank Guarantee",
            "Fuel surcharges",
            "Advance payment period",
            "Advance payment Amount",
            "Term for Refund of Security Deposit",
            "Incentive",
            "Revenue Share",
            "Commission Percentage",
            "Minimum Guarantee",
            "Variable Fee",
            "Fee-Other",
            "Payment Type",
            "Payment Schedule (in days)",
            "Payment Terms / Details",
            "Milestones",
            "Payment to Affiliates / Agency",
            "Fee Escalation",
            "Stamp Duty Share",
            "Confidentiality",
            "Residual Confidentiality",
            "Exceptions to confidentiality",
            "Term (In months)",
            "Data Privacy Provision",
            "Data Privacy Summary",
            "Insurance coverage for ",
            "Insurance coverage for Counterparty",
            "Subcontracting rights for the  Counterpart",
            "Defect liability period",
            "Performance Guarantee",
            "Conflicts of Interests",
            "Force Majeure",
            "Insurance coverage",
            "Representation and Warranties",
            "Non-Compete",
            "Non-Solicitation",
            "Waiver",
            "Severability",
            "Survival",
            "Handwritten Comments",
            "Missing Pages",
            "Missing Signatures",
            "Review Comments (if any)",
        ]

    def create_df(self) -> pd.DataFrame:
        """Create DataFrame from extraction types"""
        return pd.DataFrame(
            list(self.extraction_types.items()), columns=["Term", "Terms"]
        )

    def process_extractions(self, content, vec, agent) -> None:
        """Process all extractions"""

        meta_list = [
            "Agreement Category",
            "Template used",
            "Nature of Agreement",
            "Document Type",
            "Document Type Comment",
            "Contracting Entity",
            "Contracting Entity Location",
            "Counterparty Entity Name",
            "Counterparty Entity Location",
        ]

        df = self.create_df()
        for _, row in tqdm(df.iterrows(), desc="Extracting Information"):
            # if len(content) > 20000:
            #     context = vec.get_context(self._build_search_prompt(row), num_results=2)
            # else:
            #     context = content

            if row["Term"].isin(meta_list):
                context = content[:3000]
            else:
                context = content

            response = agent.run(self._build_extraction_prompt(context, row))
            self._store_result(row["Term"], response, context)

    def _build_search_prompt(self, row: pd.Series) -> str:
        """Build vector search prompt"""
        return f"""
        Find sections containing information about {row['Term']}.
        Key phrases: {row['Terms']}
        Return relevant sections with context.
        """

    def _build_extraction_prompt(self, context: str, row: pd.Series) -> str:
        """Build extraction prompt"""
        return f"""
        {self.extraction_prompts[row['Term']]}
        Extract section/paragraph where the value was found from the following context. 
        Context:
        {context}

        Requirements:
        - Extract the specific value
        - Include the exact section/paragraph where the value was found (hint it will have numbers eg: 11.1, 12.1)
        - Return "Not specified" if not found
        - No explanations or analysis
        
        Format: 
        Value: <extracted_value>
        Section: <relevant_section>
        """

    def _parse_response(self, response: Any) -> Dict[str, str]:
        """Parse the response to extract value and section"""
        content = response.content.strip()

        # Initialize default values
        value = "Not specified"
        section = "Not found"

        # Split the response into lines
        lines = content.split("\n")

        for line in lines:
            line = line.strip()
            if line.startswith("Value:"):
                value = line[6:].strip()
            elif line.startswith("Section:"):
                section = line[8:].strip()

        return {"value": value, "section": section}

    def _store_result(self, term: str, response: Any, context: str) -> None:
        """Store extraction result with section information"""
        parsed_response = self._parse_response(response)

        self.results.append(
            {
                "term": term,
                "extracted_value": parsed_response["value"],
                "section": parsed_response["section"],
                "timestamp": datetime.now().isoformat(),
            }
        )

    def export_results(self, format: str = "json") -> Any:
        """Export results in specified format"""
        if format == "json":
            return json.dumps(self.results, indent=2)
        elif format in ["csv", "dataframe"]:
            df = pd.DataFrame(self.results)
            return df.to_csv(index=False) if format == "csv" else df
        raise ValueError(f"Unsupported format: {format}")

    def get_summary_stats(self) -> Dict:
        """Get summary statistics"""
        df = pd.DataFrame(self.results)
        return {
            "total_terms": len(df),
            "terms_found": len(df[df["extracted_value"] != "Not specified"]),
            "sections_found": len(df[df["section"] != "Not found"]),
            "completion_rate": f"{(len(df[df['extracted_value'] != 'Not specified']) / len(df)) * 100:.1f}%",
        }
