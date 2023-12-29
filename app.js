var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const fs = require('fs');
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');
const clientID = fs.readFileSync('data/client_id.txt', 'utf8').trim();
const clientSecret = fs.readFileSync('data/client_secret.txt', 'utf8').trim();
const sessionSecret = fs.readFileSync('data/sess_secret.txt', 'utf8').trim();

var indexRouter = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
const session = require('express-session');

app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true
}));

passport.use('orcid', new OAuth2Strategy({
    authorizationURL: 'https://sandbox.orcid.org/oauth/authorize?response_type=code',
    tokenURL: 'https://sandbox.orcid.org/oauth/token',
    clientID: clientID,
    clientSecret: clientSecret,
    callbackURL: "https://credit.phenome.digital/auth/orcid/callback"
},
function(accessToken, refreshToken, user, profile, done) {
    // Store accessToken and ORCID for the user
    // Assuming profile has ORCID id
    return done(null, user);
}));

app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((user, done) => {
    done(null, user);
});


app.use('/', indexRouter);

app.get('/auth/orcid', passport.authenticate('orcid', {
  scope: [ '/authenticate', '/activities/update', '/read-limited' ]
}));

// ORCID callback
app.get('/auth/orcid/callback', 
  passport.authenticate('orcid', { failureRedirect: '/' }),
    function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/view');
});

// Update ORCID profile
/*app.post('/update-orcid-profile', ensureAuthenticated, (req, res) => {
    // Get user data from req.body
    // Update ORCID profile using ORCID API and accessToken
    // You'd likely want to use a package like `axios` or `node-fetch` to make HTTP requests
});*/

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/auth/orcid');
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
