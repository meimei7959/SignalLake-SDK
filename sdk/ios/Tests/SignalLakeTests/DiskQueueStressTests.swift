import Foundation
import XCTest
@testable import SignalLake

final class DiskQueueStressTests: XCTestCase {
    func testEncryptedDiskQueueStressDropsOldestAndStoresNoPlaintext() throws {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("signallake-ios-stress-\(UUID().uuidString)", isDirectory: true)
        let queue = DiskEncryptedBatchQueue(
            directoryURL: directory,
            policy: SignalLakeStoragePolicy(maxDiskBytes: 1024 * 1024, maxDiskBatches: 40)
        )

        for index in 0..<120 {
            _ = try queue.enqueue(encryptedBatch(batchId: String(format: "stress-%03d", index)))
        }

        let pending = try XCTUnwrap(queue.peek())
        let files = try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)
        let joined = try files
            .map { try String(contentsOf: $0, encoding: .utf8) }
            .joined(separator: "\n")

        XCTAssertEqual(queue.count, 40)
        XCTAssertLessThanOrEqual(queue.sizeBytes, 1024 * 1024)
        XCTAssertEqual(pending.batch.batchId, "stress-080")
        XCTAssertFalse(joined.contains("app.opened"))

        queue.delete(pending)
        XCTAssertEqual(queue.count, 39)

        try? FileManager.default.removeItem(at: directory)
    }

    private func encryptedBatch(batchId: String) -> EncryptedEventBatch {
        EncryptedEventBatch(
            schemaVersion: encryptedBatchSchemaVersion,
            batchId: batchId,
            createdAt: "2026-07-08T00:00:00.000Z",
            source: UploadSource(
                appId: "app.signallake.stress",
                product: "SignalLake-Stress",
                sdkName: "signallake-ios",
                sdkVersion: "0.0.0-stress",
                environment: "test"
            ),
            plaintext: PlaintextDescriptor(
                schemaVersion: batchSchemaVersion,
                contentType: batchContentType
            ),
            encryption: EncryptionMetadata(
                alg: encryptionAlgAes256Gcm,
                keyId: "stress-key",
                nonce: "stress-nonce"
            ),
            payload: EncryptedPayload(
                encoding: "base64url",
                ciphertext: "sealed-ciphertext",
                authTag: "sealed-auth-tag"
            )
        )
    }
}
