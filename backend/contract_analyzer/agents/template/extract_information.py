from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime
from tqdm.auto import tqdm
import pandas as pd
import json


class ExtractionProcessor:
    """Enhanced processor for contract information extraction"""

    def __init__(self):
        self.results = []
        self.extraction_types = {
            "Agreement Category": "master agreement, service agreement, license agreement, framework agreement, statement of work, purchase order, SOW, MSA, SaaS agreement",
            "Template used": "template, standard form, form agreement, standard terms, company template, approved template, template version",
            "Nature of Agreement": "scope, purpose, whereas, background, recitals, nature, type of agreement, agreement purpose",
            "Document Type": "agreement, contract, deed, amendment, addendum, memorandum, MOU, letter of intent, LOI",
            "Document Type Comment": "agreement type, contract classification, document category, contract type, supporting document",
            "Contracting Entity": "party, first party, company, corporation, entity, contracting party, service provider",
            "Contracting Entity Location": "registered office, principal place of business, address, location, headquarters, incorporation place",
            "Counterparty Entity Name": "second party, counterparty, client, customer, vendor, supplier, contractor",
            "Counterparty Entity Location": "counterparty address, client location, vendor location, supplier address",
            "Contract Summary": "purpose, whereas clause, recitals, scope of services, scope of work, agreement overview",
            "Country Where Work will be performed": "location of services, place of performance, service location, delivery location, work site",
            "Effective Date": "term, effective, term clause, commencement date, start date",
            "Effective Date Comments": "effectiveness condition, condition precedent, starting conditions",
            "Initial Term End Date": "term clause, end, expiration date, initial period end",
            "Initial Term End Date Comments": "initial term conditions, first period end, primary term completion",
            "Term Type": "fixed term, indefinite term, perpetual, duration, term period, contract duration",
            "Term Type Comments": "term conditions, duration specifications, period details",
            "Contract Terminated on": "termination date, end date, cessation date, contract end",
            "Contract Terminated on Comments": "early termination, termination notice, termination trigger, termination conditions",
            "Renewal Type": "renew, renewal, extend, extension, automatic renewal, renewal terms",
            "Renewal Type Comments": "renewal conditions, extension provisions, continuation terms",
            "Renewal Term End Date": "renewal expiration, extension end date, renewed term end",
            "Renewal Term End Date Comments": "renewal period end conditions, extension completion terms",
            "Milestone of Agreements or Contract": "deliverables, milestones, phases, timeline, schedule, key dates",
            "Milestone of Agreements or Contract Comments": "milestone conditions, delivery schedule, phase completion",
            "Agreement Termination Type": "terminate, termination, termination clause, termination rights",
            "Agreement Termination Type Comment": "termination conditions, termination process, termination procedure",
            "Agreement Termination notice Period": "notice period, termination notice, advance notice, written notice",
            "Agreement Termination notice Period Comments": "notice requirements, notification terms, notice conditions",
            "Payment Currency": "currency, dollars, EUR, USD, payment in, denomination, monetary unit",
            "Payment Term": "payment schedule, payment terms, net 30, net 60, payment within, payment deadline",
            "Late Payment Onus": "interest, late payment interest, default interest, interest rate",
            "Late Payment Onus Comments": "interest calculation, late payment consequences, default terms",
            "Late Payment Penalty": "penalty, late fee, additional charges, penalty rate, liquidated damages",
            "Price": "fees, charges, cost, price, rate, compensation, payment amount",
            "Price Comments": "pricing terms, fee structure, cost breakdown, rate card",
            "Value Of Contract": "contract value, total value, consideration, total fees, contract worth",
            "Invoice Cycle": "invoice, billing cycle, billing period, invoice frequency, payment schedule",
            "Invoice Cycle Comments": "billing terms, invoice schedule, payment frequency",
            "Liability Cap": "liability clause, liable, limitation of liability, liability limit, maximum liability",
            "Liability Cap Comments": "liability conditions, liability exceptions, liability terms",
            "Indemnity": "indemnification clause, indemnify, indem*, indemnification, hold harmless",
            "Indemnity Comments": "indemnification scope, indemnity conditions, indemnification terms",
            "Confidential Obligation": "confidentiality clause, confidential information, non-disclosure, secrecy",
            "Confidentiality Obligation Comments": "confidentiality terms, confidentiality scope, disclosure restrictions",
            "Duration of Confidentiality Obligation": "confidentiality period, confidentiality term, survival period",
            "Limitation of Data Processing": "data protection, GDPR, data processing, personal data, data handling",
            "Exclusivity": "intellectual property clause, exclusive, exclusive rights, sole rights",
            "Exclusivity Comments": "exclusivity terms, exclusive arrangements, exclusivity scope",
            "Sub-Contractor Permitted": "contractor, contracting, sub-contracting clause, subcontractor",
            "Sub-Contractor Permitted Comments": "subcontracting terms, delegation rights, assignment rights",
            "Non-Compete": "compete, non-compete clause, competition restriction, competitive activities",
            "Non-Compete Comments": "competition terms, non-compete scope, competitive restrictions",
            "Non-Solicitation": "solicit, non-solicitation clause, hire, employ, poaching",
            "Non-Solicitation Comments": "solicitation restrictions, hiring restrictions, employee restrictions",
            "Types of IP": "copyright, patents, database rights, trade marks, designs, know-how, intellectual property types",
            "Ownership of IP": "intellectual property clause, intellectual, owns, ownership, owner, IP rights",
            "Ownership of IP comments": "IP ownership terms, intellectual property rights, ownership conditions",
            "Transfer of IP": "intellectual property clause, transfer, transferable, IP assignment",
            "Transfer of IP Comments": "IP transfer terms, assignment conditions, transfer restrictions",
            "Insurance if Any": "insurance clause, insurance, coverage, policy, insured amount",
            "Any ESG Or CSR Obligation": "environmental, social, governance, sustainability, corporate social responsibility, ESG",
            "Change of Control Provision": "change in control, merger, acquisition, ownership change, control transfer",
            "Governing Law": "law, laws, governing law provision, jurisdiction, applicable law",
            "Dispute resolution": "court, arbitration, dispute, mediation, conflict resolution",
            "Notes": "additional terms, special conditions, additional provisions, remarks",
        }
        

    def create_df(self) -> pd.DataFrame:
        """Create DataFrame from extraction types"""
        return pd.DataFrame(
            list(self.extraction_types.items()), 
            columns=['Term', 'Terms']
        )

    def process_extractions(self, vec, agent) -> None:
        """Process all extractions"""
        df = self.create_df()
        for _, row in tqdm(df.iterrows(), desc="Extracting Information"):
            context = vec.get_context(self._build_search_prompt(row))
            response = agent.run(self._build_extraction_prompt(context, row))
            self._store_result(row['Term'], response)

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
        Extract {row['Term']} from:
        {context}

        Requirements:
        - Extract only the specific value
        - Return "Not specified" if not found
        - No explanations or analysis
        
        Format: {row['Term']}: <value>
        """

    def _store_result(self, term: str, response: Any) -> None:
        """Store extraction result"""
        self.results.append({
            "term": term,
            "extracted_value": response.content.strip(),
            "confidence": "high" if "not specified" not in response.content.lower() else "low",
            "timestamp": datetime.now().isoformat()
        })

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
            "confidence_levels": df["confidence"].value_counts().to_dict(),
            "completion_rate": f"{(len(df[df['extracted_value'] != 'Not specified']) / len(df)) * 100:.1f}%"
        }