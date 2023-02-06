require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();
require("dotenv").config();

app.use(cors());
app.use(express.urlencoded());
app.use(express.static("public"));

mongoose
  .connect(process.env.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Conexión a DB"))
  .catch((err) => console.log("Error de conexión"));

const userSchema = new mongoose.Schema({
  username: String,
});

const exerciseSchema = new mongoose.Schema({
  username: String,
  date: Date,
  duration: Number,
  description: String,
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

app.use("/", (req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

app.post("/api/users/", (req, res, done) => {
  const { username } = req.body;
  const newUser = new User({ username });
  newUser.save((err, user) => (err ? done(err) : done(null, user)));
  res.json({ username, _id: newUser._id });
});

app.post("/api/users/:_id/exercises", (req, res) => {
  // Asignamos la data del form
  const userID = req.body[":_id"] || req.params._id;
  const descriptionEntered = req.body.description;
  const durationEntered = req.body.duration;
  const dateEntered = req.body.date;

  console.log(userID, descriptionEntered, durationEntered, dateEntered);

  // Chequeamos que los campos esten llenos
  if (!userID) {
    res.json("Se requiere ID del usuario.");
    return;
  }
  if (!descriptionEntered) {
    res.json("Se requiere descripción");
    return;
  }
  if (!durationEntered) {
    res.json("Se requiere duración.");
    return;
  }

  // Chequeamos si existe el usuario
  User.findOne({ _id: userID }, (error, data) => {
    if (error) {
      res.json("Usuario invalido");
      return console.log(error);
    }
    if (!data) {
      res.json("Usuario desconocido");
      return;
    } else {
      //console.log(data);
      const usernameMatch = data.username;

      // Creamos un nuevo objeto ejercicio
      const newExercise = new Exercise({
        username: usernameMatch,
        description: descriptionEntered,
        duration: durationEntered,
      });

      // Seteamos la fecha al objeto creado.
      if (dateEntered) {
        newExercise.date = dateEntered;
      }

      // Guardamos el nuevo objeto
      newExercise.save((error, data) => {
        if (error) return console.log(error);

        //console.log(data);

        // Creamos el objeto de respuesta
        const exerciseObject = {
          _id: userID,
          username: data.username,
          date: data.date.toDateString(),
          duration: data.duration,
          description: data.description,
        };

        // Enviamos el JSON
        res.json(exerciseObject);
      });
    }
  });
});

app.get("/api/users/:id/logs", (req, res) => {
  const userId = req.params.id;

  if (!userId) return res.json("Usuario requerido");

  User.findOne({ _id: userId }, (err, user) => {
    if (err) return console.log(err);

    //console.log(user);

    Exercise.find({ username: user.username }, (err, exercise) => {
      if (err) return console.log(err);

      //console.log(exercise);
      const resEx = [];
      exercise.map((el) => {
        const json = {
          description: el.description,
          date: el.date,
          duration: el.duration,
        };
        resEx.push(json);
      });
      res.json({
        username: user.username,
        count: exercise.length,
        _id: user._id,
        log: resEx,
      });
    });
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
