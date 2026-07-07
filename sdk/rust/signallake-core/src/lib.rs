use std::collections::VecDeque;

pub const EVENT_SCHEMA_VERSION: &str = "signallake.event-envelope.v1";
pub const BATCH_SCHEMA_VERSION: &str = "signallake.event-batch.v1";
pub const ENCRYPTED_BATCH_SCHEMA_VERSION: &str = "signallake.encrypted-event-batch.v1";
pub const BATCH_CONTENT_TYPE: &str = "application/vnd.signallake.event-batch+json;v=1";
pub const ENCRYPTION_ALG_AES_256_GCM: &str = "AES-256-GCM";

#[derive(Clone, Debug, PartialEq)]
pub struct Source {
    pub app_id: String,
    pub product: String,
    pub sdk_name: String,
    pub sdk_version: String,
    pub platform: String,
    pub app_version: Option<String>,
    pub environment: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct Identity {
    pub anonymous_id: String,
    pub device_id: String,
    pub user_id: Option<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct Session {
    pub session_id: String,
    pub started_at: String,
    pub sequence: u64,
}

#[derive(Clone, Debug, PartialEq)]
pub enum PropertyValue {
    String(String),
    Number(f64),
    Integer(i64),
    Boolean(bool),
    Null,
}

#[derive(Clone, Debug, PartialEq)]
pub struct EventProperty {
    pub name: String,
    pub value: PropertyValue,
}

#[derive(Clone, Debug, PartialEq)]
pub struct EventEnvelope {
    pub schema_version: String,
    pub event_id: String,
    pub occurred_at: String,
    pub collected_at: String,
    pub source: Source,
    pub identity: Identity,
    pub session: Session,
    pub name: String,
    pub category: String,
    pub properties: Vec<EventProperty>,
    pub privacy_class: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct EventBatch {
    pub schema_version: String,
    pub batch_id: String,
    pub created_at: String,
    pub source: Source,
    pub event_count: usize,
    pub compression: String,
    pub events: Vec<EventEnvelope>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct UploadSource {
    pub app_id: String,
    pub product: String,
    pub sdk_name: String,
    pub sdk_version: String,
    pub environment: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct PlaintextDescriptor {
    pub schema_version: String,
    pub content_type: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct EncryptionMetadata {
    pub alg: String,
    pub key_id: String,
    pub nonce: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct EncryptedPayload {
    pub encoding: String,
    pub ciphertext: String,
    pub auth_tag: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct EncryptedEventBatch {
    pub schema_version: String,
    pub batch_id: String,
    pub created_at: String,
    pub source: UploadSource,
    pub plaintext: PlaintextDescriptor,
    pub encryption: EncryptionMetadata,
    pub payload: EncryptedPayload,
}

pub struct EventBuilder {
    source: Source,
    identity: Identity,
    session_id: String,
    session_started_at: String,
    sequence: u64,
}

impl EventBuilder {
    pub fn new(source: Source, identity: Identity, session_id: String, session_started_at: String) -> Self {
        Self {
            source,
            identity,
            session_id,
            session_started_at,
            sequence: 0,
        }
    }

    pub fn build(
        &mut self,
        event_id: String,
        now: String,
        name: String,
        category: String,
        properties: Vec<EventProperty>,
    ) -> Result<EventEnvelope, String> {
        assert_privacy_safe(&properties)?;
        self.sequence += 1;
        Ok(EventEnvelope {
            schema_version: EVENT_SCHEMA_VERSION.to_string(),
            event_id,
            occurred_at: now.clone(),
            collected_at: now,
            source: self.source.clone(),
            identity: self.identity.clone(),
            session: Session {
                session_id: self.session_id.clone(),
                started_at: self.session_started_at.clone(),
                sequence: self.sequence,
            },
            name,
            category: category.clone(),
            properties,
            privacy_class: default_privacy_class(&category).to_string(),
        })
    }
}

pub struct MemoryQueue {
    items: VecDeque<EventEnvelope>,
    max_size: usize,
}

impl MemoryQueue {
    pub fn new(max_size: usize) -> Self {
        Self {
            items: VecDeque::new(),
            max_size,
        }
    }

    pub fn enqueue(&mut self, event: EventEnvelope) -> Result<usize, String> {
        if self.items.len() >= self.max_size {
            return Err("SIGNALLAKE_QUEUE_FULL".to_string());
        }
        self.items.push_back(event);
        Ok(self.items.len())
    }

    pub fn drain(&mut self, limit: usize) -> Vec<EventEnvelope> {
        let mut drained = Vec::new();
        for _ in 0..limit {
            if let Some(event) = self.items.pop_front() {
                drained.push(event);
            } else {
                break;
            }
        }
        drained
    }

    pub fn len(&self) -> usize {
        self.items.len()
    }
}

pub fn build_batch(batch_id: String, created_at: String, source: Source, events: Vec<EventEnvelope>) -> EventBatch {
    EventBatch {
        schema_version: BATCH_SCHEMA_VERSION.to_string(),
        batch_id,
        created_at,
        source,
        event_count: events.len(),
        compression: "none".to_string(),
        events,
    }
}

pub fn build_encrypted_batch_envelope(
    batch: &EventBatch,
    key_id: String,
    nonce: String,
    ciphertext: String,
    auth_tag: String,
) -> EncryptedEventBatch {
    EncryptedEventBatch {
        schema_version: ENCRYPTED_BATCH_SCHEMA_VERSION.to_string(),
        batch_id: batch.batch_id.clone(),
        created_at: batch.created_at.clone(),
        source: UploadSource {
            app_id: batch.source.app_id.clone(),
            product: batch.source.product.clone(),
            sdk_name: batch.source.sdk_name.clone(),
            sdk_version: batch.source.sdk_version.clone(),
            environment: batch.source.environment.clone(),
        },
        plaintext: PlaintextDescriptor {
            schema_version: BATCH_SCHEMA_VERSION.to_string(),
            content_type: BATCH_CONTENT_TYPE.to_string(),
        },
        encryption: EncryptionMetadata {
            alg: ENCRYPTION_ALG_AES_256_GCM.to_string(),
            key_id,
            nonce,
        },
        payload: EncryptedPayload {
            encoding: "base64url".to_string(),
            ciphertext,
            auth_tag,
        },
    }
}

pub fn assert_privacy_safe(properties: &[EventProperty]) -> Result<(), String> {
    for property in properties {
        let lower = property.name.to_lowercase();
        if lower.contains("filepath")
            || lower.contains("filename")
            || lower.contains("folderpath")
            || lower.contains("foldername")
            || lower.contains("clipboard")
            || lower.contains("raw")
            || lower.contains("password")
            || lower.contains("secret")
            || lower.contains("token")
            || lower.contains("email")
            || lower.contains("phone")
        {
            return Err("SIGNALLAKE_PRIVACY_VIOLATION".to_string());
        }
    }
    Ok(())
}

fn default_privacy_class(category: &str) -> &'static str {
    match category {
        "error" => "diagnostic",
        "system" => "operational",
        _ => "behavioral",
    }
}
