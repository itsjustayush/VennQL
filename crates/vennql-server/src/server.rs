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
        mut stream: TcpStream,
        peer_addr: SocketAddr,
        client_id: u64,
        router: Arc<VennRouter>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        use tokio::io::{AsyncReadExt, AsyncWriteExt};

        let mut peek_buf = [0u8; 1024];
        let n = stream.peek(&mut peek_buf).await?;
        let peek_str = String::from_utf8_lossy(&peek_buf[..n]);

        if (peek_str.starts_with("GET ") || peek_str.starts_with("HEAD "))
            && !peek_str.to_lowercase().contains("upgrade: websocket")
        {
            let mut drain = vec![0u8; n];
            let _ = stream.read_exact(&mut drain).await;

            let body = include_str!("studio.html");
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                body.len(),
                body
            );
            let _ = stream.write_all(response.as_bytes()).await;
            let _ = stream.flush().await;
            let _ = stream.shutdown().await;
            return Ok(());
        }

        let ws_stream = tokio_tungstenite::accept_async(stream).await?;
        println!("[VennQL] Client #{} connected from {}", client_id, peer_addr);

        let (mut write, mut read) = ws_stream.split();
        let (tx, mut rx) = tokio::sync::mpsc::channel::<Message>(1024);

        // Dedicated writer task consuming outbound frames from the channel
        let writer_handle = tokio::spawn(async move {
            while let Some(msg) = rx.recv().await {
                if let Err(e) = write.send(msg).await {
                    eprintln!("[VennQL] WebSocket send error: {}", e);
                    break;
                }
            }
        });

        // Non-blocking reader loop: spawns asynchronous handler tasks per transaction
        while let Some(msg) = read.next().await {
            let msg = msg?;

            match msg {
                Message::Binary(bytes) => {
                    match Frame::parse(&bytes) {
                        Ok(frame) => {
                            let owned_frame = frame.to_owned();
                            let router = Arc::clone(&router);
                            let tx = tx.clone();

                            // Fast-path for Ping/Pong without spawning extra task
                            if owned_frame.op_code == vennql_core::OpCode::Ping {
                                let pong = Frame::pong(owned_frame.transaction_id);
                                let _ = tx.send(Message::Binary(pong.to_bytes())).await;
                                continue;
                            }

                            // Concurrent dispatch task: does NOT block reader loop!
                            tokio::spawn(async move {
                                match router.dispatch(&owned_frame.as_frame(), client_id).await {
                                    Ok(response_frame) => {
                                        let _ = tx.send(Message::Binary(response_frame.to_bytes())).await;
                                    }
                                    Err(err) => {
                                        let err_frame = OwnedFrame {
                                            op_code: vennql_core::OpCode::Error,
                                            flags: 0,
                                            transaction_id: owned_frame.transaction_id,
                                            procedure_id: owned_frame.procedure_id,
                                            vtable_offset: 0,
                                            payload: err.to_string().into_bytes(),
                                        };
                                        let _ = tx.send(Message::Binary(err_frame.to_bytes())).await;
                                    }
                                }
                            });
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
                            let _ = tx.send(Message::Binary(err_frame.to_bytes())).await;
                        }
                    }
                }
                Message::Ping(payload) => {
                    let _ = tx.send(Message::Pong(payload)).await;
                }
                Message::Close(_) => {
                    println!("[VennQL] Client #{} disconnected", client_id);
                    break;
                }
                _ => {}
            }
        }

        // Drop sender and await writer shutdown
        drop(tx);
        let _ = writer_handle.await;

        Ok(())
    }
}
