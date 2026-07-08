use std::collections::VecDeque;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

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

#[derive(Clone, Debug, PartialEq)]
pub enum DropPolicy {
    DropOldest,
    DropNewest,
}

#[derive(Clone, Debug, PartialEq)]
pub struct StoragePolicy {
    pub max_disk_bytes: u64,
    pub max_disk_batches: usize,
    pub drop_policy: DropPolicy,
}

impl StoragePolicy {
    pub fn desktop_default() -> Self {
        Self {
            max_disk_bytes: 1024 * 1024,
            max_disk_batches: 100,
            drop_policy: DropPolicy::DropOldest,
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct PendingEncryptedBatch {
    pub path: PathBuf,
    pub batch: EncryptedEventBatch,
}

pub struct DiskEncryptedBatchQueue {
    directory: PathBuf,
    policy: StoragePolicy,
}

impl DiskEncryptedBatchQueue {
    pub fn new(directory: PathBuf, policy: StoragePolicy) -> Self {
        Self { directory, policy }
    }

    pub fn enqueue(&self, batch: &EncryptedEventBatch) -> Result<Option<PendingEncryptedBatch>, String> {
        let json = encrypted_batch_to_json(batch);
        let bytes = json.as_bytes();
        if bytes.len() as u64 > self.policy.max_disk_bytes {
            return Ok(None);
        }
        fs::create_dir_all(&self.directory).map_err(|error| error.to_string())?;
        if !self.make_room(bytes.len() as u64)? {
            return Ok(None);
        }
        let path = self.directory.join(file_name(&batch.batch_id));
        let temp = path.with_extension("batch.tmp");
        fs::write(&temp, bytes).map_err(|error| error.to_string())?;
        fs::rename(&temp, &path).map_err(|error| error.to_string())?;
        self.enforce_batch_limit()?;
        Ok(Some(PendingEncryptedBatch {
            path,
            batch: batch.clone(),
        }))
    }

    pub fn peek(&self) -> Result<Option<PendingEncryptedBatch>, String> {
        for path in self.batch_files()? {
            match fs::read_to_string(&path)
                .map_err(|error| error.to_string())
                .and_then(|json| encrypted_batch_from_json(&json))
            {
                Ok(batch) => return Ok(Some(PendingEncryptedBatch { path, batch })),
                Err(_) => {
                    let _ = fs::remove_file(&path);
                }
            }
        }
        Ok(None)
    }

    pub fn delete(&self, pending: &PendingEncryptedBatch) -> Result<(), String> {
        fs::remove_file(&pending.path).map_err(|error| error.to_string())
    }

    pub fn len(&self) -> usize {
        self.batch_files().map(|files| files.len()).unwrap_or(0)
    }

    pub fn size_bytes(&self) -> u64 {
        self.batch_files()
            .unwrap_or_default()
            .iter()
            .filter_map(|path| fs::metadata(path).ok())
            .map(|metadata| metadata.len())
            .sum()
    }

    pub fn directory(&self) -> &Path {
        &self.directory
    }

    fn make_room(&self, incoming_bytes: u64) -> Result<bool, String> {
        if self.policy.drop_policy == DropPolicy::DropNewest {
            return Ok(self.len() < self.policy.max_disk_batches && self.size_bytes() + incoming_bytes <= self.policy.max_disk_bytes);
        }
        while self.len() >= self.policy.max_disk_batches || self.size_bytes() + incoming_bytes > self.policy.max_disk_bytes {
            let Some(oldest) = self.batch_files()?.first().cloned() else {
                return Ok(false);
            };
            fs::remove_file(oldest).map_err(|error| error.to_string())?;
        }
        Ok(true)
    }

    fn enforce_batch_limit(&self) -> Result<(), String> {
        while self.len() > self.policy.max_disk_batches {
            let Some(oldest) = self.batch_files()?.first().cloned() else {
                return Ok(());
            };
            fs::remove_file(oldest).map_err(|error| error.to_string())?;
        }
        Ok(())
    }

    fn batch_files(&self) -> Result<Vec<PathBuf>, String> {
        if !self.directory.exists() {
            return Ok(Vec::new());
        }
        let mut files = Vec::new();
        for entry in fs::read_dir(&self.directory).map_err(|error| error.to_string())? {
            let path = entry.map_err(|error| error.to_string())?.path();
            if path.is_file() && path.extension().and_then(|ext| ext.to_str()) == Some("batch") {
                files.push(path);
            }
        }
        files.sort_by(|left, right| left.file_name().cmp(&right.file_name()));
        Ok(files)
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

pub fn encrypted_batch_to_json(batch: &EncryptedEventBatch) -> String {
    format!(
        "{{\"schemaVersion\":\"{}\",\"batchId\":\"{}\",\"createdAt\":\"{}\",\"source\":{{\"appId\":\"{}\",\"product\":\"{}\",\"sdkName\":\"{}\",\"sdkVersion\":\"{}\",\"environment\":\"{}\"}},\"plaintext\":{{\"schemaVersion\":\"{}\",\"contentType\":\"{}\"}},\"encryption\":{{\"alg\":\"{}\",\"keyId\":\"{}\",\"nonce\":\"{}\"}},\"payload\":{{\"encoding\":\"{}\",\"ciphertext\":\"{}\",\"authTag\":\"{}\"}}}}",
        escape_json(&batch.schema_version),
        escape_json(&batch.batch_id),
        escape_json(&batch.created_at),
        escape_json(&batch.source.app_id),
        escape_json(&batch.source.product),
        escape_json(&batch.source.sdk_name),
        escape_json(&batch.source.sdk_version),
        escape_json(&batch.source.environment),
        escape_json(&batch.plaintext.schema_version),
        escape_json(&batch.plaintext.content_type),
        escape_json(&batch.encryption.alg),
        escape_json(&batch.encryption.key_id),
        escape_json(&batch.encryption.nonce),
        escape_json(&batch.payload.encoding),
        escape_json(&batch.payload.ciphertext),
        escape_json(&batch.payload.auth_tag)
    )
}

pub fn encrypted_batch_from_json(json: &str) -> Result<EncryptedEventBatch, String> {
    let source = object_value(json, "source")?;
    let plaintext = object_value(json, "plaintext")?;
    let encryption = object_value(json, "encryption")?;
    let payload = object_value(json, "payload")?;
    Ok(EncryptedEventBatch {
        schema_version: string_value(json, "schemaVersion")?,
        batch_id: string_value(json, "batchId")?,
        created_at: string_value(json, "createdAt")?,
        source: UploadSource {
            app_id: string_value(source, "appId")?,
            product: string_value(source, "product")?,
            sdk_name: string_value(source, "sdkName")?,
            sdk_version: string_value(source, "sdkVersion")?,
            environment: string_value(source, "environment")?,
        },
        plaintext: PlaintextDescriptor {
            schema_version: string_value(plaintext, "schemaVersion")?,
            content_type: string_value(plaintext, "contentType")?,
        },
        encryption: EncryptionMetadata {
            alg: string_value(encryption, "alg")?,
            key_id: string_value(encryption, "keyId")?,
            nonce: string_value(encryption, "nonce")?,
        },
        payload: EncryptedPayload {
            encoding: string_value(payload, "encoding")?,
            ciphertext: string_value(payload, "ciphertext")?,
            auth_tag: string_value(payload, "authTag")?,
        },
    })
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

fn file_name(batch_id: &str) -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    format!("{:013}-{}.batch", millis, sanitize(batch_id))
}

fn sanitize(value: &str) -> String {
    value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                ch
            } else {
                '_'
            }
        })
        .collect()
}

fn escape_json(value: &str) -> String {
    let mut out = String::new();
    for ch in value.chars() {
        match ch {
            '\\' => out.push_str("\\\\"),
            '"' => out.push_str("\\\""),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            _ => out.push(ch),
        }
    }
    out
}

fn object_value<'a>(json: &'a str, key: &str) -> Result<&'a str, String> {
    let marker = format!("\"{}\":{{", key);
    let start = json.find(&marker).ok_or_else(|| format!("missing {}", key))? + marker.len() - 1;
    let mut depth = 0;
    for (offset, ch) in json[start..].char_indices() {
        if ch == '{' {
            depth += 1;
        } else if ch == '}' {
            depth -= 1;
            if depth == 0 {
                return Ok(&json[start..=start + offset]);
            }
        }
    }
    Err(format!("invalid object {}", key))
}

fn string_value(json: &str, key: &str) -> Result<String, String> {
    let marker = format!("\"{}\":\"", key);
    let start = json.find(&marker).ok_or_else(|| format!("missing {}", key))? + marker.len();
    let mut out = String::new();
    let mut escaped = false;
    for ch in json[start..].chars() {
        if escaped {
            out.push(match ch {
                'n' => '\n',
                'r' => '\r',
                't' => '\t',
                other => other,
            });
            escaped = false;
        } else if ch == '\\' {
            escaped = true;
        } else if ch == '"' {
            return Ok(out);
        } else {
            out.push(ch);
        }
    }
    Err(format!("invalid string {}", key))
}

fn default_privacy_class(category: &str) -> &'static str {
    match category {
        "error" => "diagnostic",
        "system" => "operational",
        _ => "behavioral",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn disk_encrypted_batch_queue_stress_drops_oldest_and_stores_no_plaintext() {
        let directory = std::env::temp_dir().join(format!(
            "signallake-rust-stress-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let queue = DiskEncryptedBatchQueue::new(
            directory.clone(),
            StoragePolicy {
                max_disk_bytes: 1024 * 1024,
                max_disk_batches: 40,
                drop_policy: DropPolicy::DropOldest,
            },
        );

        for index in 0..120 {
            queue.enqueue(&encrypted_batch(format!("stress-{index:03}"))).unwrap();
        }

        let pending = queue.peek().unwrap().unwrap();
        let joined = std::fs::read_dir(&directory)
            .unwrap()
            .map(|entry| std::fs::read_to_string(entry.unwrap().path()).unwrap())
            .collect::<Vec<_>>()
            .join("\n");

        assert_eq!(queue.len(), 40);
        assert!(queue.size_bytes() <= 1024 * 1024);
        assert_eq!(pending.batch.batch_id, "stress-080");
        assert!(!joined.contains("app.opened"));

        queue.delete(&pending).unwrap();
        assert_eq!(queue.len(), 39);

        let _ = std::fs::remove_dir_all(directory);
    }

    fn encrypted_batch(batch_id: String) -> EncryptedEventBatch {
        EncryptedEventBatch {
            schema_version: ENCRYPTED_BATCH_SCHEMA_VERSION.to_string(),
            batch_id,
            created_at: "2026-07-08T00:00:00.000Z".to_string(),
            source: UploadSource {
                app_id: "app.signallake.stress".to_string(),
                product: "SignalLake-Stress".to_string(),
                sdk_name: "signallake-rust".to_string(),
                sdk_version: "0.0.0-stress".to_string(),
                environment: "test".to_string(),
            },
            plaintext: PlaintextDescriptor {
                schema_version: BATCH_SCHEMA_VERSION.to_string(),
                content_type: BATCH_CONTENT_TYPE.to_string(),
            },
            encryption: EncryptionMetadata {
                alg: ENCRYPTION_ALG_AES_256_GCM.to_string(),
                key_id: "stress-key".to_string(),
                nonce: "stress-nonce".to_string(),
            },
            payload: EncryptedPayload {
                encoding: "base64url".to_string(),
                ciphertext: "sealed-ciphertext".to_string(),
                auth_tag: "sealed-auth-tag".to_string(),
            },
        }
    }
}
