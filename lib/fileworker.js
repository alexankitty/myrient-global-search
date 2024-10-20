import innertext from 'innertext'
import HTMLParse from 'node-html-parser'

export async function getTableRows(data){
    return await fetch(data.url)
    .then(response => {
        return response.text()
    })
    .then(async html => {
        const fileHtml = HTMLParse.parse(html)
        const rows = fileHtml.getElementById('list').getElementsByTagName('tr')
        let htmlCollection = []
        for(let x = 0; x < rows.length; x++){
            htmlCollection.push(rows[x].innerHTML)
        }
        return {
            html: htmlCollection,
            base: data.base,
            url: data.url
        }
    })
    .catch(error => {
        console.error(`Failed to fetch page: ${data.url}`, error)
    })
}

export async function parseOutFile(data) {
    let file = HTMLParse.parse(data.file)
    if(file.querySelector('.link') == null) return //invalid don't need it
    let path = file.querySelector('.link').firstChild.getAttribute('href')
    if(path == '../') return
    let name = innertext(file.querySelector('.link').innerHTML).trim()
    let fullName = data.base + name
    let size = innertext(file.querySelector('.size').innerHTML).trim()
    let processedFile = {
        filename: name,
        name: fullName,
        path: data.url + path,
        size: size,
        category: findCategory(fullName, data.catList),
        type: findType(fullName, data.catList),
        date: innertext(file.querySelector('.date').innerHTML).trim(),
        region: findRegion(fullName, data.catList)
    }
    return processedFile
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
        for(let cat in catList.Categories["Others"]){
            let catString = catList.Categories["Others"][cat]
            if(lowerStr.includes(catString.toLowerCase())){
                if(catString.length > catLength){
                    foundCat = catString
                    catLength = catString.length
                }
            }
        }
        if(!foundCat){
            foundCat = "Others"
        }
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