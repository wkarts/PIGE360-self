#!/usr/bin/env python3
"""Windows GUI for the PIGE360 stack manager running on a Linux Docker host.

Uses the system OpenSSH client and an SSH tunnel. No stack credentials or SSH
private keys are copied to the application or stored by this program.
"""

import os
from pathlib import PurePosixPath
import re
import shlex
import shutil
import subprocess
import sys
import threading
import webbrowser


SERVER = re.compile(r'[a-zA-Z_][a-zA-Z0-9._-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\Z')
PASSWORD = re.compile(r'Senha temporária:\s*(\S+)')


def ssh_command(server: str, checkout: str, port: int = 58100) -> list[str]:
    """Construct a key-only tunnel and a quoted command on the Docker host."""
    if not SERVER.fullmatch(server):
        raise ValueError('Informe usuario@servidor (nome DNS ou IPv4).')
    path = PurePosixPath(checkout)
    if not path.is_absolute() or '..' in path.parts or not checkout.strip():
        raise ValueError('Informe o caminho absoluto do checkout no servidor Linux.')
    if not 1024 <= port <= 65535:
        raise ValueError('A porta local deve estar entre 1024 e 65535.')
    quoted = shlex.quote(str(path))
    remote = (f'cd {quoted} && '
              f'if test -x ./pige360-deployer-linux-amd64; then '
              f'exec ./pige360-deployer-linux-amd64 --root . --port 58100; '
              f'else exec python3 scripts/deployer.py --root . --port 58100; fi')
    return ['ssh', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes',
            '-o', 'ExitOnForwardFailure=yes', '-o', 'ServerAliveInterval=20',
            '-L', f'127.0.0.1:{port}:127.0.0.1:58100', '-T', server, remote]


def main():
    import tkinter as tk
    from tkinter import messagebox, ttk

    root = tk.Tk()
    root.title('PIGE360 · Deployer de stacks')
    root.minsize(540, 350)
    root.geometry('690x410')
    root.configure(bg='#f4f7fa')
    pane = ttk.Frame(root, padding=24)
    pane.pack(fill='both', expand=True)
    ttk.Label(pane, text='PIGE360 · Stacks', font=('Segoe UI', 19, 'bold')).pack(anchor='w')
    ttk.Label(pane, text='Acesse o servidor Docker por SSH para criar e atualizar stacks.').pack(anchor='w', pady=(5, 18))

    server = tk.StringVar()
    checkout = tk.StringVar(value='/srv/pige360-self')
    local_port = tk.StringVar(value='58100')
    password = tk.StringVar()
    status = tk.StringVar(value='Desconectado')
    process = None
    generation = 0

    for label, variable in (('Servidor SSH (usuario@servidor)', server),
                            ('Checkout PIGE360 no servidor', checkout),
                            ('Porta local do painel', local_port)):
        ttk.Label(pane, text=label).pack(anchor='w', pady=(4, 2))
        ttk.Entry(pane, textvariable=variable).pack(fill='x')

    ttk.Label(pane, textvariable=status, wraplength=620).pack(anchor='w', pady=(16, 8))
    ttk.Label(pane, text='Senha temporária do painel').pack(anchor='w')
    secret_entry = ttk.Entry(pane, textvariable=password, state='readonly')
    secret_entry.pack(fill='x')
    ttk.Label(pane, text='Use sua chave SSH já cadastrada; o servidor precisa de Python 3 e Docker Compose.',
              wraplength=620).pack(anchor='w', pady=(10, 0))

    controls = ttk.Frame(pane)
    controls.pack(fill='x', pady=(14, 0))

    def stop():
        nonlocal process, generation
        generation += 1
        previous, process = process, None
        if previous and previous.poll() is None:
            previous.terminate()
        password.set('')
        status.set('Desconectado')
        connect_button.config(state='normal')
        open_button.config(state='disabled')

    def close():
        stop()
        root.destroy()

    def open_panel():
        webbrowser.open(f'http://127.0.0.1:{local_port.get()}/')

    def start():
        nonlocal process, generation
        try:
            command = ssh_command(server.get().strip(), checkout.get().strip(), int(local_port.get()))
            if not shutil.which('ssh'):
                raise ValueError('OpenSSH não encontrado. Instale o cliente OpenSSH do Windows.')
            flags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            process = subprocess.Popen(command, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                                       stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace',
                                       bufsize=1, creationflags=flags)
        except (ValueError, OSError) as error:
            messagebox.showerror('Não foi possível conectar', str(error))
            return
        generation += 1
        current = generation
        password.set('')
        status.set('Conectando por SSH…')
        connect_button.config(state='disabled')
        open_button.config(state='disabled')

        child = process

        def watch():
            lines = []
            assert child.stdout is not None
            for line in child.stdout:
                match = PASSWORD.search(line)
                if match:
                    secret = match.group(1)

                    def ready():
                        if current != generation:
                            return
                        password.set(secret)
                        status.set('Painel pronto no túnel SSH. Copie a senha e abra o painel.')
                        open_button.config(state='normal')

                    root.after(0, ready)
                else:
                    lines.append(line.strip())
                    lines = lines[-5:]
            exit_code = child.wait()

            def exited():
                if current != generation:
                    return
                password.set('')
                open_button.config(state='disabled')
                connect_button.config(state='normal')
                status.set('Conexão encerrada: ' + ('; '.join(lines[-3:]) or f'código {exit_code}'))

            try:
                root.after(0, exited)
            except RuntimeError:
                pass

        threading.Thread(target=watch, daemon=True).start()

    connect_button = ttk.Button(controls, text='Conectar', command=start)
    connect_button.pack(side='left')
    open_button = ttk.Button(controls, text='Abrir painel', command=open_panel, state='disabled')
    open_button.pack(side='left', padx=10)
    ttk.Button(controls, text='Desconectar', command=stop).pack(side='left')
    root.protocol('WM_DELETE_WINDOW', close)
    root.mainloop()


if __name__ == '__main__':
    if '--self-test' in sys.argv:
        import tkinter
        assert tkinter.Tcl().eval('info patchlevel')
        assert ssh_command('admin@host.example', '/srv/pige360-self')[0] == 'ssh'
        raise SystemExit(0)
    main()
