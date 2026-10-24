"""Offline workflow contracts; no registry writes or GitHub reruns are performed."""
import os
from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[2]


class ReleaseArtifactTests(unittest.TestCase):
    def setUp(self):
        self.bases = (ROOT / '.github/workflows/container-bases.yml').read_text()
        self.release = (ROOT / '.github/workflows/release.yml').read_text()
        self.consumer = self.release.split('\n  release:\n', 1)[1]

    def test_producer_passes_upload_id_through_job_and_workflow_outputs(self):
        self.assertIn("artifact_id: {value: '${{ jobs.publish.outputs.artifact_id }}'}", self.bases)
        self.assertIn('artifact_id: ${{ steps.evidence.outputs.artifact-id }}', self.bases)
        self.assertIn('uses: actions/upload-artifact@v4\n        id: evidence', self.bases)
        self.assertIn('if-no-files-found: error', self.bases)
        self.assertNotIn('overwrite: true', self.bases)
        self.assertIn('name: base-images-${{ github.run_id }}-${{ github.run_attempt }}', self.bases)
        self.assertIn('path: ci-evidence/base-images.lock.json', self.bases)

    def test_consumer_uses_exact_producer_id_in_same_run(self):
        self.assertIn('needs: [version, candidate, bases]', self.consumer)
        download = self.consumer.split('uses: actions/download-artifact@v4\n', 1)[1].split('      - name:', 1)[0]
        self.assertIn('artifact-ids: ${{ needs.bases.outputs.artifact_id }}', download)
        self.assertIn('merge-multiple: true', download)
        self.assertIn('path: ci-evidence', download)
        for forbidden in ('github.run_attempt', 'name:', 'pattern:', 'run-id:', 'repository:', 'github-token:'):
            self.assertNotIn(forbidden, download)
        # Both tests/builds and the lock producer remain tied to the verified SHA.
        producer = self.release.split('\n  bases:\n', 1)[1].split('\n  tests:\n', 1)[0]
        self.assertIn('ref: ${{ needs.version.outputs.sha }}', producer)
        self.assertIn('ref: ${{ needs.version.outputs.sha }}', self.consumer)

    def guard(self, artifact_id):
        block = self.consumer.split('          BASE_ARTIFACT_ID:', 1)[1].split('        run: |\n', 1)[1].split('      - name:', 1)[0]
        script = '\n'.join(line[10:] for line in block.splitlines())
        return subprocess.run(['bash', '-eu', '-c', script], env={**os.environ, 'BASE_ARTIFACT_ID': artifact_id}, capture_output=True, text=True)

    def test_missing_or_malformed_id_fails_before_download_and_promotion(self):
        self.assertLess(self.consumer.index('BASE_ARTIFACT_ID:'), self.consumer.index('uses: actions/download-artifact'))
        self.assertLess(self.consumer.index('uses: actions/download-artifact'), self.consumer.index('finalize-release.sh'))
        for value in ('', '0', '-1', '123,456', 'latest', '12\n34', '$(echo 123)'):
            with self.subTest(value=value):
                self.assertNotEqual(self.guard(value).returncode, 0)

    def test_partial_and_full_rerun_contract(self):
        # Evaluate the actual consumer expression with retained producer outputs.
        # This models the handoff, not GitHub's remote scheduler or artifact API.
        expression = re.search(r'artifact-ids: \$\{\{ (.*?) \}\}', self.consumer).group(1)
        for producer_attempt, consumer_attempt, produced_id in ((1, 1, '101'), (1, 2, '101'), (1, 3, '101'), (2, 2, '202'), (2, 3, '202')):
            with self.subTest(producer=producer_attempt, consumer=consumer_attempt):
                context = {'needs.bases.outputs.artifact_id': produced_id,
                           'github.run_attempt': str(consumer_attempt)}
                selected = context[expression]
                self.assertEqual(selected, produced_id)
                self.assertEqual(self.guard(selected).returncode, 0)


if __name__ == '__main__':
    unittest.main()
