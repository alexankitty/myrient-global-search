import getAllFiles from "./lib/dircrawl.js";
import FileHandler from "./lib/filehandler.js";
import Searcher from "./lib/search.js";
import cron from "node-cron";
import FileOlderThan from "file-older-than";
import "dotenv/config";
import express from "express";
import http from "http";
import sanitize from "sanitize";
import debugPrint from "./lib/debugprint.js";
import compression from "compression";  
import { url } from "inspector";

let fileListPath = "./filelist.json";
let queryCountFile = "./queries.txt";
let categoryListPath = "./lib/categories.json";
let categoryList = await FileHandler.parseJsonFile(categoryListPath);
let crawlTime = 0;
let queryCount = 0;
let fileCount = 0;
let indexPage = "pages/index";
if (FileHandler.fileExists(fileListPath)) {
  crawlTime = await FileHandler.fileTime(fileListPath);
}
if (FileHandler.fileExists(queryCountFile)) {
  queryCount = parseInt(await FileHandler.readFile(queryCountFile));
}

let searchFields = ["filename", "category", "type", "region"];

let defaultSettings = {
  boost: {},
  combineWith: "AND",
  fields: searchFields,
  fuzzy: 0,
  prefix: true,
};

//programmatically set the default boosts while reducing overhead when adding another search field
for (let field in searchFields) {
  let fieldName = searchFields[field];
  if (searchFields[field] == "filename") {
    defaultSettings.boost[fieldName] = 2;
  } else {
    defaultSettings.boost[fieldName] = 1;
  }
}

let fileList = [];
let search; //cheat so we can check before assignment

async function getFilesJob() {
  console.log("Updating the file list.");
  fileList = await getAllFiles(categoryList);
  if(!fileList){
    if(typeof search == "undefined"){
      //fall back to loading the list if it exists
      await loadFileList()
    }
    return
  }
  await FileHandler.saveJsonFile(fileListPath, fileList);
  fileCount = fileList.length;
  if (typeof search == "undefined") {
    search = new Searcher(searchFields);
    await search.createIndex(fileList)
  } else {
    await search.updateIndex(fileList);
  }
  fileList = [];
  crawlTime = await FileHandler.fileTime(fileListPath);
  console.log(`Finished updating file list. ${fileCount} found.`);
}

function buildOptions(page, options) {
  return { page: page, ...options, ...defaultOptions };
}

async function loadFileList(){
  fileList = await FileHandler.parseJsonFile(fileListPath);
  fileCount = fileList.length;
  search = new Searcher(searchFields);
  await search.createIndex(fileList)
  fileList = [];
}

if (
  process.env.FORCE_FILE_REBUILD == "1" ||
  !FileHandler.fileExists(fileListPath) ||
  FileOlderThan(fileListPath, "1w")
) {
  await getFilesJob();
} else {
  await loadFileList()
}

let defaultOptions = {
  crawlTime: crawlTime,
  queryCount: queryCount,
  fileCount: fileCount,
  termCount: search.miniSearch.termCount
};

function updateDefaults(){
  defaultOptions.crawlTime = crawlTime
  defaultOptions.queryCount = queryCount
  defaultOptions.fileCount = fileCount
  defaultOptions.termCount = search.miniSearch.termCount
}

let app = express();
let server = http.createServer(app);
app.use(sanitize.middleware);
app.use(compression())
app.use(express.json())
app.set("view engine", "ejs");    

app.get("/", function (req, res) {
  let page = "search";
  res.render(indexPage, buildOptions(page));
});

app.get("/search", async function (req, res) {
  let query = req.query.q ? req.query.q : "";
  let pageNum = parseInt(req.query.p)
  let urlPrefix = encodeURI(`/search?s=${req.query.s}&q=${req.query.q}&p=`)
  pageNum = pageNum ? pageNum : 1
  let settings = {};
  try {
    settings = req.query.s ? JSON.parse(atob(req.query.s)) : defaultSettings;
  } catch {
    debugPrint("Search settings corrupt, forcing default.");
    settings = defaultSettings;
  }
  for (let key in defaultSettings) {
    let failed = false;
    if (typeof settings[key] != "undefined") {
      if (typeof settings[key] != typeof defaultSettings[key]) {
        debugPrint("Search settings corrupt, forcing default.");
        failed = true;
        break;
      }
    }
    if (failed) {
      settings = defaultSettings;
    }
  }
  if (settings.combineWith != "AND") {
    delete settings.combineWith; //remove if unset to avoid crashing
  }
  let results = await search.findAllMatches(query, settings);
  debugPrint(results);
  if(results.items.length && pageNum == 1){
    queryCount += 1;
    FileHandler.writeFile(queryCountFile, String(queryCount));
    updateDefaults()
  }
  let options = {
    query: query,
    results: results,
    pageNum: pageNum,
    indexing: search.indexing,
    urlPrefix: urlPrefix
  };
  let page = "results";
  options = buildOptions(page, options);
  res.render(indexPage, options);

});

app.get("/lucky", async function (req, res) {
  let results = [];
  if (req.query.q) {
    let settings = req.query.s ? JSON.parse(req.query.s) : defaultSettings;
    results = await search.findAllMatches(req.query.q, settings);
    debugPrint(results);
  }
  if (results.length) {
    res.redirect(results.items[0].path);
  } else {
    const magicNum = Math.floor(Math.random() * search.getIndexSize());
    const luckyPath = search.findIndex(magicNum).path;
    debugPrint(`${magicNum}: ${luckyPath}`);
    res.redirect(luckyPath);
  }
  queryCount += 1;
  FileHandler.writeFile(queryCountFile, String(queryCount));
  updateDefaults()
});

app.get("/settings", function (req, res) {
  let options = { defaultSettings: defaultSettings };
  let page = "settings";
  options = buildOptions(page, options);
  res.render(indexPage, options);
});

app.post("/suggest", function(req, res){
  if(!req.body){
    return
  }
  if(typeof req.body.query == 'undefined'){
    return
  }
  let suggestions = search.getSuggestions(req.body.query)
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ suggestions }));
})

server.listen(process.env.PORT, process.env.BIND_ADDRESS);
server.on("listening", function () {
  console.log(
    "Server started on %s:%s.",
    server.address().address,
    server.address().port
  );
});
console.log(`Loaded ${fileCount} known files.`);

cron.schedule("0 30 2 * * *", getFilesJob);
