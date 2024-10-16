import fetch from 'node-fetch'
import jsdom from "jsdom"
import innertext from 'innertext'
const { JSDOM } = jsdom
global.DOMParser = new JSDOM().window.DOMParser


export default async function getAllFiles(){
    const url = 'https://myrient.erista.me/files/'
    let parents = await getFilesAndFolders(url)
    let dirWork = splitFilesAndFolders(parents)
    let files = dirWork.files
    let dirs = dirWork.directories
    while(dirs.length > 0) {
        if(process.env.DEBUG == '1'){
            console.log(`Working on: ${dirs[0].name}`)
        }
        let results = await getFilesAndFolders(dirs[0].path, dirs[0].name)
        let working = splitFilesAndFolders(results)
        if(working.files.length > 0) files.push(...working.files)
        if(working.directories.length > 0) dirs.push(...working.directories)
        dirs.shift()
        let dirStatus = `Directories Remaining: ${dirs.length}, Files Found: ${files.length}`
        if(process.env.DEBUG == '1'){
            console.log(dirStatus)
        }
        else{
            singleLineStatus(dirStatus)
        }
    }
    return files
}

async function getFilesAndFolders(url, base = ""){
    return fetch(url)
    .then(response => {
        return response.text()
    })
    .then(async html => {
        let fileArray = []
        const parser = new DOMParser()
        const fileHtml = parser.parseFromString(html, "text/html")
        const fileList = fileHtml.getElementById('list').rows
        for(let x = 1; x < fileList.length; x++){
            let path = fileList[x].querySelector('.link').firstChild.getAttribute('href')
            let name = innertext(fileList[x].querySelector('.link').innerHTML).trim()
            let size = innertext(fileList[x].querySelector('.size').innerHTML).trim()
            fileArray.push({
                name: base + name,
                filename: name,
                foldername: base,
                path: url + path,
                size: size,
                date: fileList[x].querySelector('.date').innerText,
            })
        }
        return fileArray
    })
    .catch(error => {
        console.error(`Failed to fetch page: ${url}`, error)
    })
}

function splitFilesAndFolders(dirArray){
    let directories = []
    let files = []
    //first item is always the parent directory
    for(let x = 1; x < dirArray.length; x++){
        if(dirArray[x].size == '-'){
            directories.push(dirArray[x])
        }
        else{
            files.push(dirArray[x])
        }
    }
    return{
        directories: directories,
        files: files
    }
}

function singleLineStatus(str){
    if(process.stdout.isTTY){
        process.stdout.clearLine(0)
        process.stdout.cursorTo(0)
        process.stdout.write(str + "\n")
    }
    else{
        console.log(str)
    }
}