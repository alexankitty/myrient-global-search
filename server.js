import getAllFiles from './lib/dircrawl.js'
import {parseJsonFile, saveJsonFile, fileExists} from './lib/loadfiles.js'
import Searcher from './lib/search.js'
import cron from 'node-cron'
import FileOlderThan from 'file-older-than'
import 'dotenv/config'
import express from 'express'
import http from 'http'
import sanitize from 'sanitize'

var fileListPath = './filelist.json'
var categoryListPath = './lib/categories.json'
var categoryList = await parseJsonFile(categoryListPath)
var fileList = []

async function getFilesJob(){
  console.log('Updating the file list.')
  fileList = await getAllFiles(categoryList)
  saveJsonFile(fileListPath, fileList)
  console.log(`Finished updating file list. ${fileList.length} found.`)
}

if(process.env.FORCE_FILE_REBUILD == "1" || !fileExists(fileListPath) || FileOlderThan(fileListPath, '1d')){
  await getFilesJob()
}
else{
  fileList = await parseJsonFile(fileListPath)
}

var search = new Searcher(fileList)

var app = express();
var server = http.createServer(app);
app.use(sanitize.middleware)
app.set('view engine', 'ejs')

app.get('/', function(req, res) {
  res.render('pages/index', {
    page: 'search'
  })  
})

app.get('/search', function(req, res) {
  let results = search.findAllMatches(req.query.q)
  if(process.env.DEBUG == "1"){
    console.log(results)
  }
  res.render('pages/index', {
    page: 'results',
    query: req.query.q,
    results: results
  })  
})

server.listen(process.env.PORT, process.env.BIND_ADDRESS)
server.on('listening', function() {
    console.log('Server started on %s:%s.', server.address().address, server.address().port)
})
console.log(`Loaded ${fileList.length} known files.`)

cron.schedule('0 0 0 * * *', getFilesJob)