import { readFile, writeFile } from "fs/promises";
import fs from "fs";

export default class FileHandler {
  static async parseJsonFile(filePath) {
    try {
      let data = await JSON.parse(await readFile(filePath, "utf8"));
      return data;
    } catch (err) {
      console.error(err);
    }
  }

  static async saveJsonFile(filePath, fileArr) {
    let data = await JSON.stringify(fileArr);
    await writeFile(filePath, data, (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log(`Successfully saved file list to ${filePath}.`);
      }
    });
  }

  static fileExists(filePath) {
    return fs.existsSync(filePath);
  }

  static async fileTime(filePath) {
    try {
      return fs.statSync(filePath).mtimeMs;
    } catch (err) {
      console.error(err);
    }
  }

  static async readFile(filePath) {
    try {
      return await readFile(filePath, "utf8");
    } catch (err) {
      console.error(err);
    }
  }

  static async writeFile(filePath, data) {
    await writeFile(filePath, data, (err) => {
      if (err) {
        console.error(err);
      }
    });
  }
}
