import * as ts from "typescript";
import * as fs from "fs";
import { Command } from "commander";
import * as path from "path";

function convertTypeToSwift(
  type: ts.Type,
  typeChecker: ts.TypeChecker,
): string {
  if (type.isStringLiteral()) {
    return `"${type.value}"`;
  } else if (type.isNumberLiteral()) {
    return type.value.toString();
  } else if (type.flags & ts.TypeFlags.String) {
    return "String";
  } else if (type.flags & ts.TypeFlags.Number) {
    return "Double";
  } else if (type.flags & ts.TypeFlags.Boolean) {
    return "Bool";
  } else if (type.flags & ts.TypeFlags.Enum) {
    return typeChecker.typeToString(type);
  } else if (type.flags & ts.TypeFlags.Object) {
    const objType = type as ts.ObjectType;
    if (objType.objectFlags & ts.ObjectFlags.Reference) {
      const typeReference = type as ts.TypeReference;
      if (
        typeReference.target &&
        typeReference.target.symbol &&
        typeReference.target.symbol.name === "Array"
      ) {
        const typeArgs = typeChecker.getTypeArguments(typeReference);
        if (typeArgs && typeArgs.length > 0) {
          const elementType = convertTypeToSwift(typeArgs[0], typeChecker);
          return `[${elementType}]`;
        }
      }
      return typeChecker.typeToString(type);
    }
  } else if (type.flags & ts.TypeFlags.Union) {
    const unionType = type as ts.UnionType;
    const types = unionType.types.filter(
      (t) => !(t.flags & ts.TypeFlags.Undefined),
    );
    if (types.length === 1) {
      return `${convertTypeToSwift(types[0], typeChecker)}?`;
    }
  }
  return typeChecker.typeToString(type);
}

function convertEnumToSwift(node: ts.EnumDeclaration): string {
  const enumName = node.name.text;
  const members = node.members.map((member) => {
    const name = member.name.getText();
    let value = member.initializer ? member.initializer.getText() : "";

    // Replace single quotes with double quotes
    if (value.startsWith("'") && value.endsWith("'")) {
      value = `"${value.slice(1, -1)}"`;
    }

    return `    case ${name.toLowerCase()} = ${value}`;
  });
  return `enum ${enumName}: String, Codable, Sendable {\n${members.join("\n")}\n}`;
}

function convertInterfaceToSwift(
  node: ts.InterfaceDeclaration,
  typeChecker: ts.TypeChecker,
): string {
  const structName = node.name.text;
  const properties = node.members
    .map((member) => {
      if (ts.isPropertySignature(member)) {
        const name = member.name.getText();
        const isOptional = member.questionToken !== undefined;
        let type = member.type
          ? typeChecker.getTypeAtLocation(member.type)
          : typeChecker.getAnyType();

        let swiftType = convertTypeToSwift(type, typeChecker);

        if (isOptional && !swiftType.endsWith("?")) {
          swiftType += "?";
        }

        return `    var ${name}: ${swiftType}`;
      }
      return "";
    })
    .filter((prop) => prop !== "");
  return `struct ${structName}: Codable, Sendable {\n${properties.join("\n")}\n}`;
}

function convertTypeScriptToSwift(
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
): string {
  let swiftCode = "";

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isEnumDeclaration(node)) {
      swiftCode += convertEnumToSwift(node) + "\n\n";
    } else if (ts.isInterfaceDeclaration(node)) {
      swiftCode += convertInterfaceToSwift(node, typeChecker) + "\n\n";
    }
  });

  return swiftCode;
}

function convertTypeScriptFileToSwift(inputPath: string, outputPath: string) {
  const program = ts.createProgram([inputPath], {});
  const sourceFile = program.getSourceFile(inputPath);
  const typeChecker = program.getTypeChecker();

  if (sourceFile) {
    const swiftCode = convertTypeScriptToSwift(sourceFile, typeChecker);
    fs.writeFileSync(outputPath, swiftCode);
    console.log(`Conversion complete. Swift code written to ${outputPath}`);
  } else {
    console.error("Could not find source file.");
  }
}

function processTypeScriptFiles(inputDir: string, outputDir: string) {
  function processFile(filePath: string) {
    const relativePath = path.relative(inputDir, filePath);
    const outputPath = path.join(
      outputDir,
      relativePath.replace(".ts", ".swift"),
    );

    const program = ts.createProgram([filePath], {});
    const sourceFile = program.getSourceFile(filePath);
    const typeChecker = program.getTypeChecker();

    if (sourceFile) {
      const swiftCode = convertTypeScriptToSwift(sourceFile, typeChecker);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, swiftCode);
      console.log(`Converted ${filePath} to ${outputPath}`);
    } else {
      console.error(`Could not find source file: ${filePath}`);
    }
  }

  function traverseDirectory(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        traverseDirectory(filePath);
      } else if (path.extname(file) === ".ts") {
        processFile(filePath);
      }
    }
  }

  traverseDirectory(inputDir);
}

const program = new Command();

program
  .version("1.0.0")
  .description("Convert TypeScript types to Swift")
  .requiredOption("-i, --input <path>", "Input TypeScript folder path")
  .requiredOption("-o, --output <path>", "Output Swift folder path")
  .action((options) => {
    processTypeScriptFiles(options.input, options.output);
  });

program.parse(process.argv);
