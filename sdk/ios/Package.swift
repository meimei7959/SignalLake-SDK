// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SignalLake",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(name: "SignalLake", targets: ["SignalLake"])
    ],
    targets: [
        .target(name: "SignalLake", path: "Sources/SignalLake"),
        .testTarget(
            name: "SignalLakeTests",
            dependencies: ["SignalLake"],
            path: "Tests/SignalLakeTests"
        )
    ]
)
