This script parses TypeScript models and outputs equivalent Swift models. This is useful for APIs that have only TypeScript SDKs and no OpenAPI specifications. 

Usually, I've observed that, the `interface` is used instead of a `class` or object `type` alias. That's why the `interface` is converted to a `struct` instead of a `protocol`.

## Usage

```bash
npm run convert -- -i <path/to/folder_with_ts_files> -o <path/to/output_folder>
```

It handles nested structures, and it outputs to exact paths that it sees in the TypeScript files.

Try it in the [examples](examples) folder

```bash
npm run convert -- -i examples/input -o examples/output
```

## Issues

```ts
interface CustomerUrlData {
    url: string;
    auth_headers?: {[header: string]: string};
}
```

should be

```swift
struct CustomerUrlData {
    var url: String
    var auth_headers: [String: String]?
}
```

but we get

```swift
struct CustomerUrlData {
    var url: String
    var auth_headers: {[header: string]: string}?
}
```