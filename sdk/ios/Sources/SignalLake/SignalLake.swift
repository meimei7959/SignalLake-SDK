import Foundation

public let eventSchemaVersion = "signallake.event-envelope.v1"
public let batchSchemaVersion = "signallake.event-batch.v1"
public let encryptedBatchSchemaVersion = "signallake.encrypted-event-batch.v1"
public let batchContentType = "application/vnd.signallake.event-batch+json;v=1"
public let encryptionAlgAes256Gcm = "AES-256-GCM"

public struct Source: Equatable {
    public let appId: String
    public let product: String
    public let sdkName: String
    public let sdkVersion: String
    public let platform: String
    public let appVersion: String?
    public let environment: String
}

public struct Identity: Equatable {
    public let anonymousId: String
    public let deviceId: String
    public let userId: String?
}

public struct Session: Equatable {
    public let sessionId: String
    public let startedAt: String
    public let sequence: Int
}

public enum PropertyValue: Equatable {
    case string(String)
    case number(Double)
    case integer(Int)
    case bool(Bool)
    case null
}

public struct EventEnvelope: Equatable {
    public let schemaVersion: String
    public let eventId: String
    public let occurredAt: String
    public let collectedAt: String
    public let source: Source
    public let identity: Identity
    public let session: Session
    public let name: String
    public let category: String
    public let properties: [String: PropertyValue]
    public let privacyClass: String
}

public struct EventBatch: Equatable {
    public let schemaVersion: String
    public let batchId: String
    public let createdAt: String
    public let source: Source
    public let eventCount: Int
    public let compression: String
    public let events: [EventEnvelope]
}

public struct UploadSource: Equatable, Codable {
    public let appId: String
    public let product: String
    public let sdkName: String
    public let sdkVersion: String
    public let environment: String
}

public struct PlaintextDescriptor: Equatable, Codable {
    public let schemaVersion: String
    public let contentType: String
}

public struct EncryptionMetadata: Equatable, Codable {
    public let alg: String
    public let keyId: String
    public let nonce: String
}

public struct EncryptedPayload: Equatable, Codable {
    public let encoding: String
    public let ciphertext: String
    public let authTag: String
}

public struct EncryptedEventBatch: Equatable, Codable {
    public let schemaVersion: String
    public let batchId: String
    public let createdAt: String
    public let source: UploadSource
    public let plaintext: PlaintextDescriptor
    public let encryption: EncryptionMetadata
    public let payload: EncryptedPayload
}

public enum SignalLakeError: Error, Equatable {
    case privacyViolation
    case queueFull
}

public enum SignalLakeDropPolicy: Equatable {
    case dropOldest
    case dropNewest
}

public struct SignalLakeStoragePolicy: Equatable {
    public let maxDiskBytes: Int
    public let maxDiskBatches: Int
    public let dropPolicy: SignalLakeDropPolicy

    public init(
        maxDiskBytes: Int = 1024 * 1024,
        maxDiskBatches: Int = 100,
        dropPolicy: SignalLakeDropPolicy = .dropOldest
    ) {
        precondition(maxDiskBytes > 0, "maxDiskBytes must be positive")
        precondition(maxDiskBatches > 0, "maxDiskBatches must be positive")
        self.maxDiskBytes = maxDiskBytes
        self.maxDiskBatches = maxDiskBatches
        self.dropPolicy = dropPolicy
    }
}

public final class EventBuilder {
    private let source: Source
    private let identity: Identity
    private let sessionId: String
    private let sessionStartedAt: String
    private var sequence: Int = 0

    public init(source: Source, identity: Identity, sessionId: String, sessionStartedAt: String) {
        self.source = source
        self.identity = identity
        self.sessionId = sessionId
        self.sessionStartedAt = sessionStartedAt
    }

    public func buildEvent(
        eventId: String,
        now: String,
        name: String,
        category: String,
        properties: [String: PropertyValue]
    ) throws -> EventEnvelope {
        try PrivacyGuard.assertSafe(properties: properties)
        sequence += 1
        return EventEnvelope(
            schemaVersion: eventSchemaVersion,
            eventId: eventId,
            occurredAt: now,
            collectedAt: now,
            source: source,
            identity: identity,
            session: Session(sessionId: sessionId, startedAt: sessionStartedAt, sequence: sequence),
            name: name,
            category: category,
            properties: properties,
            privacyClass: defaultPrivacyClass(category)
        )
    }
}

public final class MemoryQueue {
    private var items: [EventEnvelope] = []
    private let maxSize: Int

    public init(maxSize: Int = 1000) {
        self.maxSize = maxSize
    }

    public func enqueue(_ event: EventEnvelope) throws -> Int {
        guard items.count < maxSize else { throw SignalLakeError.queueFull }
        items.append(event)
        return items.count
    }

    public func drain(limit: Int? = nil) -> [EventEnvelope] {
        let count = min(limit ?? items.count, items.count)
        let drained = Array(items.prefix(count))
        items.removeFirst(count)
        return drained
    }

    public var count: Int {
        items.count
    }
}

public final class DiskEncryptedBatchQueue {
    public struct PendingBatch: Equatable {
        public let fileURL: URL
        public let batch: EncryptedEventBatch
    }

    public let directoryURL: URL
    public let policy: SignalLakeStoragePolicy
    private let fileManager: FileManager
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    public init(
        directoryURL: URL,
        policy: SignalLakeStoragePolicy = SignalLakeStoragePolicy(),
        fileManager: FileManager = .default
    ) {
        self.directoryURL = directoryURL
        self.policy = policy
        self.fileManager = fileManager
    }

    public static func applicationSupportQueueURL(bundleIdentifier: String) throws -> URL {
        let root = try FileManager.default.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        )
        return root
            .appendingPathComponent(bundleIdentifier, isDirectory: true)
            .appendingPathComponent("SignalLake", isDirectory: true)
            .appendingPathComponent("Queue", isDirectory: true)
    }

    public func enqueue(_ batch: EncryptedEventBatch) throws -> PendingBatch? {
        let data = try encoder.encode(batch)
        guard data.count <= policy.maxDiskBytes else { return nil }
        try ensureDirectory()
        guard try makeRoom(incomingBytes: data.count) else { return nil }
        let target = directoryURL.appendingPathComponent(fileName(batch.batchId))
        let temp = directoryURL.appendingPathComponent(target.lastPathComponent + ".tmp")
        try data.write(to: temp, options: .atomic)
        try? fileManager.removeItem(at: target)
        try fileManager.moveItem(at: temp, to: target)
        try enforceBatchLimit()
        return PendingBatch(fileURL: target, batch: batch)
    }

    public func peek() throws -> PendingBatch? {
        for file in try batchFiles() {
            do {
                let data = try Data(contentsOf: file)
                let batch = try decoder.decode(EncryptedEventBatch.self, from: data)
                return PendingBatch(fileURL: file, batch: batch)
            } catch {
                try? fileManager.removeItem(at: file)
            }
        }
        return nil
    }

    public func delete(_ pendingBatch: PendingBatch) {
        try? fileManager.removeItem(at: pendingBatch.fileURL)
    }

    public var count: Int {
        (try? batchFiles().count) ?? 0
    }

    public var sizeBytes: Int {
        ((try? batchFiles()) ?? []).reduce(0) { total, file in
            let values = try? file.resourceValues(forKeys: [.fileSizeKey])
            return total + (values?.fileSize ?? 0)
        }
    }

    private func ensureDirectory() throws {
        try fileManager.createDirectory(at: directoryURL, withIntermediateDirectories: true)
        var url = directoryURL
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try? url.setResourceValues(values)
    }

    private func makeRoom(incomingBytes: Int) throws -> Bool {
        if policy.dropPolicy == .dropNewest {
            return count < policy.maxDiskBatches && sizeBytes + incomingBytes <= policy.maxDiskBytes
        }
        while count >= policy.maxDiskBatches || sizeBytes + incomingBytes > policy.maxDiskBytes {
            guard let oldest = try batchFiles().first else { return false }
            try fileManager.removeItem(at: oldest)
        }
        return true
    }

    private func enforceBatchLimit() throws {
        while count > policy.maxDiskBatches {
            guard let oldest = try batchFiles().first else { return }
            try fileManager.removeItem(at: oldest)
        }
    }

    private func batchFiles() throws -> [URL] {
        guard fileManager.fileExists(atPath: directoryURL.path) else { return [] }
        return try fileManager
            .contentsOfDirectory(at: directoryURL, includingPropertiesForKeys: [.fileSizeKey])
            .filter { $0.lastPathComponent.hasSuffix(".batch") }
            .sorted { $0.lastPathComponent < $1.lastPathComponent }
    }

    private func fileName(_ batchId: String) -> String {
        let safeId = batchId.map { char -> Character in
            char.isLetter || char.isNumber || char == "-" || char == "_" ? char : "_"
        }
        return "\(Int(Date().timeIntervalSince1970 * 1000))-\(String(safeId)).batch"
    }
}

public enum PrivacyGuard {
    private static let forbiddenTerms = [
        "filepath",
        "filename",
        "folderpath",
        "foldername",
        "clipboard",
        "raw",
        "password",
        "secret",
        "token",
        "email",
        "phone"
    ]

    public static func assertSafe(properties: [String: PropertyValue]) throws {
        for name in properties.keys {
            let lower = name.lowercased()
            if forbiddenTerms.contains(where: { lower.contains($0) }) {
                throw SignalLakeError.privacyViolation
            }
        }
    }
}

public func buildBatch(batchId: String, createdAt: String, source: Source, events: [EventEnvelope]) -> EventBatch {
    EventBatch(
        schemaVersion: batchSchemaVersion,
        batchId: batchId,
        createdAt: createdAt,
        source: source,
        eventCount: events.count,
        compression: "none",
        events: events
    )
}

public func buildEncryptedBatchEnvelope(
    batch: EventBatch,
    keyId: String,
    nonce: String,
    ciphertext: String,
    authTag: String
) -> EncryptedEventBatch {
    EncryptedEventBatch(
        schemaVersion: encryptedBatchSchemaVersion,
        batchId: batch.batchId,
        createdAt: batch.createdAt,
        source: UploadSource(
            appId: batch.source.appId,
            product: batch.source.product,
            sdkName: batch.source.sdkName,
            sdkVersion: batch.source.sdkVersion,
            environment: batch.source.environment
        ),
        plaintext: PlaintextDescriptor(
            schemaVersion: batchSchemaVersion,
            contentType: batchContentType
        ),
        encryption: EncryptionMetadata(
            alg: encryptionAlgAes256Gcm,
            keyId: keyId,
            nonce: nonce
        ),
        payload: EncryptedPayload(
            encoding: "base64url",
            ciphertext: ciphertext,
            authTag: authTag
        )
    )
}

private func defaultPrivacyClass(_ category: String) -> String {
    switch category {
    case "error":
        return "diagnostic"
    case "system":
        return "operational"
    default:
        return "behavioral"
    }
}
