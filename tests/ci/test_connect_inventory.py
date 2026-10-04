"""An unclaimed remote instance remains selectable for its school."""
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest

source = Path(__file__).resolve().parents[2] / 'backend/app/connect_inventory.py'
spec = importlib.util.spec_from_file_location('connect_inventory', source)
inventory = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inventory)


class ConnectInventoryTest(unittest.TestCase):
    def test_unclaimed_and_own_instances_visible_other_schools_hidden(self):
        rows = [{'name': name, 'state': 'open'} for name in ('external', 'own', 'other', 'foreign', 'legacy')]
        claimed = [
            SimpleNamespace(name='own', company_id='c', school_id='s', id='1', source='pige360'),
            SimpleNamespace(name='other', company_id='c', school_id='s2', id='2', source='adopted'),
            SimpleNamespace(name='foreign', company_id='c2', school_id='s3', id='3', source='adopted'),
            SimpleNamespace(name='legacy', company_id='c', school_id=None, id='4', source='adopted'),
        ]
        result = inventory.visible_remote_rows(rows, claimed, 'c', 's', {'4'})
        self.assertEqual([row['name'] for row in result], ['external', 'own'])
        self.assertEqual((result[0]['registered'], result[0]['local_id']), (False, ''))
        self.assertEqual((result[1]['registered'], result[1]['local_id']), (True, '1'))


if __name__ == '__main__':
    unittest.main()
