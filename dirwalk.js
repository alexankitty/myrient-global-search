async function getAllFiles(){
    const url = 'https://myrient.erista.me/files/'
    let parents = await getFilesAndFolders(url)
    let dirWork = splitFilesAndFolders(parents)
    let files = dirWork.files
    let dirs = dirWork.directories
    while(dirs.length > 0) {
        console.log(`Working on: ${dirs[0].name}`)
        let results = await getFilesAndFolders(dirs[0].path, dirs[0].name)
        let working = splitFilesAndFolders(results)
        if(working.files.length > 0) files.push(...working.files)
        if(working.directories.length > 0) dirs.push(...working.directories)
        dirs.shift()
        console.log(`Directories Remaining: ${dirs.length}, Files Found: ${files.length}`)
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
            let name = fileList[x].querySelector('.link').innerText.trim()
            let size = fileList[x].querySelector('.size').innerText.trim()
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