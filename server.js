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
  fuzzy: 0.2,
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
  await FileHandler.saveJsonFile(fileListPath, fileList);
  fileCount = fileList.length;
  if (typeof search !== "undefined") {
    await search.createIndex(fileList, searchFields); //recreate the search index
    //fileList = []
  }
  crawlTime = await FileHandler.fileTime(fileListPath);
  console.log(`Finished updating file list. ${fileCount} found.`);
}

function buildOptions(page, options) {
  return { page: page, ...options, ...defaultOptions };
}

if (
  process.env.FORCE_FILE_REBUILD == "1" ||
  !FileHandler.fileExists(fileListPath) ||
  FileOlderThan(fileListPath, "1w")
) {
  await getFilesJob();
} else {
  fileList = await FileHandler.parseJsonFile(fileListPath);
  fileCount = fileList.length;
}

search = new Searcher(fileList, searchFields);

let defaultOptions = {
  crawlTime: crawlTime,
  queryCount: queryCount,
  fileCount: fileCount
};

let app = express();
let server = http.createServer(app);
app.use(sanitize.middleware);
app.set("view engine", "ejs");

app.get("/", function (req, res) {
  let page = "search";
  res.render(indexPage, buildOptions(page));
});

app.get("/search", async function (req, res) {
  let query = req.query.q ? req.query.q : "";
  let settings = {}
  try{
    settings = req.query.s ? JSON.parse(atob(req.query.s)) : defaultSettings;
  }
  catch{
    debugPrint('Search settings corrupt, forcing default.')
    settings = defaultSettings
  }
  for(let key in defaultSettings){
    let failed = false
    if(typeof settings[key] != 'undefined'){
      if(typeof settings[key] != typeof defaultSettings[key]){
        debugPrint('Search settings corrupt, forcing default.')
        failed = true
        break
      }
    }
    if(failed){
      settings = defaultSettings
    }
  }
  if (settings.combineWith != 'AND') {
    delete settings.combineWith; //remove if unset to avoid crashing
  }
  let results = await search.findAllMatches(query, settings);
  debugPrint(results)
  let options = {
    query: query,
    results: results,
    indexing: search.indexing,
  };
  let page = "results";
  options = buildOptions(page, options);
  res.render(indexPage, options);
  queryCount += 1;
  FileHandler.writeFile(queryCountFile, String(queryCount));
});

app.get("/lucky", async function (req, res) {
  let settings = req.query.s ? JSON.parse(req.query.s) : defaultSettings;
  let results = await search.findAllMatches(req.query.q, settings);
  debugPrint(results)
  if (results.items.length) {
    res.redirect(results.items[0].path);
  } else {
    const magicNum = Math.floor(Math.random() * fileCount);
    res.redirect(fileList[magicNum].path);
  }
});

app.get("/settings", function (req, res) {
  let options = { defaultSettings: defaultSettings };
  let page = "settings";
  options = buildOptions(page, options);
  res.render(indexPage, options);
});

server.listen(process.env.PORT, process.env.BIND_ADDRESS);
server.on("listening", function () {
  console.log(
    "Server started on %s:%s.",
    server.address().address,
    server.address().port
  );
});
console.log(`Loaded ${fileCount} known files.`);

cron.schedule("0 0 0 * * *", getFilesJob);
