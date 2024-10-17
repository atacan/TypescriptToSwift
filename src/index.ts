import * as ts from "typescript";
import * as fs from "fs";
import { Command } from "commander";

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
    if (unionType.types.some((t) => t.flags & ts.TypeFlags.Undefined)) {
      const nonUndefinedTypes = unionType.types.filter(
        (t) => !(t.flags & ts.TypeFlags.Undefined),
      );
      return `${convertTypeToSwift(nonUndefinedTypes[0], typeChecker)}?`;
    }
  }
  return typeChecker.typeToString(type);
}

function convertEnumToSwift(node: ts.EnumDeclaration): string {
  const enumName = node.name.text;
  const members = node.members.map((member) => {
    const name = member.name.getText();
    const value = member.initializer ? member.initializer.getText() : "";
    return `    case ${name.toLowerCase()} = ${value}`;
  });
  return `enum ${enumName}: String {\n${members.join("\n")}\n}`;
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
        const type = member.type
          ? convertTypeToSwift(
              typeChecker.getTypeAtLocation(member.type),
              typeChecker,
            )
          : "Any";
        return `    var ${name}: ${type}`;
      }
      return "";
    })
    .filter((prop) => prop !== "");
  return `struct ${structName} {\n${properties.join("\n")}\n}`;
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

const program = new Command();

program
  .version("1.0.0")
  .description("Convert TypeScript types to Swift")
  .requiredOption("-i, --input <path>", "Input TypeScript file path")
  .requiredOption("-o, --output <path>", "Output Swift file path")
  .action((options) => {
    convertTypeScriptFileToSwift(options.input, options.output);
  });

program.parse(process.argv);
