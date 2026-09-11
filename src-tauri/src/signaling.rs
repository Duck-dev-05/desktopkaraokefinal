use futures_util::{SinkExt, StreamExt};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, Mutex};
use tokio_tungstenite::tungstenite::protocol::Message;
use serde::Serialize;

type Tx = mpsc::UnboundedSender<Message>;
type PeerMap = Arc<Mutex<HashMap<SocketAddr, Tx>>>;

#[derive(Clone, Serialize)]
pub struct RoomInfo {
    pub id: String,
    pub host_name: String,
    pub participant_count: usize,
    pub has_password: bool,
    #[serde(skip)]
    pub password: Option<String>,
    #[serde(skip)]
    pub host_addr: SocketAddr,
    #[serde(skip)]
    pub participants: Vec<SocketAddr>,
}

type RoomMap = Arc<Mutex<HashMap<String, RoomInfo>>>;

pub async fn start_signaling_server(port: u16) {
    let addr = format!("0.0.0.0:{}", port);
    let listener = match TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("Failed to bind signaling server to {}: {}", addr, e);
            return;
        }
    };
    println!("Signaling server listening on: {}", addr);

    let state = PeerMap::new(Mutex::new(HashMap::new()));
    let rooms = RoomMap::new(Mutex::new(HashMap::new()));

    while let Ok((stream, addr)) = listener.accept().await {
        tokio::spawn(handle_connection(state.clone(), rooms.clone(), stream, addr));
    }
}

async fn handle_connection(peer_map: PeerMap, room_map: RoomMap, raw_stream: TcpStream, addr: SocketAddr) {
    let ws_stream = match tokio_tungstenite::accept_async(raw_stream).await {
        Ok(ws) => ws,
        Err(e) => {
            eprintln!("Error during the websocket handshake for {}: {}", addr, e);
            return;
        }
    };

    let (tx, mut rx) = mpsc::unbounded_channel();
    peer_map.lock().await.insert(addr, tx);

    let (mut outgoing, mut incoming) = ws_stream.split();

    let receive_from_others = async move {
        while let Some(msg) = rx.recv().await {
            if outgoing.send(msg).await.is_err() {
                break;
            }
        }
    };

    let peer_map_clone = peer_map.clone();
    let room_map_clone = room_map.clone();
    
    let broadcast_to_others = async move {
        while let Some(Ok(msg)) = incoming.next().await {
            if msg.is_text() {
                if let Ok(text) = msg.to_text() {
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(text) {
                        let peers = peer_map_clone.lock().await;
                        let mut rooms = room_map_clone.lock().await;

                        let msg_type = json.get("type").and_then(|v| v.as_str()).unwrap_or("");

                        match msg_type {
                            "create_room" => {
                                if let (Some(id), Some(host_name)) = (
                                    json.get("room_id").and_then(|v| v.as_str()),
                                    json.get("host_name").and_then(|v| v.as_str())
                                ) {
                                    let password = json.get("password").and_then(|v| v.as_str()).map(|s| s.to_string());
                                    let has_password = password.is_some() && !password.as_ref().unwrap().is_empty();
                                    
                                    rooms.insert(id.to_string(), RoomInfo {
                                        id: id.to_string(),
                                        host_name: host_name.to_string(),
                                        participant_count: 1,
                                        has_password,
                                        password,
                                        host_addr: addr,
                                        participants: vec![addr],
                                    });
                                }
                            },
                            "get_rooms" => {
                                let public_rooms: Vec<RoomInfo> = rooms.values().cloned().collect();
                                let response = serde_json::json!({
                                    "type": "rooms_list",
                                    "rooms": public_rooms
                                });
                                if let Some(tx) = peers.get(&addr) {
                                    let _ = tx.send(Message::Text(response.to_string().into()));
                                }
                                continue;
                            },
                            "join_room_req" => {
                                // Guest requests to join (potentially with password)
                                if let (Some(id), Some(pwd)) = (
                                    json.get("room_id").and_then(|v| v.as_str()),
                                    json.get("password").and_then(|v| v.as_str())
                                ) {
                                    if let Some(room) = rooms.get_mut(id) {
                                        let mut authorized = true;
                                        if room.has_password {
                                            if let Some(ref room_pwd) = room.password {
                                                if room_pwd != pwd {
                                                    authorized = false;
                                                }
                                            }
                                        }

                                        let response = serde_json::json!({
                                            "type": "join_auth_result",
                                            "success": authorized,
                                            "room_id": id
                                        });

                                        if let Some(tx) = peers.get(&addr) {
                                            let _ = tx.send(Message::Text(response.to_string().into()));
                                        }

                                        if authorized {
                                            if !room.participants.contains(&addr) {
                                                room.participants.push(addr);
                                                room.participant_count = room.participants.len();
                                            }
                                        }
                                        continue;
                                    }
                                }
                            },
                            "leave_room" => {
                                if let Some(id) = json.get("room_id").and_then(|v| v.as_str()) {
                                    if let Some(room) = rooms.get_mut(id) {
                                        room.participants.retain(|&p| p != addr);
                                        room.participant_count = room.participants.len();
                                    }
                                }
                            },
                            "kick_user" => {
                                // Optional kick logic if we track users by ID
                            },
                            _ => {} // Fallthrough for standard routing
                        }

                        // Standard routing
                        if let Some(_target_addr_str) = json.get("to").and_then(|v| v.as_str()) {
                            // Target is string (peer ID), we don't have socket addr mapping for custom peer IDs 
                            // in this simple signaling. We just broadcast if target is given but not a socket.
                            // The current PartyContext sends "to" as a string ID (e.g. "abc-def-ghi").
                            // We will just broadcast it to everyone for simplicity, or we can map string IDs to SocketAddr.
                            // For simplicity and since we don't want to break existing signaling, we broadcast everything
                            // that is not a signaling command.
                        }

                        let broadcast_recipients = peers
                            .iter()
                            .filter(|(peer_addr, _)| peer_addr != &&addr)
                            .map(|(_, ws_sink)| ws_sink);

                        for recp in broadcast_recipients {
                            let _ = recp.send(msg.clone());
                        }
                    }
                }
            }
        }
    };

    tokio::select! {
        _ = receive_from_others => (),
        _ = broadcast_to_others => (),
    }

    // Cleanup on disconnect
    peer_map.lock().await.remove(&addr);
    
    let mut rooms_lock = room_map.lock().await;
    let mut empty_rooms = vec![];
    for (id, room) in rooms_lock.iter_mut() {
        if room.host_addr == addr {
            empty_rooms.push(id.clone());
        } else {
            room.participants.retain(|&p| p != addr);
            room.participant_count = room.participants.len();
        }
    }
    for id in empty_rooms {
        rooms_lock.remove(&id);
    }
}
