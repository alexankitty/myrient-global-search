import fetch from 'node-fetch'
import jsdom from "jsdom"
import innertext from 'innertext'
const { JSDOM } = jsdom
global.DOMParser = new JSDOM().window.DOMParser


export default async function getAllFiles(catList){
    const url = 'https://myrient.erista.me/files/'
    let parents = await getFilesAndFolders(url, catList)
    let dirWork = splitFilesAndFolders(parents)
    let files = dirWork.files
    let dirs = dirWork.directories
    while(dirs.length > 0) {
        if(process.env.DEBUG == '1'){
            console.log(`Working on: ${dirs[0].name}`)
        }
        let results = await getFilesAndFolders(dirs[0].path, catList, dirs[0].name)
        let working = splitFilesAndFolders(results)
        if(working.files.length > 0) {files.push(...working.files)}
        if(working.directories.length > 0) {dirs.push(...working.directories)}
        dirs.shift()
        let dirStatus = `Directories Remaining: ${dirs.length}, Files Found: ${files.length}`
        if(process.env.DEBUG == '1'){
            console.log(dirStatus)
        }
        else{
            singleLineStatus(dirStatus)
        }
    }
    //add IDs after
    let id = 0;
    for(let file in files){
        files[file].id  = id++
    }
    return files
}

async function getFilesAndFolders(url, catList, base = ""){
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
                category: findCategory(base + name, catList),
                type: findType(base + name, catList),
                date: innertext(fileList[x].querySelector('.date').innerHTML).trim(),
                region: findRegion(base + name, catList)
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

function findCategory(str, catList){
    let lowerStr = str.toLowerCase()
    let foundCat = ''
    let catLength = 0
    let foundSubCat = ''
    let subCatLength = 0
    for(let cat in catList.Categories){
        if(lowerStr.includes(cat.toLowerCase())){
            if(cat.length > catLength){
                foundCat = cat
                catLength = cat.length
            }
        }
    }
    if(foundCat){
        for(let subCat in catList.Categories[foundCat]){
            let subCatString = catList.Categories[foundCat][subCat] //I will go insane if this is inlined repeatedly
            if(lowerStr.includes(subCatString.toLowerCase())){
                if(subCatString.length > subCatLength){
                    foundSubCat = subCatString
                    subCatLength = subCatString.length
                }
            }
        }
    }
    else{
        return 'Other'
    }
    return `${foundCat} ${foundSubCat}`.trim()
}

function findType(str, catList){
    let lowerStr = str.toLowerCase()
    let foundTypes = ''
    for(let type in catList.Types){
        let typeString = catList.Types[type] //including here
        if(lowerStr.includes(typeString.toLowerCase())){
            foundTypes += `${typeString} `
        }
    }
    return foundTypes.trim()
}

function findRegion(str, catList){
    let lowerStr = str.toLowerCase()
    let foundRegions = ''
    for(let region in catList.Regions){
        let regionString = catList.Regions[region] //including here
        if(lowerStr.includes(regionString.toLowerCase())){
            if(foundRegions){
                foundRegions += `, ${regionString}`
            }
            else{
                foundRegions += `${regionString}`
            }
        }
    }
    if(!foundRegions){
        return "None"
    }
    return foundRegions.trim()
}