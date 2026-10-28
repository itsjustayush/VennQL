use futures::{SinkExt, StreamExt};
use std::net::SocketAddr;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::tungstenite::Message;
use tracing::{error, info, warn};
use vennql_core::{Frame, OwnedFrame};
use vennql_router::VennRouter;

static CLIENT_ID_COUNTER: AtomicU64 = AtomicU64::new(1);

pub struct VennServer {
    router: Arc<VennRouter>,
}

impl VennServer {
    pub fn new(router: VennRouter) -> Self {
        Self {
            router: Arc::new(router),
        }
    }

    pub async fn listen(&self, addr: &str) -> std::io::Result<()> {
        let listener = TcpListener::bind(addr).await?;
        println!("[VennQL Server] Listening on ws://{}", addr);

        loop {
            match listener.accept().await {
                Ok((stream, peer_addr)) => {
                    let client_id = CLIENT_ID_COUNTER.fetch_add(1, Ordering::Relaxed);
                    let router = Arc::clone(&self.router);

                    tokio::spawn(async move {
                        if let Err(e) = Self::handle_connection(stream, peer_addr, client_id, router).await {
                            eprintln!("[VennQL] Connection closed for client #{}: {}", client_id, e);
                        }
                    });
                }
                Err(e) => {
                    eprintln!("[VennQL] TCP accept error: {}", e);
                }
            }
        }
    }

    async fn handle_connection(
        stream: TcpStream,
        peer_addr: SocketAddr,
        client_id: u64,
        router: Arc<VennRouter>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let ws_stream = tokio_tungstenite::accept_async(stream).await?;
        println!("[VennQL] Client #{} connected from {}", client_id, peer_addr);

        let (mut write, mut read) = ws_stream.split();

        while let Some(msg) = read.next().await {
            let msg = msg?;

            match msg {
                Message::Binary(bytes) => {
                    match Frame::parse(&bytes) {
                        Ok(frame) => {
                            match router.dispatch(&frame, client_id).await {
                                Ok(response_frame) => {
                                    write.send(Message::Binary(response_frame.to_bytes())).await?;
                                }
                                Err(err) => {
                                    let err_frame = OwnedFrame {
                                        op_code: vennql_core::OpCode::Error,
                                        flags: 0,
                                        transaction_id: frame.transaction_id,
                                        procedure_id: frame.procedure_id,
                                        vtable_offset: 0,
                                        payload: err.to_string().into_bytes(),
                                    };
                                    write.send(Message::Binary(err_frame.to_bytes())).await?;
                                }
                            }
                        }
                        Err(parse_err) => {
                            let err_frame = OwnedFrame {
                                op_code: vennql_core::OpCode::Error,
                                flags: 0,
                                transaction_id: 0,
                                procedure_id: 0,
                                vtable_offset: 0,
                                payload: format!("Frame parse error: {}", parse_err).into_bytes(),
                            };
                            write.send(Message::Binary(err_frame.to_bytes())).await?;
                        }
                    }
                }
                Message::Ping(payload) => {
                    write.send(Message::Pong(payload)).await?;
                }
                Message::Close(_) => {
                    println!("[VennQL] Client #{} disconnected", client_id);
                    break;
                }
                _ => {}
            }
        }

        Ok(())
    }
}
