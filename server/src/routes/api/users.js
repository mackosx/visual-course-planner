const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const userChange = require('../../models/User');

router.post('/:id/changePassword', (req, res) => {
  const UserId = req.params.id;
  userChange.changePassword(UserId, (err, data) => {
    if (err == null) {
      res.send(data);
    } else {
      console.error("Couldn't change password");
    }
  });
});

router.post('/:id/updateUserInfo', (req, res) => {
  const UserId = req.params.id;
  userChange.updateUser(UserId, (err, data) => {
    if (err == null) {
      res.send(data);
    } else {
      console.error("Couldn't change info");
    }
  });
});

module.exports = router;
const bcrypt = require('bcryptjs');
const expressValidator = require('express-validator');
const passport = require('passport');


router.use(expressValidator());

//user model

const user = new User();

/**
 * @route POST api/users/signup
 * @desc Insert a new user into the database
 * @access Private
 */ 

router.post('/signup', async (req, res) => {
  console.log(req.body);

  const email = req.body.email;
  const password = req.body.password;

  //server side validation

  req.checkBody('fName', 'Name is required').notEmpty();
  req.checkBody('lName', 'Name is required').notEmpty();
  req.checkBody('email', 'Email is required').notEmpty();
  req.checkBody('email', 'Email is not valid').isEmail();
  req.checkBody('password', 'Password is required').notEmpty();
  req.checkBody('confirmPassword', 'Passwords do not match').equals(req.body.password);

  let errors = req.validationErrors();
  if (errors) {
    console.log(errors);
    res.status(500).send(errors);

  } else {
        
    const existUser = await user.checkUser(email);
        
    if(existUser === true){

      res.status(500).send("User already exists. Did not create user.");

    }else{

      bcrypt.genSalt(10, function(err, salt){
        bcrypt.hash(password, salt, async function(err, hash){
          if(err){
            console.log(err);
          }

          const hashPassword = hash;
          var newUser = {
                        
            email: req.body.email,
            password: hashPassword,
            firstname: req.body.fName,
            lastname: req.body.lName,
            isAdmin: false,
            standing: 0
                
          };
          
          try{
            await user.insertUser(newUser);
            res.status(200).send("New user was created.");
          }
          catch(err) {
            res.status(500).send("User was not created. Error with db." + err);
          }

        });
      });
    }
  }
});


/**
 * @route POST api/users/login
 * @desc authenticate a user
 * @access Private
 */ 

router.post('/login', (req, res, next) => {
  console.log('here now!');
  console.log(req.body);
  passport.authenticate('local', (err, user, info) => {
    console.log("info", info);
    if (err) {
      console.error(err);
    }
    res.send({...info, user});
  })(req, res, next);
  
});

/**
 * @route POST api/users/coursehistory
 * @desc Insert previous courses taken by user into database
 * @access Private
 */ 

router.post('/:id/coursehistory', async (req, res) => {
  if (Object.keys(req.body).length === 0){
    console.log('no courses selected, nothing stored');
    res.status(200).send('no course history selected');
  } else {
    let userId = req.params.id;
    let courses = [];
    for (let key in req.body) {
      courses.push({
        uid: userId,
        cid: req.body[key]
      });
    }
    console.log(courses);
    for (let i in courses) {
      console.log(courses[i]);
      await user.insertCourse(courses[i]);
    }
    res.status(200).send('course(s) inserted for user');
  }
});

/**
 * @route GET api/users/coursehistory
 * @desc Retreive all user course history
 * @access Private
 */ 

router.get('/:id/coursehistory', async (req, res) => {
  let userId = 1;

  if (await user.getCourses(userId) <= 0){
    console.log('no course history found for user');
    res.status(200).send('no course history found for user');
  } else {
    const courses = await user.getCourses(userId); 
    console.log(courses[0]);
    res.status(200).send({message: "fetching all user course history", course: courses});
  }
});

/**
 * @route GET api/users/userinfo
 * @desc Retreive all user information
 * @access Private
 */ 

router.get('/:id/userinfo', async (req, res) => {
  let userId = req.params.id;
  const userInfo = await user.getUserById(userId); 
  if (userInfo === undefined){
    console.log('no user info found');
    res.status(200).send('no info found for user');
  } else {
    console.log(userInfo);
    res.status(200).send({message: "fetching all user info", user: userInfo});
  }
});

/**
 * @route GET api/users/useremail
 * @desc Retreive status if user exists with email
 * @access Private
 */ 

router.get('/:email/useremail', async (req, res) => {
  let uEmail = req.params.email;
  const userEmail = await user.checkUser(uEmail); 
  if (userEmail === true){
    console.log('User found!');
    res.status(200).send('User found!');
  } else {
    console.log('no user found with email: ' + uEmail);
    res.status(200).send('no user found with email: ' + uEmail);
  }
});


module.exports = router;
