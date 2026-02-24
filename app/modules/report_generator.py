import json
from pathlib import Path
from dataclasses import asdict
from app.core import config
from app.core.types import SessionReport

class ReportGenerator:
    """
    Generates structured JSON reports for analysis sessions.
    """
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.report_dir = config.REPORTS_DIR
        self.report_dir.mkdir(parents=True, exist_ok=True)

    def generate(self, report: SessionReport) -> str:
        """
        Writes the SessionReport to disk as JSON.
        Returns the file path.
        """
        filepath = self.report_dir / f"{self.session_id}.json"
        
        # Convert dataclass to dict
        data = asdict(report)
        
        with open(filepath, "w") as f:
            json.dump(data, f, indent=4)
            
        print(f"Report generated: {filepath}")
        return str(filepath)
