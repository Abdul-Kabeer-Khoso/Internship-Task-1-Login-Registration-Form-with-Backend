const express = require("express");
const app = express();
const port = 8080;
const flash = require("connect-flash");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const path = require("path");
const util = require("util");
const User = require("./models/user");

// MongoDB Connection
const dbUrl = "mongodb://127.0.0.1:27017/internship-1";
mongoose
  .connect(dbUrl)
  .then(() => console.log("DB Connection Successful"))
  .catch((err) => console.error("DB Connection Failed:", err));

// View & Static File Setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use("/public", express.static(path.join(__dirname, "public")));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session & Passport Setup
app.use(
  session({
    secret: "mysecret",
    resave: false,
    saveUninitialized: false, // better for production
  })
);

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy({ usernameField: "email" }, User.authenticate())
);

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

// Routes
app.get("/", (req, res) => res.render("LoginForm.ejs"));

app.get("/signup", (req, res) => res.render("SignupForm.ejs"));

app.get("/login", (req, res) => res.render("LoginForm.ejs"));

app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user) => {
    if (err) {
      req.flash("error", "Something went wrong");
      return next(err);
    }
    if (!user) {
      req.flash("error", "Invalid email or password");
      return res.redirect("/login");
    }

    req.logIn(user, (err) => {
      if (err) {
        req.flash("error", "Login failed");
        return next(err);
      }

      req.flash("success", `Welcome back ${user.displayName}`);
      return res.redirect("/dashboard");
    });
  })(req, res, next);
});

app.post("/signup", async (req, res) => {
  const { userName, email, password } = req.body;

  try {
    const user = new User({
      email: email,
      username: email,
      displayName: userName,
    });
    const registeredUser = await User.register(user, password);

    const login = util.promisify(req.login.bind(req));
    await login(registeredUser);

    req.flash("success", "User registered successfully");

    console.log("User registered and logged in successfully");
    res.redirect("/dashboard");
  } catch (err) {
    req.flash("error", err.message);
    console.error("Signup Error:", err);
    res.status(500).send("Signup failed: " + err.message);
  }
});

app.get("/dashboard", (req, res) => {
  if (req.isAuthenticated()) {
    req.flash("success", "Welcome back " + req.user.displayName);
    res.render("Dashboard.ejs", { user: req.user });
  } else {
    req.flash("error", "User must be login");
    res.redirect("/login");
  }
});

app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return req.flash("error", err.message);
    }
    req.flash("success", "You are logged out");
    res.redirect("/login");
  });
});

// Start Server
app.listen(port, () => {
  console.log("App is listening on port " + port);
});
