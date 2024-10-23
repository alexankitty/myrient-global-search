import { getTableRows, parseOutFile } from './fileworker.js'
import {Piscina, FixedQueue} from 'piscina'
import { resolve } from 'path'
import debugPrint from './debugprint.js';

let piscina = new Piscina({
    filename: resolve('./lib', "fileworker.js"),
    taskQueue: new FixedQueue(),
    });

export default async function getAllFiles(catList){
    var startTime = process.hrtime();
    const url = 'https://myrient.erista.me/files/'
    let parentRows = await getTableRows({url: url, base: ''})
    let parents = []
    for(let x = 0; x < parentRows.html.length; x++){
        parents.push(await parseOutFile({file: parentRows.html[x], base: '', url: url, catList: catList}))
    }
    let dirWork = splitFilesAndFolders(parents)
    let files = dirWork.files
    let dirs = dirWork.directories
    let fetchTasks = []
    let resolvedFetchTasks = []
    let parseTasks = []
    while(dirs.length > 0 || fetchTasks.length > 0 || parseTasks.length > 0 || resolvedFetchTasks.length > 0) {
        let dirStatus = ''
        if(dirs.length > 0) {
            debugPrint(`Queueing: ${dirs[0].name}`)
            //add tasks
            fetchTasks.push(piscina.run({url: dirs[0].path, base: dirs[0].name}, {name: 'getTableRows'})
            .catch(err => {console.error(err)})
            )           
            dirs.shift()
        }
        //push completed fetch tasks to parse
        if(dirs.length == 0 && (fetchTasks.length > 0 || resolvedFetchTasks.length > 0)){
            debugPrint(`Resolving ${fetchTasks.length} fetch tasks.`)
            let settledTasks = await Promise.all(fetchTasks)
            resolvedFetchTasks.push(...settledTasks)
            while(resolvedFetchTasks.length > 0){
                if(piscina.queueSize >= 1000) { //jump out if we have a ton of tasks scheduled.
                    break;
                }
                let completedTask = resolvedFetchTasks[0]
                if(!completedTask) {
                    console.log("Myrient crawl failed, try again later.")
                    return
                }
                for(let y = 0; y < completedTask.html.length; y++){
                    parseTasks.push(piscina.run({
                        file: completedTask.html[y],
                        base: completedTask.base,
                        url: completedTask.url,
                        catList: catList },
                        { name: 'parseOutFile'}
                    ))
                }
                resolvedFetchTasks.shift()
            }
            
            fetchTasks = [] //purge
            dirStatus = `Directories Remaining: ${dirs.length}, Files Found: ${files.length}`
        }
        //resolve parse tasks to go through fetch tasks
        if(dirs.length == 0 && parseTasks.length > 0){
            if(process.env.DEBUG == '1'){
                console.log(`Resolving ${parseTasks.length} parse tasks.`)
            }
            let settledTasks = await Promise.all(parseTasks)
            let working = splitFilesAndFolders(settledTasks)
            if(working.files.length > 0) {files.push(...working.files)}
            if(working.directories.length > 0) {dirs.push(...working.directories)}
            parseTasks = [] //purge
            dirStatus = `Directories Remaining: ${dirs.length}, Files Found: ${files.length}`
        }
        if(dirStatus){
            if(process.env.DEBUG == '1'){
                console.log(dirStatus)
            }
            else{
                singleLineStatus(dirStatus)
            }
        }
    }
    //add IDs after and strip full file name
    let id = 0;
    for(let file in files){
        files[file].id  = id++
        delete files[file].name
    }
    var elapsed = parseHrtimeToSeconds(process.hrtime(startTime));
    var m = Math.floor(elapsed / 60)
    var s = Math.floor(elapsed % 60)
    console.log(`\nFinished crawling Myrient in ${m}m${s}s.`)
    await piscina.close()
    return files
}

function splitFilesAndFolders(dirArray){
    let directories = []
    let files = []
    //first item is always the parent directory
    for(let x = 1; x < dirArray.length; x++){
        if(typeof dirArray[x] == 'undefined') continue
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
        process.stdout.write(str)
    }
    else{
        console.log(str)
    }
}

function parseHrtimeToSeconds(hrtime){
    var seconds = (hrtime[0] + (hrtime[1] / 1e9)).toFixed(3);
    return seconds;
}

