import getAllFiles from './lib/dirwalk.js'
import parseJsonFile from './lib/loadfiles.js'
import fuzzySearch from './lib/search.js'
import 'dotenv/config'
import express from 'express'

var fileList = await parseJsonFile('./filelist.json')

var app = express();
app.set('view engine', 'ejs')

app.get('/', function(req, res) {
  res.render('pages/index', {
    page: 'search'
  })  
})

app.get('/search', function(req, res) {
  let results = fuzzySearch(fileList, req.query.q)
  console.log(results)
  res.render('pages/index', {
    page: 'results',
    query: req.query.q,
    results: results
  })  
})

app.listen(process.env.PORT)
console.log(`Listening on ${process.env.PORT}.`)
console.log(`Loaded ${fileList.length} known files.`)