import os
import sys
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

# Enable ANSI Virtual Terminal Processing on Windows
def _init_windows_vt():
    if os.name == 'nt':
        try:
            import ctypes
            kernel32 = ctypes.windll.kernel32
            handle = kernel32.GetStdHandle(-11)  # STD_OUTPUT_HANDLE
            mode = ctypes.c_ulong()
            if kernel32.GetConsoleMode(handle, ctypes.byref(mode)):
                # ENABLE_VIRTUAL_TERMINAL_PROCESSING = 0x0004
                kernel32.SetConsoleMode(handle, mode.value | 0x0004)
        except Exception:
            pass

_init_windows_vt()

# Ensure UTF-8 output if possible
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

class Colors:
    """TrueColor 24-bit and 256-color ANSI codes with NO_COLOR respect."""
    ENABLED = not bool(os.getenv("NO_COLOR"))

    # Brand Colors
    CYAN = "\033[38;2;0;210;255m" if ENABLED else ""
    MAGENTA = "\033[38;2;224;36;195m" if ENABLED else ""
    PURPLE = "\033[38;2;168;85;247m" if ENABLED else ""
    GREEN = "\033[38;2;34;197;94m" if ENABLED else ""
    YELLOW = "\033[38;2;245;158;11m" if ENABLED else ""
    BLUE = "\033[38;2;59;130;246m" if ENABLED else ""
    RED = "\033[38;2;239;68;68m" if ENABLED else ""
    GRAY = "\033[38;2;148;163;184m" if ENABLED else ""
    DARK_GRAY = "\033[38;2;71;85;105m" if ENABLED else ""
    WHITE = "\033[38;2;255;255;255m" if ENABLED else ""

    # Text styles
    BOLD = "\033[1m" if ENABLED else ""
    DIM = "\033[2m" if ENABLED else ""
    ITALIC = "\033[3m" if ENABLED else ""
    RESET = "\033[0m" if ENABLED else ""

    # Pill Badges
    BG_CYAN = "\033[48;2;8;70;100m\033[38;2;0;220;255m\033[1m" if ENABLED else ""
    BG_MAGENTA = "\033[48;2;90;15;80m\033[38;2;245;100;220m\033[1m" if ENABLED else ""
    BG_PURPLE = "\033[48;2;60;20;95m\033[38;2;216;180;254m\033[1m" if ENABLED else ""
    BG_GREEN = "\033[48;2;15;65;35m\033[38;2;74;222;128m\033[1m" if ENABLED else ""
    BG_YELLOW = "\033[48;2;85;55;10m\033[38;2;253;224;71m\033[1m" if ENABLED else ""
    BG_RED = "\033[48;2;95;20;20m\033[38;2;248;113;113m\033[1m" if ENABLED else ""
    BG_BLUE = "\033[48;2;20;60;120m\033[38;2;147;197;253m\033[1m" if ENABLED else ""
    BG_GRAY = "\033[48;2;30;41;59m\033[38;2;203;213;225m\033[1m" if ENABLED else ""

def _timestamp() -> str:
    now = datetime.now()
    return f"{Colors.DIM}{now.strftime('%H:%M:%S')}.{int(now.microsecond / 1000):03d}{Colors.RESET}"

def _print(*args, **kwargs):
    if "flush" not in kwargs:
        kwargs["flush"] = True
    print(*args, **kwargs)

def _format_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.2f} MB"

def _format_time(ms: float) -> str:
    if ms < 0.001:
        return f"{ms * 1_000_000:.0f} ns"
    elif ms < 1.0:
        return f"{ms * 1_000:.1f} \u03bcs"
    elif ms < 1000.0:
        return f"{ms:.3f} ms"
    else:
        return f"{ms / 1000.0:.2f} s"

class VennLogger:
    """Colourful, high-visibility, zero-dependency logging for VennQL."""

    @staticmethod
    def banner(title: str, host: str, port: int, procedures: Dict[int, Any], name_to_id: Dict[str, int]):
        c = Colors
        border = f"{c.DARK_GRAY}│{c.RESET}"
        w = 66

        _print()
        _print(f"  {c.CYAN}╭" + "─" * w + f"╮{c.RESET}")
        header_text = f"  {c.CYAN}{c.BOLD}⚡  V E N N Q L   P Y T H O N   E N G I N E{c.RESET}"
        _print(f"  {border}{header_text:<75}{border}")
        sub_text = f"  {c.GRAY}High-Throughput Binary API Framework • Direct Memory Slicing{c.RESET}"
        _print(f"  {border}{sub_text:<73}{border}")
        _print(f"  {c.DARK_GRAY}├" + "─" * w + f"┤{c.RESET}")

        line1 = f"  {c.WHITE}• App Name    :{c.RESET} {c.BOLD}{title}{c.RESET}"
        _print(f"  {border}{line1:<75}{border}")
        line2 = f"  {c.WHITE}• Protocol    :{c.RESET} {c.GREEN}v1.0 (Fixed 16-Byte Header & VTable Projection){c.RESET}"
        _print(f"  {border}{line2:<75}{border}")
        line3 = f"  {c.WHITE}• WebSocket   :{c.RESET} {c.CYAN}{c.BOLD}ws://{host}:{port}{c.RESET}"
        _print(f"  {border}{line3:<75}{border}")
        line4 = f"  {c.WHITE}• Venn Studio :{c.RESET} {c.MAGENTA}{c.BOLD}http://{host}:{port}/studio{c.RESET} {c.DIM}(or http://{host}:{port}/){c.RESET}"
        _print(f"  {border}{line4:<84}{border}")

        # Procedures summary
        proc_names = [f"#{pid} ({name})" for name, pid in sorted(name_to_id.items(), key=lambda x: x[1])]
        procs_str = ", ".join(proc_names[:3])
        if len(proc_names) > 3:
            procs_str += f" + {len(proc_names) - 3} more"
        line5 = f"  {c.WHITE}• Procedures  :{c.RESET} {c.YELLOW}{len(procedures)} active{c.RESET} {c.DIM}[{procs_str}]{c.RESET}"
        _print(f"  {border}{line5:<84}{border}")

        _print(f"  {c.CYAN}╰" + "─" * w + f"╯{c.RESET}")
        _print(f"  {c.DIM}Ready for binary connections. Press Ctrl+C to stop.{c.RESET}\n")

    @staticmethod
    def connection(client_addr: str, connected: bool = True):
        c = Colors
        ts = _timestamp()
        if connected:
            badge = f"{c.BG_GREEN} CONNECT {c.RESET}"
            msg = f"{c.WHITE}Client connected from {c.CYAN}{client_addr}{c.RESET}"
        else:
            badge = f"{c.BG_GRAY} DISCONN {c.RESET}"
            msg = f"{c.GRAY}Client disconnected ({client_addr}){c.RESET}"
        _print(f"{ts}  {badge}  {msg}")

    @staticmethod
    def query(proc_id: int, proc_name: str, tx_id: int, in_bytes: int, out_bytes: int, duration_ms: float, projection: Optional[List[str]] = None):
        c = Colors
        ts = _timestamp()
        badge = f"{c.BG_CYAN} QUERY  {c.RESET}"
        target = f"{c.CYAN}{c.BOLD}#{proc_id} {proc_name:<14}{c.RESET}"
        tx_badge = f"{c.DARK_GRAY}Tx #{tx_id:<2}{c.RESET}"
        io_badge = f"{c.GRAY}{_format_size(in_bytes)} \u2192 {c.WHITE}{_format_size(out_bytes)}{c.RESET}"
        time_badge = f"{c.GREEN}{c.BOLD}{_format_time(duration_ms):>8}{c.RESET}"
        status_badge = f"{c.GREEN}200 OK{c.RESET}"

        _print(f"{ts}  {badge}  {target} {c.DARK_GRAY}│{c.RESET} {tx_badge} {c.DARK_GRAY}│{c.RESET} {io_badge} {c.DARK_GRAY}│{c.RESET} {time_badge} {c.DARK_GRAY}│{c.RESET} {status_badge}")
        if projection:
            proj_str = f"['" + "', '".join(projection) + "']"
            _print(f"               {c.DARK_GRAY}↳{c.RESET} {c.MAGENTA}Projection:{c.RESET} {c.YELLOW}{proj_str}{c.RESET} {c.DIM}(zero over-fetching){c.RESET}")

    @staticmethod
    def mutation(proc_id: int, proc_name: str, tx_id: int, in_bytes: int, out_bytes: int, duration_ms: float, payload_summary: Optional[str] = None):
        c = Colors
        ts = _timestamp()
        badge = f"{c.BG_MAGENTA} MUTATE {c.RESET}"
        target = f"{c.MAGENTA}{c.BOLD}#{proc_id} {proc_name:<14}{c.RESET}"
        tx_badge = f"{c.DARK_GRAY}Tx #{tx_id:<2}{c.RESET}"
        io_badge = f"{c.GRAY}{_format_size(in_bytes)} \u2192 {c.WHITE}{_format_size(out_bytes)}{c.RESET}"
        time_badge = f"{c.YELLOW}{c.BOLD}{_format_time(duration_ms):>8}{c.RESET}"
        status_badge = f"{c.GREEN}200 OK{c.RESET}"

        _print(f"{ts}  {badge}  {target} {c.DARK_GRAY}│{c.RESET} {tx_badge} {c.DARK_GRAY}│{c.RESET} {io_badge} {c.DARK_GRAY}│{c.RESET} {time_badge} {c.DARK_GRAY}│{c.RESET} {status_badge}")
        if payload_summary:
            _print(f"               {c.DARK_GRAY}↳{c.RESET} {c.PURPLE}Input:{c.RESET} {c.GRAY}{payload_summary}{c.RESET}")

    @staticmethod
    def ping(tx_id: int, duration_ms: float):
        c = Colors
        ts = _timestamp()
        badge = f"{c.BG_PURPLE}  PING  {c.RESET}"
        target = f"{c.PURPLE}Fast-Path Heartbeat{c.RESET}"
        tx_badge = f"{c.DARK_GRAY}Tx #{tx_id:<2}{c.RESET}"
        time_badge = f"{c.GREEN}{c.BOLD}{_format_time(duration_ms):>8}{c.RESET}"
        status_badge = f"{c.GREEN}PONG{c.RESET}"

        _print(f"{ts}  {badge}  {target:<20} {c.DARK_GRAY}│{c.RESET} {tx_badge} {c.DARK_GRAY}│{c.RESET} {c.GRAY}0 B \u2192 0 B{c.RESET}   {c.DARK_GRAY}│{c.RESET} {time_badge} {c.DARK_GRAY}│{c.RESET} {status_badge}")

    @staticmethod
    def http_request(method: str, path: str, status_code: int, size_bytes: int, label: str = ""):
        c = Colors
        ts = _timestamp()
        badge = f"{c.BG_BLUE}  HTTP  {c.RESET}"
        method_str = f"{c.WHITE}{c.BOLD}{method:<4}{c.RESET} {c.CYAN}{path:<15}{c.RESET}"
        status_str = f"{c.GREEN}{status_code} OK{c.RESET}" if status_code == 200 else f"{c.RED}{status_code}{c.RESET}"
        size_str = f"{c.GRAY}{_format_size(size_bytes)}{c.RESET}"
        desc = f" {c.DIM}({label}){c.RESET}" if label else ""

        _print(f"{ts}  {badge}  {method_str} {c.DARK_GRAY}│{c.RESET} {status_str} {c.DARK_GRAY}│{c.RESET} {size_str}{desc}")

    @staticmethod
    def error(proc_id: int, tx_id: int, message: str, proc_name: str = ""):
        c = Colors
        ts = _timestamp()
        badge = f"{c.BG_RED} ERROR  {c.RESET}"
        target = f"{c.RED}{c.BOLD}#{proc_id} {proc_name or 'unknown'}{c.RESET}"
        tx_badge = f"{c.DARK_GRAY}Tx #{tx_id}{c.RESET}"
        _print(f"{ts}  {badge}  {target} {c.DARK_GRAY}│{c.RESET} {tx_badge} {c.DARK_GRAY}│{c.RESET} {c.RED}{message}{c.RESET}")

    @staticmethod
    def shutdown():
        c = Colors
        _print(f"\n  {c.YELLOW}⚡ {c.BOLD}[VennQL]{c.RESET} {c.GRAY}Server stopped gracefully. Cleaned up resources.{c.RESET}\n")
