"""Regressão da mensagem curta do Buildx; sem acesso ao registry."""
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts/ci"))
import base_images

class RegistryCliTests(unittest.TestCase):
    ref = "ghcr.io/wkarts/pige360-self-base-python:base-test"

    def inspect(self, error):
        result = subprocess.CompletedProcess([], 1, "", error)
        with patch.object(base_images.subprocess, "run", return_value=result):
            return base_images.inspect(self.ref, optional=True)

    def test_exact_ref_not_found_is_absent(self):
        self.assertIsNone(self.inspect("ERROR: " + self.ref + ": not found\n"))

    def test_other_path_not_found_is_not_absent(self):
        with self.assertRaises(RuntimeError):
            self.inspect("ERROR: /home/runner/config: not found\n")

    def test_short_error_with_auth_failure_is_not_absent(self):
        with self.assertRaises(RuntimeError):
            self.inspect("ERROR: " + self.ref + ": not found\nunauthorized\n")

if __name__ == "__main__":
    unittest.main()
