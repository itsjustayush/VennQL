import json
import time
from typing import Any, Dict, List, Optional, Union
from websockets.sync.client import connect as sync_connect
from .frame import Frame, VennError
from .opcode import OpCode, Flags

class Client:
    """Synchronous VennQL Client.

    Provides a clean, requests-like developer interface over
    high-speed binary VennQL framing.
    """

    DEFAULT_PROCEDURES = {
        'health': 1,
        'echo': 2,
        'sum': 3,
        'books': 4,
        'getUser': 10,
    }

    def __init__(self, url: str = "ws://127.0.0.1:8080", timeout: float = 10.0, procedures: Optional[Dict[str, int]] = None):
        self.url = url
        self.timeout = timeout
        self.procedure_map: Dict[str, int] = dict(self.DEFAULT_PROCEDURES)
        if procedures:
            self.procedure_map.update(procedures)

        self._tx_counter = 1
        self._ws = sync_connect(self.url, open_timeout=self.timeout)

    def register_procedure(self, name: str, procedure_id: int) -> 'Client':
        self.procedure_map[name] = procedure_id
        return self

    def _resolve_id(self, target: Union[int, str]) -> int:
        if isinstance(target, int):
            return target
        if target in self.procedure_map:
            return self.procedure_map[target]
        raise ValueError(f"Unknown VennQL procedure name: '{target}'. Register it with client.register_procedure('{target}', id)")

    def _next_tx_id(self) -> int:
        tx = self._tx_counter
        self._tx_counter = (self._tx_counter + 1) & 0x7FFFFFFF
        if self._tx_counter == 0:
            self._tx_counter = 1
        return tx

    def call(self, op_code: OpCode, target: Union[int, str], payload: Union[bytes, str, dict, list, None] = None) -> bytes:
        proc_id = self._resolve_id(target)
        tx_id = self._next_tx_id()

        if payload is None:
            payload_bytes = b''
        elif isinstance(payload, bytes):
            payload_bytes = payload
        elif isinstance(payload, str):
            payload_bytes = payload.encode('utf-8')
        else:
            payload_bytes = json.dumps(payload).encode('utf-8')

        flags = Flags.CACHEABLE if op_code == OpCode.QUERY else Flags.NONE
        frame = Frame(
            op_code=op_code,
            flags=flags,
            transaction_id=tx_id,
            procedure_id=proc_id,
            vtable_offset=0,
            payload=payload_bytes
        )

        self._ws.send(frame.encode())
        raw_response = self._ws.recv()

        resp_frame = Frame.parse(raw_response)
        if resp_frame.op_code == OpCode.ERROR:
            err_msg = bytes(resp_frame.payload).decode('utf-8', errors='replace')
            raise VennError(f"VennQL Error (Procedure #{proc_id}): {err_msg}")

        return bytes(resp_frame.payload)

    def query(self, target: Union[int, str], payload: Union[dict, list, str, None] = None, select: Optional[List[str]] = None) -> Any:
        """Execute a Query operation with optional GraphQL-style field projection."""
        if select is not None:
            if payload is None:
                payload = {}
            if isinstance(payload, dict):
                payload["select"] = select
            elif isinstance(payload, str):
                payload = {"arg": payload, "select": select}

        raw = self.call(OpCode.QUERY, target, payload)
        if not raw:
            return None
        try:
            return json.loads(raw.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return raw.decode('utf-8', errors='replace')

    def mutate(self, target: Union[int, str], payload: Union[dict, list, str, None] = None, **kwargs) -> Any:
        """Execute a Mutation operation (create, update, delete)."""
        if kwargs:
            if isinstance(payload, dict):
                payload.update(kwargs)
            elif payload is None:
                payload = kwargs

        raw = self.call(OpCode.MUTATE, target, payload)
        if not raw:
            return None
        try:
            return json.loads(raw.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return raw.decode('utf-8', errors='replace')

    def ping(self) -> float:
        """Measure raw round-trip latency in milliseconds."""
        start = time.perf_counter()
        self.call(OpCode.PING, 0, b'')
        return (time.perf_counter() - start) * 1000.0

    def close(self):
        try:
            self._ws.close()
        except Exception:
            pass

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
