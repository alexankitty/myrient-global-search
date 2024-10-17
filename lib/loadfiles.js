import { readFile, writeFile } from 'fs/promises';
import fs from 'fs'

export async function parseJsonFile(filePath) {
    try{
        let data = JSON.parse(await readFile(filePath, "utf8"));
        return data
    }
    catch(err){
        console.error(err)
    }
}

export async function saveJsonFile(filePath, fileArr){
    let data = await JSON.stringify(fileArr)
    await writeFile(filePath, data, err => {
            if(err){
                console.error(err)
            }
            else{
                console.log(`Successfully saved file list to ${filePath}.`)
            }
        }
    )
}

export async function fileExists(filePath){
    return fs.existsSync(filePath)
}

export async function fileTime(filePath){
    try{
        return fs.statSync(filePath).mtimeMs
    }
    catch(err){
        console.error(err)
    }
}
    