import getAllFiles from './lib/dirwalk.js'
import 'dotenv/config'
import express from 'express'
var app = express();
app.set('view engine', 'ejs')

app.get('/', function(req, res) {
  res.render('pages/index')  
})

app.listen(process.env.PORT)
console.log(`Listening on ${process.env.PORT}.`)