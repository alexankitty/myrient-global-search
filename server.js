import getAllFiles from './lib/dircrawl.js'
import {parseJsonFile, saveJsonFile, fileExists, fileTime} from './lib/loadfiles.js'
import Searcher from './lib/search.js'
import cron from 'node-cron'
import FileOlderThan from 'file-older-than'
import 'dotenv/config'
import express from 'express'
import http from 'http'
import sanitize from 'sanitize'

let fileListPath = './filelist.json'
let categoryListPath = './lib/categories.json'
let categoryList = await parseJsonFile(categoryListPath)
//TO DO: add if exist to suppress an error
let crawlTime = await fileTime(fileListPath)

let searchFields = ['filename', 'category', 'type', 'region']

let defaultSettings = {
  boost: {
  },
  combineWith: 'AND',
  fields:  searchFields,
  fuzzy: 0.2,
  prefix: true,
}

//programmatically set the default boosts while reducing overhead when adding another search field
for(let field in searchFields){
  let fieldName = searchFields[field]
  if(searchFields[field] == 'filename'){
    defaultSettings.boost[fieldName] = 2
  }
  else {
    defaultSettings.boost[fieldName] = 1
  }
}

let fileList = []
let search //cheat so we can check before assignment

async function getFilesJob(){
  console.log('Updating the file list.')
  fileList = await getAllFiles(categoryList)
  saveJsonFile(fileListPath, fileList)
  if(typeof search !== 'undefined'){
    search.createIndex(fileList, searchFields) //recreate the search index
  }
  crawlTime = await fileTime(fileListPath)
  console.log(`Finished updating file list. ${fileList.length} found.`)
}

if(process.env.FORCE_FILE_REBUILD == "1" || !fileExists(fileListPath) || FileOlderThan(fileListPath, '1w')){
  await getFilesJob()
}
else{
  fileList = await parseJsonFile(fileListPath)
}

search = new Searcher(fileList, searchFields)

let app = express();
let server = http.createServer(app);
app.use(sanitize.middleware)
app.set('view engine', 'ejs')

app.get('/', function(req, res) {
  res.render('pages/index', {
    page: 'search',
    crawlTime: crawlTime
  })  
})

app.get('/search', async function(req, res) {
  let query = req.query.q ? req.query.q : ''
  let settings = req.query.s ? JSON.parse(atob(req.query.s)) : defaultSettings
  console.log(settings)
  if(!settings.combineWith){
    delete settings.combineWith //remove if unset to avoid crashing
  }
  let results = await search.findAllMatches(query, settings)
  if(process.env.DEBUG == "1"){
    console.log(results)
  }
  res.render('pages/index', {
    page: 'results',
    query: query,
    results: results,
    crawlTime: crawlTime,
    indexing: search.indexing
    })  
})

app.get("/lucky", async function(req, res) {
  let settings = req.query.s ? JSON.parse(req.query.s) : defaultSettings
  let results = await search.findAllMatches(req.query.q, settings)
  if(process.env.DEBUG == "1"){
    console.log(results)
  }
  if(results.items.length){
    res.redirect(results.items[0].path)
  }
  else{
    const magicNum = Math.floor(Math.random() * fileList.length)
    res.redirect(fileList[magicNum].path)
  }
})

app.get("/settings", function(req, res) {
  res.render('pages/index', {
    page: 'settings',
    crawlTime: crawlTime,
    defaultSettings: defaultSettings
  })
})

server.listen(process.env.PORT, process.env.BIND_ADDRESS)
server.on('listening', function() {
    console.log('Server started on %s:%s.', server.address().address, server.address().port)
})
console.log(`Loaded ${fileList.length} known files.`)

cron.schedule('0 0 0 * * *', getFilesJob)