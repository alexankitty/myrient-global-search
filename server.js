import getAllFiles from './lib/dirwalk.js'
import {parseJsonFile, saveJsonFile, fileExists} from './lib/loadfiles.js'
import fuzzySearch from './lib/search.js'
import cron from 'node-cron'
import FileOlderThan from 'file-older-than'
import 'dotenv/config'
import express from 'express'


var fileListPath = './filelist.json'
var fileList = []

async function getFilesJob(){
  console.log('Updating the file list.')
  fileList = await getAllFiles()
  saveJsonFile(fileListPath, fileList)
  console.log(`Finished updating file list. ${fileList.length} found.`)
}

if(!fileExists(fileListPath) || FileOlderThan(fileListPath, '1d')){
  await getFilesJob()
}
else{
  fileList = await parseJsonFile(fileListPath)
}

var app = express();
app.set('view engine', 'ejs')

app.get('/', function(req, res) {
  res.render('pages/index', {
    page: 'search'
  })  
})

app.get('/search', function(req, res) {
  let results = fuzzySearch(fileList, req.query.q)
  if(process.env.DEBUG == "1"){
    console.log(results)
  }
  res.render('pages/index', {
    page: 'results',
    query: req.query.q,
    results: results
  })  
})

app.listen(process.env.PORT)
console.log(`Listening on ${process.env.PORT}.`)
console.log(`Loaded ${fileList.length} known files.`)

cron.schedule('0 0 0 * * *', getFilesJob)