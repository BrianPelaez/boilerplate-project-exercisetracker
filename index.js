const express = require("express");
const mongoose = require("mongoose");

const app = express();
const cors = require("cors");
require("dotenv").config();

// Import Mongo DB Atlas models
const User = require("./models/user");
const Exercise = require("./models/exercise");

// Mount the body parser as middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect Mongo DB Atlas
mongoose.connect(process.env.DB_URI, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

// Enable cors for FCC to test the application
app.use(cors());

// Mount the middleware to serve the style sheets in the public folder
app.use(express.static("public"));

// Print to the console information about each request made
app.use((req, res, next) => {
  console.log(
    "method: " + req.method + "  |  path: " + req.path + "  |  IP - " + req.ip
  );
  next();
});

/**
 * ****************************
 * ROUTES - GET & POST requests
 * ****************************
 */

// PATH / (root)
// GET: Display the index page for
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app
  .route("/api/users")
  .get((req, res) => {
    User.find({}, (error, data) => {
      //console.log(data);
      res.json(data);
    });
  })
  .post((req, res) => {
    
    const serachUser = req.body.username;

    User.findOne({ username: serachUser }, (error, data) => {
      if (error) {
        res.send("Username Desconocido ");
        return console.log(error);
      }

      if (!data) {
        
        const newUser = new User({
          username: serachUser,
        });

        // Guardo el usuario
        newUser.save((error, data) => {
          if (error) return console.log(error);
          
          const reducedData = {
            username: data.username,
            _id: data._id,
          };
          res.json(reducedData);
          console.log(reducedData);
        });
      } else {
        // Si el usuario existe envia un msj 
        res.send(`Username ${serachUser} ya existe.`);
        console.log(`Username ${serachUser} ya existe.`);
      }
    });
  });

// PATH /api/users/:_id/exercises

app.post("/api/users/:_id/exercises", (req, res) => {

  const userID = req.body[":_id"] || req.params._id;
  const descriptionEntered = req.body.description;
  const durationEntered = req.body.duration;
  const dateEntered = req.body.date;


  //console.log(userID, descriptionEntered, durationEntered, dateEntered);

  // Chequeo de datos
  if (!userID) {
    res.json("Path `userID` is required.");
    return;
  }
  if (!descriptionEntered) {
    res.json("Path `description` is required.");
    return;
  }
  if (!durationEntered) {
    res.json("Path `duration` is required.");
    return;
  }

  // Checkeo si el user ID existe como usuario
  User.findOne({ _id: userID }, (error, data) => {
    if (error) {
      res.json("Usuario Inválido");
      return console.log(error);
    }
    if (!data) {
      res.json("Usuario desconocido");
      return;
    } else {
      //console.log(data);
      const usernameMatch = data.username;
      let userFound = new User({_id: data._id, username: data.username})

      // Creo un obj de ejercicio
      const newExercise = new Exercise({
        username: usernameMatch,
        description: descriptionEntered,
        duration: durationEntered,
      });

      // Seteo la fecha
      if (dateEntered) {
        newExercise.date = dateEntered;
      }

      // Guardo el ejercicio
      newExercise.save((error, data) => {
        if (error) return console.log(error);

        //console.log(data);

        // Creo el JSON de respuesta
        userFound = {
          _id: userFound._id,
          username: userFound.username,
          date: data.date.toDateString(),
          duration: data.duration,
          description: data.description,
        };

        
        res.json(userFound);
      });
    }
  });
});

// PATH /api/users/:_id/logs?[from][&to][&limit]
app.get("/api/users/:_id/logs", (req, res) => {
  const id = req.body["_id"] || req.params._id;
  var fromDate = req.query.from;
  var toDate = req.query.to;
  var limit = req.query.limit;

  //console.log(id, fromDate, toDate, limit);

  // Validador de parametros
  if (fromDate) {
    fromDate = new Date(fromDate);
    if (fromDate == "Invalid Date") {
      res.json("Fecha inválida");
      return;
    }
  }

  if (toDate) {
    toDate = new Date(toDate);
    if (toDate == "Invalid Date") {
      res.json("Fecha inválida");
      return;
    }
  }

  if (limit) {
    limit = new Number(limit);
    if (isNaN(limit)) {
      res.json("Límite inválido");
      return;
    }
  }

  // GET USER
  User.findOne({ _id: id }, (error, data) => {
    if (error) {
      res.json("User ID Inválido");
      return console.log(error);
    }
    if (!data) {
      res.json("User ID Inválido");
    } else {
      // Inicio el obj a devolver
      const usernameFound = data.username;
      var objToReturn = { _id: id, username: usernameFound };

      // Filtros
      var findFilter = { username: usernameFound };
      var dateFilter = {};

      // Agrego las KEYS al obj si esta disponible
      if (fromDate) {
        objToReturn["from"] = fromDate.toDateString();
        dateFilter["$gte"] = fromDate;
        if (toDate) {
          objToReturn["to"] = toDate.toDateString();
          dateFilter["$lt"] = toDate;
        } else {
          dateFilter["$lt"] = Date.now();
        }
      }

      if (toDate) {
        objToReturn["to"] = toDate.toDateString();
        dateFilter["$lt"] = toDate;
        dateFilter["$gte"] = new Date("1960-01-01");
      }

      // Aplico filtro si una fecha es dada
      if (toDate || fromDate) {
        findFilter.date = dateFilter;
      }

      // console.log(findFilter);
      // console.log(dateFilter);

      // Agrego el contador
      Exercise.count(findFilter, (error, data) => {
        if (error) {
          res.json("Fecha Inválida");
          return console.log(error);
        }
        // Agrego el countador
        var count = data;
        if (limit && limit < count) {
          count = limit;
        }
        objToReturn["count"] = count;

        // Busco los ejercicios y anexo los logs
        Exercise.find(findFilter, (error, data) => {
          if (error) return console.log(error);

          // console.log(data);

          var logArray = [];
          var objectSubset = {};
          var count = 0;

          // Itero los datos del array
          data.forEach((val) => {
            count += 1;
            if (!limit || count <= limit) {
              objectSubset = {};
              objectSubset.description = val.description;
              objectSubset.duration = val.duration;
              objectSubset.date = val.date.toDateString();
              //console.log(objectSubset);
              logArray.push(objectSubset);
            }
          });

          // Agrego la key LOG con los datos encontrados
          objToReturn["log"] = logArray;

          // Retorno el JSON
          res.json(objToReturn);
        });
      });
    }
  });
});



// Listen on the proper port to connect to the server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
