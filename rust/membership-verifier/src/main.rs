use axum::{
    extract::{Path, State},
    http::{header, HeaderValue, Method, StatusCode},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use reqwest::Client;
use serde::Serialize;
use serde_json::Value;
use std::{env, net::SocketAddr};
use tower_http::{
    cors::CorsLayer,
    trace::TraceLayer,
};

#[derive(Clone)]
struct AppState {
    client: Client,
    supabase_url: String,
    supabase_anon_key: String,
}

#[derive(Serialize)]
struct ApiError {
    error: String,
}

fn error_response(
    status: StatusCode,
    message: &str,
) -> (StatusCode, Json<ApiError>) {
    (
        status,
        Json(ApiError {
            error: message.to_string(),
        }),
    )
}

async fn health() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "ok",
        "service": "membership-verifier"
    }))
}

async fn verify_card(
    State(state): State<AppState>,
    Path(token): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<ApiError>)> {
    // Accept only a 64-character hexadecimal verification token.
    let valid_token = token.len() == 64
        && token
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit());

    if !valid_token {
        return Err(error_response(
            StatusCode::BAD_REQUEST,
            "Invalid verification token",
        ));
    }

    let rpc_url = format!(
        "{}/rest/v1/rpc/verify_membership_card",
        state.supabase_url.trim_end_matches('/')
    );

    let response = state
        .client
        .post(&rpc_url)
        .header("apikey", &state.supabase_anon_key)
        .bearer_auth(&state.supabase_anon_key)
        .header(header::CONTENT_TYPE, "application/json")
        .json(&serde_json::json!({
            "p_token": token
        }))
        .send()
        .await
        .map_err(|_| {
            error_response(
                StatusCode::BAD_GATEWAY,
                "Verification service is temporarily unavailable",
            )
        })?;

    if !response.status().is_success() {
        return Err(error_response(
            StatusCode::BAD_GATEWAY,
            "Could not complete membership verification",
        ));
    }

    let result = response
        .json::<Value>()
        .await
        .map_err(|_| {
            error_response(
                StatusCode::BAD_GATEWAY,
                "Invalid response from verification service",
            )
        })?;

    Ok(Json(result))
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            env::var("RUST_LOG")
                .unwrap_or_else(|_| "membership_verifier=info,tower_http=info".to_string()),
        )
        .init();

    let supabase_url = env::var("SUPABASE_URL")
        .expect("SUPABASE_URL must be configured");

    let supabase_anon_key = env::var("SUPABASE_ANON_KEY")
        .expect("SUPABASE_ANON_KEY must be configured");

    let frontend_origin = env::var("FRONTEND_ORIGIN")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());

    let host = env::var("HOST")
        .unwrap_or_else(|_| "0.0.0.0".to_string());

    let port = env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>()
        .expect("PORT must be a valid port number");

    let origin = frontend_origin
        .parse::<HeaderValue>()
        .expect("FRONTEND_ORIGIN must be a valid URL origin");

    let state = AppState {
        client: Client::new(),
        supabase_url,
        supabase_anon_key,
    };

    let cors = CorsLayer::new()
        .allow_origin(origin)
        .allow_methods([Method::GET, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE]);

    let app = Router::new()
        .route("/health", get(health))
        .route("/api/verify/:token", get(verify_card))
        .with_state(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    let address = format!("{}:{}", host, port);

    let listener = tokio::net::TcpListener::bind(&address)
        .await
        .expect("Could not bind server address");

    tracing::info!("Membership verification service started");

    axum::serve(listener, app)
        .await
        .expect("Server failed");
}