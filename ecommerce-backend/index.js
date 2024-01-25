const express = require('express');
const server = express();
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const cookieParser = require('cookie-parser');
const { createProduct } = require('./controller/Product');
const productsRouter = require('./routes/Product');
const categoriesRouter = require('./routes/Categories');
const brandsRouter = require('./routes/Brands');
const usersRouter = require('./routes/Users');
const authRouter = require('./routes/Auth');
const cartRouter = require('./routes/Cart');
const ordersRouter = require('./routes/Order');
const { User } = require('./model/User');
const { isAuth, sanitizeUser, cookieExtractor } = require('./services/common');
const dotenv= require('dotenv');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const promisify = require('promisify');
dotenv.config();
const SECRET_KEY = process.env.JWT_SECRET_KEY;

// uploading destination 
// const uploadMiddleware = multer({dest: 'uploads/'});


// JWT options
const opts = {};
opts.jwtFromRequest = cookieExtractor;
opts.secretOrKey = SECRET_KEY; // TODO: should not be in code;
//middlewares


server.use(express.static('build'))
server.use(cookieParser());
// server.use('/uploads',express.static(__dirname +'/uploads'));
server.use(
  session({
    secret: process.env.SESSION_KEY,
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
  })
);
server.use(passport.authenticate('session'));
server.use(
  cors({
    exposedHeaders: ['X-Total-Count'],
  })
);
server.use(express.json()); // to parse req.body


server.use('/products', isAuth(), productsRouter.router);
// we can also use JWT token for client-only auth
server.use('/categories', isAuth(), categoriesRouter.router);
// server.use('/brands', isAuth(), brandsRouter.router);
server.use('/users',isAuth(), usersRouter.router);
server.use('/auth', authRouter.router);
server.use('/cart',isAuth(), cartRouter.router);
server.use('/orders', isAuth(), ordersRouter.router);
// Passport Strategies
passport.use(
  'local',
  new LocalStrategy(
    {usernameField:'email'},
    async function (email, password, done) {
    // by default passport uses username
    try {
      const user = await User.findOne({ email: email });
      console.log(email, password, user);
      if (!user) {
        return done(null, false, { message: 'invalid credentials' }); // for safety
      }
      crypto.pbkdf2(
        password,
        user.salt,
        310000, 
        32,
        'sha256',
        async function (err, hashedPassword) {
          if (!crypto.timingSafeEqual(user.password, hashedPassword)) {
            return done(null, false, { message: 'invalid credentials' });
          }
          const token = jwt.sign(sanitizeUser(user), SECRET_KEY);
          // console.log("token is ", token);
          
          // this lines sends to serializer
          done(null, {id:user.id, role:user.role}); // this lines sends to serializer
        }
      );
    } catch (err) {
      done(err);
      console.log("error1");
    }
  })
);
passport.use(
  'jwt',
  new JwtStrategy(opts, async function (jwt_payload, done) {
    console.log("jwt payload is",{ jwt_payload });
    try {
      const user = await User.findById(jwt_payload.id);
      if (user) {
        return done(null, sanitizeUser(user)); // this calls serializer
      } else {
        return done(null, false);
      }
    } catch (err) {
      return done(err, false);
    }
  })
);
// this creates session variable req.user on being called from callbacks
passport.serializeUser(function (user, cb) {
  console.log('serialize', user);
  process.nextTick(function () {
    return cb(null, { id: user.id, role: user.role });
  });
});
// this changes session variable req.user when called from authorized request
passport.deserializeUser(function (user, cb) {
  console.log('de-serialize', user);
  process.nextTick(function () {
    return cb(null, user);
  });
});
// main().catch((err) => console.log(err));
// mongoose connection
const mongo_url = process.env.MONGODB_URL;
mongoose
  .connect(mongo_url, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error(err));

server.listen(8080, () =>{
  console.log('server started')
})
// mongodb+srv://factwiths:ecommerce@cluster0.vakf1ft.mongodb.net/?retryWrites=true&w=majority