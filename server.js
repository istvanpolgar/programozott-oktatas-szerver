//EXPRESS
const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//CORS POLICY
const cors = require('cors');
app.use(cors());

//PORT
const port = process.env.PORT || 8080;

//TOKEN
const refreshTokenSecret = 'thisisatokensecret';
let refreshTokens = [];
const jwt = require('jsonwebtoken');

//SCHEM'S
const signinSchema = require('./src/schems/signinSchema');
const signupSchema = require('./src/schems/signupSchema');

//FIREBASE
const { initializeApp } = require('@firebase/app');
const firebaseConfig = require('./src/configs/firebaseConfig');
const firebaseApp = initializeApp(firebaseConfig);

//DATABASE
const { 
    getDatabase, 
    ref, 
    set, 
    onValue, 
    child, 
    get  
} = require('@firebase/database');
const database = getDatabase(firebaseApp);
//AUTH
const { 
    getAuth, 
    createUserWithEmailAndPassword, 
    sendEmailVerification,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail
} = require('firebase/auth');
const auth = getAuth();

app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    await signupSchema.validateAsync(req.body)
    .then( () => { 
        createUserWithEmailAndPassword(auth, email, password)
        .then( () => {
            sendEmailVerification(auth.currentUser)
            .then(() => {
                set(ref(database, 'users/' + auth.currentUser.uid), {
                    name: name,
                    email: email,
                    level: 0,
                })
                .then( () => {
                    res.send({status: 'Registered'})
                })
            })
            .catch((error) => {
                res.send({code: 400, message: error.message});
            })
        })
        .catch((error) => {
            res.send({code: 400, message: error.message});
        })
    })
    .catch((error) => {
        res.send({code: 400, message: error.message});
    })
});
  
app.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    await signinSchema.validateAsync(req.body)
    .then( () => {
        signInWithEmailAndPassword(auth, email, password)
        .then( () => { 
            if(!auth.currentUser.emailVerified){
                signOut(auth);
                res.send({code: 400, message: "A regisztr??ci?? nem ker??lt meger??s??t??sre! K??rlek n??zd meg a megadott e-mail fi??kod! Ha nem tal??lod, n??zz bele a Spam-be is!"});
            }
            else
            {
                let accessToken = '';
                accessToken = jwt.sign({ 
                    id: auth.currentUser.uid,  
                    email: email
                }, 
                refreshTokenSecret,
                { expiresIn: '1h' }
                );
                refreshTokens.push(accessToken);

                res.send({
                    token: accessToken
                });
            }
        })
        .catch((error) => {
            res.send({code: 400, message: error.message});
        })
    })
    .catch((error) => {
        res.send({code: 400, message: error.message});
    })
});

app.post('/forgotten_pass', async (req, res) => {
    const { email } = req.body;

    sendPasswordResetEmail(auth, email)
    .then( () => {
        res.send({status: 'Sent'})
    })
    .catch((error) => {
        res.send({code: 400, message: error.message});
    })
})

app.post('/getuser', async (req, res) => {
    const token = req.headers.authorization.split(' ')[1];

    if (!token) {
        signOut(auth).then(() => {
            return res.send({code: 400, message: "Hi??nyz?? token!"});
        }).catch((error) => {
            res.send({code: 400, message: error.message});
        })
    }
  
    if (!refreshTokens.includes(token)) {
        signOut(auth).then(() => {
            return res.send({code: 400, message: "Helytelen token!"});
        }).catch((error) => {
            res.send({code: 400, message: error.message});
        })
    }
  
    jwt.verify(token, refreshTokenSecret, async (err) => {
        if (err) {
            signOut(auth).then(() => {
                return res.send({code: 400, message: "Nem l??tez?? token!"});
            }).catch((error) => {
                res.send({code: 400, message: error.message});
            })
        }

        const starCountRef = ref(database, 'users/' + auth.currentUser.uid);
        onValue(starCountRef, (snapshot) => {
            res.send({user: snapshot.val().name});
        });
    }); 
})

app.post('/signout', (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    refreshTokens = refreshTokens.filter(t => t !== token);
    signOut(auth).then(() => {
        res.send({status: "Logged out!"});
    }).catch((error) => {
        res.send({code: 400, message: error.message});
    })
});

app.listen(port, () => {
    console.log(`A Programozott oktat??s szervere fut a k??vetkez?? c??men: http://localhost:${port}`);
})