import unittest
from dataclasses import replace
from hashlib import sha256
from app.educacenso_codec import Field, Layout, Row, Issue, build_txt, reconcile

# Massa exclusivamente sintética. Nem tipo, nem formato representam o Inep.
SCOPE = ("ESCOLA-FICTICIA", 2099, "demonstracao", "treinamento")
LAYOUT = Layout(2099, "demonstracao", "a" * 64, "sintetica", "utf-8", "|",
                "\r\n", True, {"EX": (Field("kind", True, "EX"), Field("name", True, None, 16))})
ROW = Row("EX", "interno-1", {"kind": "EX", "name": "Ana"})

def synthetic_rules(scope, layout, rows):
    if len(rows) != 1 or rows[0].kind != rows[0].fields.get("kind"):
        raise ValueError("Regra sintética")

class EducacensoExampleTest(unittest.TestCase):
    def test_bytes_and_hash(self):
        b = build_txt(SCOPE, LAYOUT, (ROW,), synthetic_rules)
        self.assertEqual(b.content, b"EX|Ana\r\n")
        self.assertEqual(b.digest, sha256(b.content).hexdigest())

    def test_blocks_extra_and_delimiter(self):
        for fields in ({"kind":"EX","name":"A|B"}, {"kind":"EX","name":"Ana","cpf":"x"},
                       {"kind":"EX"}, {"kind":"EX","name":"A\nB"}):
            with self.subTest(fields=fields), self.assertRaises(ValueError):
                build_txt(SCOPE, LAYOUT, (replace(ROW, fields=fields),), synthetic_rules)

    def test_rules_are_called(self):
        with self.assertRaisesRegex(ValueError, "Regra sintética"):
            build_txt(SCOPE, LAYOUT, (ROW, ROW), synthetic_rules)

    def test_reconciles_only_unambiguous_lines(self):
        b = build_txt(SCOPE, LAYOUT, (ROW,), synthetic_rules)
        r = reconcile(b, SCOPE, b.digest, (Issue("erro", 1, "name"), Issue("sem linha"),
                                           Issue("fora", 2), Issue("sem campo válido", 1, "x")))
        self.assertEqual([i["source_id"] for i in r], ["interno-1", None, None, None])

    def test_export_blocks_production(self):
        with self.assertRaisesRegex(ValueError, "produção bloqueada"):
            build_txt(SCOPE[:3] + ("producao",), LAYOUT, (ROW,), synthetic_rules)

    def test_rejects_cross_environment(self):
        b = build_txt(SCOPE, LAYOUT, (ROW,), synthetic_rules)
        for scope, digest in ((SCOPE[:3] + ("producao",), b.digest), (SCOPE, "outro")):
            with self.assertRaises(ValueError):
                reconcile(b, scope, digest, ())

if __name__ == "__main__":
    unittest.main()
