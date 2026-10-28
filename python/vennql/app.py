import asyncio
import inspect
import json
import os
from typing import Any, Callable, Dict, Optional, Union
import websockets
from websockets.asyncio.server import serve
from .frame import Frame
from .opcode import OpCode, Flags

class VennApp:
    """FastAPI/Strawberry-inspired Python API Framework for VennQL.

    Allows developers to define queries, mutations, and streams
    using clean Python decorators while serving VennQL binary framing
    and the interactive Venn Studio web playground.
    """

    def __init__(self, title: str = "VennQL Application", description: str = ""):
        self.title = title
        self.description = description
        self.procedures: Dict[int, Callable] = {}
        self.name_to_id: Dict[str, int] = {}
        self._next_auto_id = 100

        # Register default health check if not overridden
        self.query("health", procedure_id=1)(lambda: {"status": "healthy", "title": self.title, "engine": "VennQL-Python"})

    def query(self, name_or_id: Union[str, int], procedure_id: Optional[int] = None):
        """Decorator to register a Query procedure."""
        return self._register_decorator(name_or_id, procedure_id, OpCode.QUERY)

    def mutate(self, name_or_id: Union[str, int], procedure_id: Optional[int] = None):
        """Decorator to register a Mutation procedure."""
        return self._register_decorator(name_or_id, procedure_id, OpCode.MUTATE)

    def _register_decorator(self, name_or_id: Union[str, int], procedure_id: Optional[int], default_op: OpCode):
        if isinstance(name_or_id, int):
            proc_id = name_or_id
            proc_name = f"proc_{proc_id}"
        else:
            proc_name = name_or_id
            if procedure_id is not None:
                proc_id = procedure_id
            else:
                proc_id = self._next_auto_id
                self._next_auto_id += 1

        self.name_to_id[proc_name] = proc_id

        def decorator(func: Callable):
            self.procedures[proc_id] = func
            return func
        return decorator

    async def _handle_connection(self, websocket):
        async for message in websocket:
            if not isinstance(message, (bytes, bytearray, memoryview)):
                continue

            try:
                frame = Frame.parse(message)
            except Exception as e:
                err_frame = Frame(
                    op_code=OpCode.ERROR,
                    flags=Flags.NONE,
                    transaction_id=0,
                    procedure_id=0,
                    vtable_offset=0,
                    payload=f"Frame parse error: {e}".encode('utf-8')
                )
                await websocket.send(err_frame.encode())
                continue

            # Fast-path Ping
            if frame.op_code == OpCode.PING:
                pong = Frame(
                    op_code=OpCode.PONG,
                    flags=Flags.NONE,
                    transaction_id=frame.transaction_id,
                    procedure_id=0,
                    vtable_offset=0,
                    payload=b''
                )
                await websocket.send(pong.encode())
                continue

            handler = self.procedures.get(frame.procedure_id)
            if not handler:
                err_frame = Frame(
                    op_code=OpCode.ERROR,
                    flags=Flags.NONE,
                    transaction_id=frame.transaction_id,
                    procedure_id=frame.procedure_id,
                    vtable_offset=0,
                    payload=f"Procedure #{frame.procedure_id} not registered".encode('utf-8')
                )
                await websocket.send(err_frame.encode())
                continue

            # Invoke handler
            try:
                raw_payload = bytes(frame.payload)
                payload_obj = None
                if raw_payload:
                    try:
                        payload_obj = json.loads(raw_payload.decode('utf-8'))
                    except Exception:
                        payload_obj = raw_payload.decode('utf-8', errors='replace')

                sig = inspect.signature(handler)
                params = sig.parameters

                if len(params) == 0:
                    result = handler()
                elif isinstance(payload_obj, dict):
                    kwargs = {k: v for k, v in payload_obj.items() if k in params}
                    if kwargs:
                        result = handler(**kwargs)
                    elif len(params) == 1:
                        result = handler(payload_obj)
                    else:
                        result = handler()
                elif len(params) == 1:
                    result = handler(payload_obj)
                else:
                    result = handler()

                if inspect.isawaitable(result):
                    result = await result

                # Serialize response
                if isinstance(result, bytes):
                    resp_bytes = result
                elif isinstance(result, str):
                    resp_bytes = result.encode('utf-8')
                else:
                    resp_bytes = json.dumps(result).encode('utf-8')

                resp_frame = Frame(
                    op_code=OpCode.ACK,
                    flags=Flags.CACHEABLE if frame.flags & Flags.CACHEABLE else Flags.NONE,
                    transaction_id=frame.transaction_id,
                    procedure_id=frame.procedure_id,
                    vtable_offset=0,
                    payload=resp_bytes
                )
                await websocket.send(resp_frame.encode())

            except Exception as e:
                err_frame = Frame(
                    op_code=OpCode.ERROR,
                    flags=Flags.NONE,
                    transaction_id=frame.transaction_id,
                    procedure_id=frame.procedure_id,
                    vtable_offset=0,
                    payload=f"Handler execution error: {e}".encode('utf-8')
                )
                await websocket.send(err_frame.encode())

    async def _process_request(self, connection, request):
        """Intercept HTTP requests to serve Venn Studio in browsers."""
        if request.headers.get("Upgrade", "").lower() == "websocket":
            return None

        path = request.path
        if path == "/" or path == "/studio":
            studio_path = os.path.abspath(
                os.path.join(os.path.dirname(__file__), "..", "..", "crates", "vennql-server", "src", "studio.html")
            )
            if os.path.exists(studio_path):
                with open(studio_path, "r", encoding="utf-8") as f:
                    html_content = f.read()
                response = connection.respond(200, html_content)
                response.headers["Content-Type"] = "text/html; charset=utf-8"
                return response
        return None

    def run(self, host: str = "127.0.0.1", port: int = 8080):
        """Run the VennQL Python server."""
        print(f"\n  [VennQL] Python Engine ({self.title})")
        print(f"  * Binary Protocol: v1.0 | Mode: Zero-Copy")
        print(f"  * Venn Studio: http://{host}:{port}/")
        print(f"  * Listening on ws://{host}:{port}\n")

        async def main():
            async with serve(
                self._handle_connection,
                host,
                port,
                process_request=self._process_request
            ):
                await asyncio.Future()

        try:
            asyncio.run(main())
        except KeyboardInterrupt:
            print("\\n[VennQL] Server stopped gracefully.")
