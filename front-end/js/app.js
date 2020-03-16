
const express = require('express');
const path = require('path');
const User = require('../../models/User');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const session = require('express-session');
const flash = require('connect-flash');
const Web3 = require('web3');
const cookieParser = require('cookie-parser');
const app = express();



ElectionApp = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  hasVoted: false,
  //initialising app 
  init: function () {
    console.log("haiiiiiiii");
    return ElectionApp.initWeb3();
  },
  //connects our client side appln to local blockchain
  initWeb3: function () {
    // TODO: refactor conditional
    if (typeof web3 !== 'undefined') {
      // If a web3 instance is already provided by Meta Mask.
      ElectionApp.web3Provider = web3.currentProvider;
      //ethereum.enable();
      web3 = new Web3(web3.currentProvider);
    } else {
      // Specify default instance if no web3 instance provided
      ElectionApp.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      //ethereum.enable();
      web3 = new Web3(ElectionApp.web3Provider);
    }
    return ElectionApp.initContract();
  },
  //initialising contract
  initContract: function () {
    var contractAddress = "0x09Aba2Ac463D008e3E933306A73b9aCbDb98493c";
    var contractAbi = [
      {
        "constant": true,
        "inputs": [],
        "name": "candidatesCount",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "candidates",
        "outputs": [
          {
            "name": "id",
            "type": "uint256"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "voteCount",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "candidate",
        "outputs": [
          {
            "name": "",
            "type": "string"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "name": "voters",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_candidateId",
            "type": "uint256"
          }
        ],
        "name": "vote",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ];
    ElectionApp.contracts.Election = new web3.eth.Contract(contractAbi, contractAddress)
    // ElectionApp.contracts.Election = TruffleContract(Election);
     ElectionApp.contracts.Election.setProvider(ElectionApp.web3Provider);
    // $.getJSON("Election.json", function(election) {
    //   // Instantiate a new truffle contract from the artifact
    //   ElectionApp.contracts.Election = TruffleContract(election);
    //   // Connect provider to interact with contract
    //   ElectionApp.contracts.Election.setProvider(ElectionApp.web3Provider);

      //App.listenForEvents();

    return ElectionApp.render();
    //});
  },

  // Listen for events emitted from the contract
  listenForEvents: function () {
    ElectionApp.contracts.Election.deployed().then(function(instance) {
      instance.election()
      // Restart Chrome if you are unable to receive this event
      // This is a known issue with Metamask
      // https://github.com/MetaMask/metamask-extension/issues/2393
      instance.votedEvent({}, {
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function(error, event) {
        console.log("event triggered", event)
        // Reload when a new vote is recorded
        ElectionApp.render();
      });
    });
  },

  render: function () {
    var electionInstance;
    // var loader = $("#loader");
    // var content = $("#content");

    // loader.show();
    // content.hide();
    // content.show();
    // Load account data
    web3.eth.getCoinbase(function(err, account) {
      if (err === null) {
        ElectionApp.account = account;
        $("#accountAddress").html("Your Account: " + account);
      }
    });

    // Load contract data
    ElectionApp.contracts.Election.deployed().then(function(instance) {
      electionInstance = instance;
      return electionInstance.candidatesCount();
    }).then(function(candidatesCount) {
      var candidatesResults = $("#candidatesResults");
      candidatesResults.empty();

      var candidatesSelect = $('#candidatesSelect');
      candidatesSelect.empty();

      for (var i = 1; i <= candidatesCount; i++) {
        electionInstance.candidates(i).then(function(candidate) {
          var id = candidate[0];
          var name = candidate[1];
          var voteCount = candidate[2];

          // Render candidate Result
          var candidateTemplate = "<tr><th>" + id + "</th><td>" + name + "</td><td>" + voteCount + "</td></tr>"
          candidatesResults.append(candidateTemplate);

          // Render candidate ballot option
          var candidateOption = "<option value='" + id + "' >" + name + "</ option>"
          candidatesSelect.append(candidateOption);
        });
      }
      return electionInstance.voters(ElectionApp.account);
    }).then(function(hasVoted) {
      // Do not allow a user to vote
      if(hasVoted) {
        $('form').hide();
      }
      // loader.hide();
      // content.show();
    }).catch(function(error) {
      console.warn(error);
    });
  },

  castVote: function () {
    var candidateId = $('#candidatesSelect').val();
    ElectionApp.contracts.Election.deployed().then(function(instance) {
      return instance.vote(candidateId, { from: ElectionApp.account });
    }).then(function(result) {
      // Wait for votes to update
      // $("#content").hide();
      // $("#loader").show();
    }).catch(function(err) {
      console.error(err);
    });
  }
};

// $(function() {
//   $(window).load(function() {
//     App.init();
//   });
// });


app.use(express.json());

// Passport Config
require('../../config/passport')(passport);


// DB Config
const db = require('../../config/keys').mongoURI;

// Connect to MongoDB
mongoose
  .connect(
    db,
    { useNewUrlParser: true,
      useUnifiedTopology: true }
  )
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));





// Express body parser
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Express session
app.use(
  session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true,
  })
);


// Passport middleware
app.use(passport.initialize());
app.use(passport.session());



// Connect flash
app.use(flash());

// Global variables
app.use(function(req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

// For static front end
app.use(express.static('front-end'));


//GET Login
app.get('/login', (req,res) => res.sendFile(path.join(__dirname,'../../front-end','login.html')));

//GET Registration page
app.get('/register', (req,res) => res.sendFile(path.join(__dirname,'../../front-end','register.html')));

// app.get('/sample', (req,res) => { console.log(`uid values are ${uid[0]}`);
//                                   console.log(`count = ${count}`);
//                                   res.send('ola');
//                                 })

// Registration
app.post('/register', (req,res) => {

  const { name, email, password, password2 } = req.body;

  if(password !== password2){
    res.send("Passwords do not match");
  }

  else if(password.length < 6){
    res.send("Password must be at least 6 characters");
  }
  
  else{
    User.findOne({ email: email }).then(user => {
      if (user) {
        res.send("Email already exists");
      }

      else{
        const newUser = new User({
          name,
          email,
          password
        });

       
  

        bcrypt.genSalt(10, (err,salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            newUser.save().then( () => {res.redirect('/login');}).catch(err => console.log(err));
            
  
              
          });
        });
    }

  });
}

});

//Get Result
// Democracy.methods.getResult()
//     .call({ from: coinbase }).then((val) => {
//       console.log(val);
//       val.
//     })
 //Function to ensure you're logged in before seeing dashboard
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated())
    return next();
  else
     res.redirect('/login');
}


//GET Dashboard
app.get('/dashboard',ensureAuthenticated, (req,res) => {
  // if(count>0 && (uid.indexOf(loginemail) >= 0))
  //   res.send('already voted');
  // else
  res.sendFile(path.join(__dirname,'../../front-end','dashboard.html'));
  ElectionApp.init();
  
});

// app.get('/vote', (req,res) => res.sendFile(path.join(__dirname,'blockchain','src/index.html')) );

//login

app.post('/login',(req, res, next) => {

  loginemail = req.body.email;
  
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login'
  })(req, res, next);
});



//logout
app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});


// app.post('/dashboard', (req,res) => {

//   data = req.body;

//   //Store email id into array     
//   uid[count] = loginemail;
//   count = count+1;

//   Election.methods.vote(
//     data.Candidate
//   ).send({ from:coinbase, gas: 600000}).catch((error)=>{
//     console.log(error)
//   });
  
//   res.send('Success');

// });


// app.get('/result', (req,res) => {

//   Election.methods.getVote(1)
//       .call({from:coinbase}).then((val) => {
//         console.log(val);
//         res.send('its done');
//       }).catch(error =>
//         console.log(error)
//       );
// });


module.exports = app;