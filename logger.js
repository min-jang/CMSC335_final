const path = require("path");
const bodyParser = require("body-parser");
const express = require("express");
const portNumber = process.argv[2];
const myPath = path.resolve(__dirname, "templates");
const LogInCollection = require("./mongo")
const session = require('express-session')
const crypto = require('crypto');
require("dotenv").config({
path: path.resolve(__dirname, "credentials/.env"),
});

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const database = process.env.DATABASE;
const collection = process.env.COLLECTION;


const databaseAndCollection = {
  db: database,
  collection: collection,
};

const { MongoClient, ServerApiVersion } = require("mongodb");
const { name } = require("ejs");
async function main() {
  console.log(
    `Web server started and running at http://localhost:${portNumber}`
  );
  console.log("Stop to shut down the server: ");
  process.stdin.setEncoding("utf8");
  process.stdin.on("readable", () => {
    let dataInput = process.stdin.read();
    if (dataInput !== null) {
      let command = dataInput.trim();
      if (command === "stop") {
        console.log("Shutting down the server");
        process.exit(0);
      }
      console.log("Stop to shut down the server: ");
      process.stdin.resume();
    }
  });
  let app = express();
  app.use(bodyParser.urlencoded({ extended: false }));

  const uri = `mongodb+srv://${userName}:${password}@cluster0.ve4q21g.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
  const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverApi: ServerApiVersion.v1,
    });

function searchAPI(value){
  return new Promise((resolve, reject) => {
    const http = require("https");
    let temp = ""
    let array = value.split(" ")
    console.log(array)
    if(array.length > 1){ //if the muscle name is multiple words
      temp = value.replace(" ", "%20")
    } else {
      temp = value
    }
    console.log(temp)
    const options = {
      method: 'GET',
      hostname: 'exerciseapi3.p.rapidapi.com',
      port: null,
      path: `/search/?primaryMuscle=${temp}`,
      headers: {
        'X-RapidAPI-Key': '636aa2905cmshdb977daf0d3d225p19ebeejsn5284fd47212c',
        'X-RapidAPI-Host': 'exerciseapi3.p.rapidapi.com'
      }
    };

    const req = http.request(options, function (res) {
      const chunks = [];

      res.on('data', function (chunk) {
        chunks.push(chunk);
      });

      res.on('end', function () {
        const body = Buffer.concat(chunks);
        const data = JSON.parse(body.toString());
        const table = parseData(data);
        resolve(table);
      });
    });

    req.on("error", function (error) {
      reject(error);
    });

    req.end();
  });
}

function parseData(data){
  let table = ""
  table += "<table border=1> <tr><th>Name of Exercise</th> <th>Force</th> <th>Youtube Link</th></tr>";
  data.forEach(
    (temp) => (table += `<tr> <td>${temp["Name"]}</td> <td>${temp["Force"]}</td> <td><a href="${temp["Youtube link"]}" target="_blank">Watch Video</a></td> </tr>`)
  );
  table += "</table>";
  return table
}

app.use(
  session({
    secret: crypto.randomBytes(64).toString('hex'),
    resave: false,
    saveUninitialized: false
  })
);

app.get('/signup', (req, res) => {
  app.use(express.static(myPath));
  app.set("views", myPath);
  app.set("view engine", "ejs");
  res.render('signup')
}); 

app.post('/signup', async (req, res) => {
  app.use(express.static(myPath));
  app.set("views", myPath);
  app.set("view engine", "ejs");
  const data = {
      name: req.body.name,
      password: req.body.password
  }

  const check = await LogInCollection.findOne({ name: req.body.name })
  if (check != null) {
    if (check.name === req.body.name) {
      res.render("alreadyExists")
    }
    else{
      await LogInCollection.insertMany([data])
      res.status(201).render("index", {
        naming: req.body.name
      });
    }
  }else{
    await LogInCollection.insertMany([data])
    res.status(201).render("index", {
      naming: req.body.name
    });
  }  
});

app.post('/login', async (req, res) => {
  app.use(express.static(myPath));
  app.set("views", myPath);
  app.set("view engine", "ejs");
    try {
        const { name, password } = req.body;
        const user = await LogInCollection.findOne({ name: name });
        if (user.password === password) {
          req.session.username = name; 
          res.status(201).render("index", { naming: `${password}+${name}` })
        }
        else {
            res.render("incorrectPassword")
        }
    }     
    catch (e) {
        res.send("Wrong details")    }
});

app.get("/", (request, response) => {
  app.use(express.static(myPath));
  app.set("views", myPath);
  app.set("view engine", "ejs");
  response.render("login");
  response.end();
});
app.get('/index',(request, response) => {
  app.use(express.static(myPath));
  app.set("views", myPath);
  app.set("view engine", "ejs");
  response.render("index");
  response.end();
});
app.get("/exercise", (request, response) => {
  app.use(express.static(myPath));
  app.set("views", myPath);
  app.set("view engine", "ejs");
  response.render("exercise");
  response.end();
});

app.post("/exercise", async (request, response) => {
  app.use(express.static(myPath));
  app.set("views", myPath);
  app.set("view engine", "ejs");
  try {
    let { muscle } = request.body;
    let table = await searchAPI(muscle); 
    response.render("viewExercises", { table: table });
  } catch (error) {
    console.error(error);
    response.status(500).send("An error occurred");
  }
});

app.get("/exerciseLogger", (request, response) => {
  app.use(express.static(myPath));
  app.set("views", myPath);
  app.set("view engine", "ejs");
  response.render("exerciseLogger", { port: portNumber });
  response.end();
});

app.post("/exerciseLogger", async (request, response) => {
  app.use(express.static(myPath));
  app.set("views", myPath);
  app.set("view engine", "ejs");
  try {
    await client.connect();
    const username = request.session.username;
    console.log(username)
    let { time, exercise, backgroundInformation } = request.body;
    let workout = {
      time: time,
      exercise: exercise,
      backgroundInformation: backgroundInformation,
      date: new Date()
    };
    const filter = { name: username };
    const update = { $push: { workouts: workout } };
    
    await client
        .db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .findOneAndUpdate(filter, update);
    response.render("userWorkout", workout);
  }catch (error) {
    console.error(error);
    response.status(500).send("An error occurred");
  } finally {
    await client.close();
  }
  
  response.end();
});

app.get("/history", async (request, response) => { 
  app.use(express.static(myPath));
  app.set("views", myPath);
  app.set("view engine", "ejs");
  
  const username = request.session.username;
  let result = [];
  try {
    await client.connect();
    const filter = { name: username };
    const cursor = client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .find(filter);

    const arr = await cursor.toArray();
    result = arr;
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
  let table = "";
    table += "<table border=1 class=\"histTable\"> <tr> <th> Date </th> <th> Length of Workout </th> <th> Exercise </th> <th> Background Information </th> </tr>";
    result[0].workouts.forEach((item) => {
      table += `<tr> <td> ${item.date} </td> <td> ${item.time} </td> <td> ${item.exercise} </td> <td> ${item.backgroundInformation} </td> </tr>`;
    });
    table += "</table>";
  response.render("history", {table: table});
  response.end();
});


app.listen(portNumber);
}

main().catch(console.error);
