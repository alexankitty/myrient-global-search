import { readFile } from 'fs/promises';

export default async function parseJsonFile(filePath) {
    let data = JSON.parse(await readFile(filePath, "utf8"));
    return data
}