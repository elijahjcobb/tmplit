/**
 * Elijah Cobb
 * elijah@elijahcobb.com
 * elijahcobb.com
 * github.com/elijahjcobb
 */

import * as Mustache from "mustache";
import * as Path from "path";
import * as FS from "fs";
import * as process from "process";
import {camelCase, pascalCase, snakeCase} from "change-case";
import {homedir} from "os";
import {promisify} from "util";
import * as inquirer from "inquirer";

//@ts-ignore
Mustache.escape = function(text) {return text; };

const fsExists = promisify(FS.exists);
const fsReadDir = promisify(FS.readdir);
const fsMkDir = promisify(FS.mkdir);
const fsReadFile = promisify(FS.readFile);
const fsWriteFile = promisify(FS.writeFile);

function tmplitDir(): string {
	return Path.resolve(homedir(), ".tmplit");
}

async function fetchFiles(): Promise<string[]> {
	if (!(await fsExists(tmplitDir()))) await fsMkDir(tmplitDir());
	const files = await fsReadDir(tmplitDir());
	return files.filter(file => !file.startsWith("."));
}

async function inquireFile(files: string[]): Promise<string> {
	const answer = await inquirer.prompt([
		{
			type: "list",
			message: "Which template would you like to use?",
			name: "template",
			choices: files
		}
	]) as { template: string};
	return answer.template;
}

async function readFile(file: string): Promise<{ file: string, extension: string, rawName: string }> {
	const filePath = Path.resolve(tmplitDir(), file);
	const data = await fsReadFile(filePath);

	const x = file.split(".");

	return {
		file: data.toString("utf-8"),
		extension: x[x.length - 1],
		rawName: x[0]
	};
}

function parseVariablesFromFile(value: string): string[] {
	return Array.from(new Set<string>(Mustache.parse(value).filter(v => v[0] === "name").map(v => v[1])));
}

const DEFAULT_VARS = ["nameCamel", "nameSnake", "namePascal", "name", "date"];

function getQueryForVars(vars: string[]): string[] {
	return vars.filter(v => !DEFAULT_VARS.includes(v));
}

async function inquiryForVars(name: string, vars: string[]): Promise<Record<string, string>> {
	return inquirer.prompt([
		{
			type: "input",
			message: "New file name (without extension)?",
			name: "name",
			default: name
		},
		...(vars.map(v => {
			return {
				type: "input",
				message: `Value for '${v}'?`,
				name: v
			};
		}))
	]);
}

function runVars(file: string, vars: Record<string, string>): string {
	return Mustache.render(file, vars);
}

function newFilePath(name: string, extension: string): string {
	return Path.resolve(process.cwd(), name + "." + extension);
}

(async () => {

	const templates = await fetchFiles();
	const template = await inquireFile(templates);
	const {file, extension, rawName} = await readFile(template);
	const vars = parseVariablesFromFile(file);
	const queryableVars = getQueryForVars(vars);
	const varValues = await inquiryForVars(rawName, queryableVars);
	const fileName = varValues["name"];
	const date = (new Date()).toLocaleDateString().toString();
	const output = runVars(file, {
		...varValues,
		name: fileName,
		nameCamel: camelCase(fileName),
		nameSnake: snakeCase(fileName),
		namePascal: pascalCase(fileName),
		date: date
	});

	const newFile = newFilePath(fileName, extension);
	await fsWriteFile(newFile, output);
	console.log("Created: " + newFile);


})().catch(console.error);

// const view = {
// 	title: "Joe",
// 	calc: function () {
// 		return 2 + 4;
// 	}
// };
//
// function getVariablesInMustache(value: string): string[] {
// 	const vars: string[] = [];
// 	const parsedInput = Mustache.parse(value).filter(v => v[0] === "name");
// 	for (const v of parsedInput) if (v[0] === "name") vars.push(v[1]);
// 	return vars;
// }
//
// const input = "{{title}} spends {{calc}}";
//
// const vars = getVariablesInMustache(input);
//
// console.log(vars);
//
// const output = Mustache.render(input, view);
//
// console.log(output);