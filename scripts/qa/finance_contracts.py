"""Confere a árvore de um commit local do Finance. Somente leitura, sem credenciais."""
import argparse
import json
import re
import subprocess
from pathlib import Path

OFFICIAL = "wkarts/ARGWS-CRM-Finance"
LOCAL_FIXTURE = Path(__file__).resolve().parents[2] / "docs/contracts/pige-crm-v1.json"
ROUTES = "modules/pige_bridge/config/routes.php"
FIXTURE = "tests/fixtures/pige-crm-v1.json"
PATHS = {
    "recepcao_v1": ("v1/requests",),
    "diagnostico_v1": ("v1/diagnostics",),
    "fatura_v2": ("v2/invoices", "v2/invoices/status"),
    "cobranca_v3": ("v3/charges", "v3/charges/status", "v3/charges/sync",
                    "v3/charges/instruments", "v3/charges/reconcile"),
}


def inspect(repository: Path, revision: str) -> dict:
    def git(*args):
        return subprocess.check_output(["git", "-C", str(repository), *args], text=True)

    origin = git("remote", "get-url", "origin").strip().removesuffix(".git")
    if origin not in (f"https://github.com/{OFFICIAL}", f"git@github.com:{OFFICIAL}",
                      f"ssh://git@github.com/{OFFICIAL}"):
        raise ValueError("O checkout deve ter origem no ARGWS-CRM-Finance oficial.")
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise ValueError("Informe o SHA completo do commit a conferir.")
    tree = set(git("ls-tree", "-r", "--name-only", revision).splitlines())
    routes = git("show", f"{revision}:{ROUTES}") if ROUTES in tree else ""
    paths = set(re.findall(r"""^\s*\$route\[['"]pige_bridge/api/([^'"]+)['"]\]\s*=""", routes, re.M))
    fixture_matches = FIXTURE in tree and json.loads(git("show", f"{revision}:{FIXTURE}")) == json.loads(LOCAL_FIXTURE.read_text())
    return {
        "repository": OFFICIAL, "commit": revision, "fixture_v1_igual": fixture_matches,
        "rotas_pendentes_de_comprovacao": {
            name: [path for path in expected if path not in paths] for name, expected in PATHS.items()
        },
        "homologado_em_sandbox": False,
        "bloqueios": ["Conferir implementações e recibos na versão instalada.",
                      "Homologar carteira, estorno, duplicatas e reconciliação em sandbox."],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("checkout", type=Path)
    parser.add_argument("commit")
    args = parser.parse_args()
    print(json.dumps(inspect(args.checkout, args.commit), ensure_ascii=False, indent=2))
