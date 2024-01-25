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
    get,
    set, 
    child,
    onValue, 
    update
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
                    level: 3,
                    sublevel: 1,
                    exercise: 1,
                    tonatural: 0,
                    toiteger: 0,
                    torational: 1,
                    toreal: 0,
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
                res.send({code: 400, message: "A regisztráció nem került megerősítésre! Kérlek nézd meg a megadott e-mail fiókod! Ha nem találod, nézz bele a Spam-be is!"});
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
        .catch(() => {
            res.send({code: 400, message: "Az e-mail cím vagy jelszó helytelen. Próbálkozzon újra!"});
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
            return res.send({code: 400, message: "Hiányzó token!"});
        }).catch((error) => {
            res.send({code: 400, message: error.message});
        })
        return 
    } else if (!refreshTokens.includes(token)) {
        signOut(auth).then(() => {
            return res.send({code: 400, message: "Helytelen token!"});
        }).catch((error) => {
            res.send({code: 400, message: error.message});
        })
        return 
    } else 
        jwt.verify(token, refreshTokenSecret, async (err) => {
            if (err) {
                signOut(auth).then(() => {
                    return res.send({code: 400, message: "Nem létező token!"});
                }).catch((error) => {
                    res.send({code: 400, message: error.message});
                })
                return
            } else {
                const dbRef = ref(getDatabase());
                get(child(dbRef, 'users/' + auth.currentUser.uid)).then((snapshot) => {
                if (snapshot.exists()) {
                    res.send({user: snapshot.val().name});
                } else {
                    console.log("No data available");
                }
                }).catch((error) => {
                    console.error(error);
                });
            }
        }); 
})

app.post('/stats', async (req, res) => {
    const token = req.headers.authorization.split(' ')[1];

    if (!token) {
        signOut(auth).then(() => {
            return res.send({code: 400, message: "Hiányzó token!"});
        }).catch((error) => {
            res.send({code: 400, message: error.message});
        })
        return
    } else if (!refreshTokens.includes(token)) {
        signOut(auth).then(() => {
            return res.send({code: 400, message: "Helytelen token!"});
        }).catch((error) => {
            res.send({code: 400, message: error.message});
        })
        return 
    } else 
        jwt.verify(token, refreshTokenSecret, async (err) => {
            if (err) {
                signOut(auth).then(() => {
                    return res.send({code: 400, message: "Nem létező token!"});
                }).catch((error) => {
                    res.send({code: 400, message: error.message});
                })
                return
            } else {
                let natural = [];
                let integer = [];
                let rational = [];
                let real = [];
                let nanswers = [];
                let ianswers = [];
                let raanswers = [];
                let reanswers = [];
                let titles = [];
                const dbRef = ref(getDatabase());
                get(child(dbRef, 'exercises/')).then((snapshot) => {
                    if (snapshot.exists()) {
                        snapshot.forEach(t => {
                            if(t) {
                                titles.push(t.val().title);
                                if(t.key == 1)
                                {
                                    t.forEach(e => {
                                        if(e.key != 'title' && e)
                                            natural.push({
                                                title: e.val().title,
                                                title2: e.val().title2,
                                                exercise: e.val().exercise,
                                                exercise2: e.val().exercise2,
                                                change: e.val().change,
                                                url: e.val().url
                                            });
                                    });

                                    t.forEach(e => {
                                        if(e.key != 'title' && e)
                                        {
                                            let ans = [];
                                            e.forEach(a => {
                                                if(a && a.key != 'title' && a.key != 'title2' && a.key != 'exercise' && a.key != 'exercise2' && a.key != 'change' && a.key != 'url'){
                                                    ans.push(a.val());
                                                }
                                            });
                                            nanswers.push(ans);
                                        }
                                    });
                                }
                                if(t.key == 2)
                                {
                                    t.forEach(e => {
                                        if(e.key != 'title' && e)
                                            integer.push({
                                                title: e.val().title,
                                                title2: e.val().title2,
                                                exercise: e.val().exercise,
                                                exercise2: e.val().exercise2,
                                                change: e.val().change,
                                                url: e.val().url
                                            });
                                    });

                                    t.forEach(e => {
                                        if(e.key != 'title' && e)
                                        {
                                            let ans = [];
                                            e.forEach(a => {
                                                if(a && a.key != 'title' && a.key != 'title2' && a.key != 'exercise' && a.key != 'exercise2' && a.key != 'change' && a.key != 'url'){
                                                    ans.push(a.val());
                                                }
                                            });
                                            ianswers.push(ans);
                                        }
                                    });
                                }
                                if(t.key == 3)
                                {
                                    t.forEach(e => {
                                        if(e.key != 'title' && e)
                                            rational.push({
                                                title: e.val().title,
                                                title2: e.val().title2,
                                                exercise: e.val().exercise,
                                                exercise2: e.val().exercise2,
                                                change: e.val().change,
                                                url: e.val().url
                                            });
                                    });

                                    t.forEach(e => {
                                        if(e.key != 'title' && e)
                                        {
                                            let ans = [];
                                            e.forEach(a => {
                                                if(a && a.key != 'title' && a.key != 'title2' && a.key != 'exercise' && a.key != 'exercise2' && a.key != 'change' && a.key != 'url'){
                                                    ans.push(a.val());
                                                }
                                            });
                                            raanswers.push(ans);
                                        }
                                    });
                                }
                                if(t.key == 4)
                                {
                                    t.forEach(e => {
                                        if(e.key != 'title' && e)
                                            real.push({
                                                title: e.val().title,
                                                title2: e.val().title2,
                                                exercise: e.val().exercise,
                                                exercise2: e.val().exercise2,
                                                change: e.val().change,
                                                url: e.val().url
                                            });
                                    });

                                    t.forEach(e => {
                                        if(e.key != 'title' && e)
                                        {
                                            let ans = [];
                                            e.forEach(a => {
                                                if(a.key != 'title' && a.key != 'title2' && a.key != 'exercise' && a.key != 'exercise2' && a.key != 'change' && a.key != 'url'){
                                                    ans.push(a.val());
                                                }
                                            });
                                            reanswers.push(ans);
                                        }
                                    });
                                }
                            }
                        });
                        get(child(dbRef, 'users/' + auth.currentUser.uid)).then((snapshot) => {
                            if (snapshot.exists()) {
                                res.send({
                                    level: snapshot.val().level,
                                    sublevel: snapshot.val().sublevel,
                                    exercise: snapshot.val().exercise,
                                    natural: natural,
                                    integer: integer,
                                    rational: rational,
                                    real: real,
                                    nanswers: nanswers,
                                    ianswers: ianswers,
                                    raanswers: raanswers,
                                    reanswers: reanswers,
                                    titles: titles
                                });
                            } else {
                                console.log("No data available");
                            }
                        }).catch((error) => {
                            console.error(error);
                        });
                    } else {
                        console.log("No data available");
                    }
                }).catch((error) => {
                    console.error(error);
                });
            }
        }); 
})

app.post('/savelevel', async (req, res) => {
    const { level, tip } = req.body;
    const token = req.headers.authorization.split(' ')[1];
    let ton = 0;
    let toi = 0;
    let tora = 0;
    let tore = 0;
    let l = level;

    if (!token) {
        signOut(auth).then(() => {
            return res.send({code: 400, message: "Hiányzó token!"});
        }).catch((error) => {
            res.send({code: 400, message: error.message});
        })
        return
    } else if (!refreshTokens.includes(token)) {
        signOut(auth).then(() => {
            return res.send({code: 400, message: "Helytelen token!"});
        }).catch((error) => {
            res.send({code: 400, message: error.message});
        })
        return
    } else 
        jwt.verify(token, refreshTokenSecret, async (err) => {
            if (err) {
                signOut(auth).then(() => {
                    return res.send({code: 400, message: "Nem létező token!"});
                }).catch((error) => {
                    res.send({code: 400, message: error.message});
                })
            } else {
                update(ref(database, 'users/' + auth.currentUser.uid), {
                    level: level
                })
                .then( () => {
                    const dbRef = ref(getDatabase());
                    get(child(dbRef, 'users/' + auth.currentUser.uid)).then((snapshot) => {
                        if (snapshot.exists()) {
                            ton = snapshot.val().tonatural;
                            toi = snapshot.val().tointeger;
                            tora = snapshot.val().torational;
                            tore = snapshot.val().toreal;
                            switch(level)
                                {
                                    case 1: 
                                        if(ton+1 == 10)
                                        {
                                            l = 1;
                                            update(ref(database, 'users/' + auth.currentUser.uid), {
                                                tonatural: 0,
                                                level: 1
                                            })
                                            .catch((error) => {
                                                res.send({code: 400, message: error.message});
                                            });
                                        }
                                        else
                                            update(ref(database, 'users/' + auth.currentUser.uid), {
                                                tonatural: ton+1
                                            })
                                            .catch((error) => {
                                                res.send({code: 400, message: error.message});
                                            }); 
                                        break;
                                    case 2: 
                                        if(toi+1 == 10)
                                        {
                                            l = 1;
                                            update(ref(database, 'users/' + auth.currentUser.uid), {
                                                tointeger: 0,
                                                level: 1
                                            })
                                            .catch((error) => {
                                                res.send({code: 400, message: error.message});
                                            });
                                        }
                                        else
                                            update(ref(database, 'users/' + auth.currentUser.uid), {
                                                tointeger: toi+1
                                            })
                                            .catch((error) => {
                                                res.send({code: 400, message: error.message});
                                            }); 
                                        break;
                                    case 3: 
                                        if(tora+1 == 10)
                                        {
                                            l = 2;
                                            update(ref(database, 'users/' + auth.currentUser.uid), {
                                                torational: 0,
                                                level: 2
                                            })
                                            .catch((error) => {
                                                res.send({code: 400, message: error.message});
                                            });
                                        }
                                        else
                                            update(ref(database, 'users/' + auth.currentUser.uid), {
                                                torational: tora+1
                                            })
                                            .catch((error) => {
                                                res.send({code: 400, message: error.message});
                                            }); 
                                        break;
                                    case 4: 
                                        if(tore+1 == 10)
                                        {
                                            l = 3;
                                            update(ref(database, 'users/' + auth.currentUser.uid), {
                                                toreal: 0,
                                                level: 3
                                            })
                                            .catch((error) => {
                                                res.send({code: 400, message: error.message});
                                            });
                                        }
                                        else
                                            update(ref(database, 'users/' + auth.currentUser.uid), {
                                                toreal: tore+1
                                            })
                                            .catch((error) => {
                                                res.send({code: 400, message: error.message});
                                            }); 
                                        break;
                                }
                            res.send({status: 'Updated!', level: l, tip: tip});
                        } else {
                            console.log("No data available");
                        }
                    }).catch((error) => {
                        console.error(error);
                    });
                })
                .catch((error) => {
                    res.send({code: 400, message: error.message});
                })
            }
        })
});

app.post('/savesublevel', async (req, res) => {
    const { sublevel, tip } = req.body;
    const token = req.headers.authorization.split(' ')[1];
    let ton = 0;
    let toi = 0;
    let tora = 0;
    let tore = 0;
    let level = 0;

    if (!token) {
        signOut(auth).then(() => {
            return res.send({code: 400, message: "Hiányzó token!"});
        }).catch((error) => {
            res.send({code: 400, message: error.message});
        })
        return
    } else if (!refreshTokens.includes(token)) {
        signOut(auth).then(() => {
            return res.send({code: 400, message: "Helytelen token!"});
        }).catch((error) => {
            res.send({code: 400, message: error.message});
        })
        return
    } else
        jwt.verify(token, refreshTokenSecret, async (err) => {
            if (err) {
                signOut(auth).then(() => {
                    return res.send({code: 400, message: "Nem létező token!"});
                }).catch((error) => {
                    res.send({code: 400, message: error.message});
                })
                return
            } else {
                update(ref(database, 'users/' + auth.currentUser.uid), {
                    sublevel: sublevel
                })
                .then( () => {
                    if(sublevel == 1) {
                        const dbRef = ref(getDatabase());
                        get(child(dbRef, 'users/' + auth.currentUser.uid)).then((snapshot) => {
                            if (snapshot.exists()) {
                                ton = snapshot.val().tonatural;
                                toi = snapshot.val().tointeger;
                                tora = snapshot.val().torational;
                                tore = snapshot.val().toreal;
                                level = snapshot.val().level;
                                switch(level)
                                {
                                    case 1: 
                                        if(ton+1 == 10)
                                        {
                                            level = 1;
                                            update(ref(database, 'users/' + auth.currentUser.uid), {
                                                tonatural: 0,
                                                level: 1
                                            })
                                            .catch((error) => {
                                                res.send({code: 400, message: error.message});
                                            });
                                        }
                                        else
                                            update(ref(database, 'users/' + auth.currentUser.uid), {
                                                tonatural: ton+1
                                            })
                                            .catch((error) => {
                                                res.send({code: 400, message: error.message});
                                            }); 
                                        break;
                                    case 2: 
                                        if(toi+1 == 10)
                                        {
                                            level = 1;
                                            update(ref(database, 'users/' + auth.currentUser.uid), {
                                                tointeger: 0,
                                                level: 1
                                            })
                                            .catch((error) => {
                                                res.send({code: 400, message: error.message});
                                            });
                                        }
                                        else
                                            update(ref(database, 'users/' + auth.currentUser.uid), {
                                                tointeger: toi+1
                                            })
                                            .catch((error) => {
                                                res.send({code: 400, message: error.message});
                                            }); 
                                        break;
                                    case 3: 
                                        if(tora+1 == 10)
                                        {
                                            level = 2;
                                            update(ref(database, 'users/' + auth.currentUser.uid), {
                                                torational: 0,
                                                level: 2
                                            })
                                            .catch((error) => {
                                                res.send({code: 400, message: error.message});
                                            });
                                        }
                                        else
                                            update(ref(database, 'users/' + auth.currentUser.uid), {
                                                torational: tora+1
                                            })
                                            .catch((error) => {
                                                res.send({code: 400, message: error.message});
                                            }); 
                                        break;
                                    case 4: 
                                        if(tore+1 == 10)
                                        {
                                            level = 3;
                                            update(ref(database, 'users/' + auth.currentUser.uid), {
                                                toreal: 0,
                                                level: 3
                                            })
                                            .catch((error) => {
                                                res.send({code: 400, message: error.message});
                                            });
                                        }
                                        else
                                            update(ref(database, 'users/' + auth.currentUser.uid), {
                                                toreal: tore+1
                                            })
                                            .catch((error) => {
                                                res.send({code: 400, message: error.message});
                                            }); 
                                        break;
                                }
                            } else {
                                console.log("No data available");
                            }
                        }).catch((error) => {
                            console.error(error);
                        });
                    }
                    res.send({status: 'Updated!', level: level, tip: tip});
                })
                .catch((error) => {
                    res.send({code: 400, message: error.message});
                })
            }
        })
});

app.post('/saveexercise', async (req, res) => {
    const { exercise, tip } = req.body;
    const token = req.headers.authorization.split(' ')[1];

    if (!token) {
        signOut(auth).then(() => {
            return res.send({code: 400, message: "Hiányzó token!"});
        }).catch((error) => {
            res.send({code: 400, message: error.message});
        })
        return
    } else if (!refreshTokens.includes(token)) {
        signOut(auth).then(() => {
            return res.send({code: 400, message: "Helytelen token!"});
        }).catch((error) => {
            res.send({code: 400, message: error.message});
        })
        return
    } else
        jwt.verify(token, refreshTokenSecret, async (err) => {
            if (err) {
                signOut(auth).then(() => {
                    return res.send({code: 400, message: "Nem létező token!"});
                }).catch((error) => {
                    res.send({code: 400, message: error.message});
                })
                return
            } else {
                update(ref(database, 'users/' + auth.currentUser.uid), {
                    exercise: exercise
                })
                .then( () => {
                    res.send({status: 'Updated!', tip: tip})
                })
                .catch((error) => {
                    res.send({code: 400, message: error.message});
                })
            }
        })
});

app.post('/admin', async (req, res) => {
    let users = [];
    let exercise = [];
    let all = 0;
    let als = 0;
    let alex = 0;
    let subl = 0;
    let exerc = 0;
    let levname = "";
    let sublevname = "";
    const dbRef = ref(getDatabase());
    get(child(dbRef, 'exercises/')).then((snapshot) => {
        if (snapshot.exists()) {
            all = Object.keys(snapshot.val()).length;
            snapshot.forEach(level => {
                if(level) {
                    exercise.push(level);
                    als += Object.keys(level.val()).length-1;
                }
                level.forEach(sublevel => {
                    if(sublevel && sublevel.val().answers){
                        alex += Object.keys(sublevel.val().answers).length;
                    }
                })
            })
        } else {
            console.log("No data available");
        }
    }).then(()=>{
        get(child(dbRef, 'users/')).then((snapshot) => {
            if (snapshot.exists()) {
                snapshot.forEach(user => {
                    subl = 0;
                    exerc = 0;
                    exercise.forEach((level,i) => {
                        if(i < user.val().level-1 && level){
                            subl += Object.keys(level.val()).length-1;
                        }
                        if(i == user.val().level-1)
                                levname = level.val().title;
                        level.forEach(sublevel => {
                            if(i < user.val().level-1 && sublevel.val().answers){
                                exerc += Object.keys(sublevel.val().answers).length;
                            }
                            if(i == user.val().level-1) {
                                if(sublevel.key < user.val().sublevel && sublevel.val().answers){
                                    exerc += Object.keys(sublevel.val().answers).length;
                                }
                                if(sublevel.key == user.val().sublevel) {
                                    sublevname = sublevel.val().title;
                                    if(sublevel.val().title2 != "")
                                        if(sublevel.val().change >= user.val().exercise)
                                            sublevname = sublevel.val().title2;
                                }
                            }
                        })
                    })
                    subl += user.val().sublevel-1;
                    exerc += user.val().exercise-1;
                    users.push({
                        name: user.val().name,
                        level: user.val().level,
                        actualexercise: user.val().exercise,
                        sublevel: subl,
                        exercise: exerc,
                        levelname: levname,
                        sublevelname: sublevname
                    })
                });
            } else {
                console.log("No data available");
            }
        }).then(()=>{
            res.send({
                users: users,
                alllevels: all,
                allsublevels: als,
                allexercises: alex
            })
        }).catch((error) => {
            console.error(error);
        });
    }).catch((error) => {
        console.error(error);
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
    console.log(`A Programozott oktatás szervere fut a következő címen: http://localhost:${port}`);
    const starCountRef = ref(database, 'exercises');

    onValue(starCountRef, (snapshot) => {
        if(!snapshot.val())
            set(ref(database, 'exercises'), {
                1: {
                    title: 'Természetes számok halmaza',
                    1: {
                        title: 'Műveletek - Összeadás',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        url: 'oizrNNx713s,OzD2BbdpTwM,07KjOaoUJjQ,jofahFN_vSw',
                        exercise: 'Írd be a helyes eredményt!',
                        answers: {
                            1: {
                                tip: 1,
                                answer: 13,
                                to: 1,
                                subto: 1,
                            },
                            2: {
                                tip: 1,
                                answer: 87,
                                to: 1,
                                subto: 1,
                            },
                            3: {
                                tip: 1,
                                answer: 52,
                                to: 1,
                                subto: 1,
                            },
                            4: {
                                tip: 1,
                                answer: 911,
                                to: 1,
                                subto: 1,
                            },
                            5: {
                                tip: 1,
                                answer: 630,
                                to: 1,
                                subto: 1,
                            },
                            6: {
                                tip: 1,
                                answer: 225,
                                to: 1,
                                subto: 1,
                            },
                        }                   
                    },
                    2: {
                        title: 'Műveletek - Kivonás (melynek eredménye természetes szám)',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be a helyes eredményt!',
                        url: 'k-k6XZCWpDw',
                        answers: {
                            1: {
                                tip: 1,
                                answer: 5,
                                to: 1,
                                subto: 2,
                            },
                            2: {
                                tip: 1,
                                answer: 23,
                                to: 1,
                                subto: 2,
                            },
                            3: {
                                tip: 1,
                                answer: 18,
                                to: 1,
                                subto: 2,
                            },
                            4: {
                                tip: 1,
                                answer: 78,
                                to: 1,
                                subto: 2,
                            },
                            5: {
                                tip: 1,
                                answer: 489,
                                to: 1,
                                subto: 2,
                            },
                            6: {
                                tip: 1,
                                answer: 100,
                                to: 1,
                                subto: 2,
                            },
                        }  
                    },
                    3: {
                        title: 'Műveletek - Szorzás',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be a helyes eredményt!',
                        url: 'yaIRAc1MEmo,7XWq5yiRB5M',
                        answers: {
                            1: {
                                tip: 1,
                                answer: 48,
                                to: 1,
                                subto: 3,
                            },
                            2: {
                                tip: 1,
                                answer: 196,
                                to: 1,
                                subto: 3,
                            },
                            3: {
                                tip: 1,
                                answer: 1272,
                                to: 1,
                                subto: 3,
                            },
                            4: {
                                tip: 1,
                                answer: 13734,
                                to: 1,
                                subto: 3,
                            },
                            5: {
                                tip: 1,
                                answer: 83754,
                                to: 1,
                                subto: 3,
                            },
                            6: {
                                tip: 1,
                                answer: 448,
                                to: 1,
                                subto: 3,
                            },
                            7: {
                                tip: 1,
                                answer: 1080,
                                to: 1,
                                subto: 3,
                            },
                            8: {
                                tip: 1,
                                answer: 64000,
                                to: 1,
                                subto: 3,
                            },
                            9: {
                                tip: 1,
                                answer: 5040,
                                to: 1,
                                subto: 3,
                            },
                        }  
                    },
                    4: {
                        title: 'Műveletek - Osztás',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be a helyes eredményt!',
                        url: 'hjxFW3-UupE,2I6UtxT4-jU',
                        answers: {
                            1: {
                                tip: 1,
                                answer: 4,
                                to: 1,
                                subto: 4,
                            },
                            2: {
                                tip: 1,
                                answer: 107,
                                to: 1,
                                subto: 4,
                            },
                            3: {
                                tip: 1,
                                answer: 656,
                                to: 1,
                                subto: 4,
                            },
                            4: {
                                tip: 1,
                                answer: 63,
                                to: 1,
                                subto: 4,
                            },
                            5: {
                                tip: 1,
                                answer: 23,
                                to: 1,
                                subto: 4,
                            },
                            6: {
                                tip: 1,
                                answer: 0,
                                to: 1,
                                subto: 4,
                            },
                            7: {
                                tip: 1,
                                answer: 2,
                                to: 1,
                                subto: 4,
                            }
                        } 
                    },
                    5: {
                        title: 'Műveletek - Természetes számmal való hatványozás',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be vagy válaszd ki a helyes eredményt!',
                        url: 'yajDk-ZX-sY',
                        answers: {
                            1: {
                                tip: 1,
                                answer: 32,
                                to: 1,
                                subto: 5,
                            },
                            2: {
                                tip: 1,
                                answer: 25,
                                to: 1,
                                subto: 5,
                            },
                            3: {
                                tip: 1,
                                answer: 1,
                                to: 1,
                                subto: 5,
                            },
                            4: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 1,
                                    c: 1,
                                    d: 1
                                },
                                subto: {
                                    a: 5,
                                    c: 5,
                                    d: 1
                                },
                            },
                            5: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 1,
                                    c: 1,
                                    d: 1
                                },
                                subto: {
                                    b: 5,
                                    c: 5,
                                    d: 1
                                },
                            },
                            6: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 1,
                                    c: 1,
                                    d: 1
                                },
                                subto: {
                                    a: 5,
                                    c: 5,
                                    d: 2
                                },
                            },
                            7: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 1,
                                    c: 1,
                                    d: 1
                                },
                                subto: {
                                    a: 5,
                                    c: 5,
                                    d: 2
                                },
                            },
                            8: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 1,
                                    c: 1,
                                    d: 1
                                },
                                subto: {
                                    a: 5,
                                    c: 5,
                                    d: '1 2'
                                },
                            },
                            9: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 1,
                                    c: 1,
                                    d: 1
                                },
                                subto: {
                                    b: 5,
                                    c: 5,
                                    d: 3
                                },
                            },
                            10: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 1,
                                    b: 1,
                                    d: 1
                                },
                                subto: {
                                    a: 5,
                                    b: 5,
                                    d: 3
                                },
                            },
                        } 
                    },
                    6: {
                        title: 'Műveletek sorrendje',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Válaszd ki a helyes eredményt!',
                        url: 'S1EW0wGaNTY,ytBCu5XzzJ4',
                        answers: {
                            1: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 1,
                                    d: 1
                                },
                                subto: {
                                    b: 6,
                                    c: 1
                                },
                            },
                            2: {
                                tip: 2,
                                answer: 'd',
                                to: {
                                    a: 1,
                                    b: 1,
                                    c: 1,
                                    e: 1
                                },
                                subto: {
                                    a: 6,
                                    b: 6,
                                    c: 6,
                                    e: 1
                                },
                            },
                            3: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 1,
                                    c: 1
                                },
                                subto: {
                                    a: 6,
                                    c: 1
                                },
                            },
                            4: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 1,
                                    b: 1,
                                    d: 1
                                },
                                subto: {
                                    a: 6,
                                    b: 6,
                                    d: 1
                                },
                            },
                            5: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 1,
                                    c: 1,
                                    d: 1
                                },
                                subto: {
                                    b: 6,
                                    c: 6,
                                    d: 1
                                },
                            },
                            6: {
                                tip: 2,
                                answer: 'd',
                                to: {
                                    a: 1,
                                    b: 1,
                                    c: 1,
                                    e: 1
                                },
                                subto: {
                                    a: 6,
                                    b: 6,
                                    c: 6,
                                    e: 1
                                },
                            }
                        }
                    },
                    7: {
                        title: 'Zárójelek használata',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Válaszd ki a helyes eredményt!',
                        url: 'S1EW0wGaNTY,ytBCu5XzzJ4',
                        answers: {
                            1: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 1,
                                    b: 1,
                                    d: 1
                                },
                                subto: {
                                    a: 7,
                                    b: 7,
                                    d: 1
                                },
                            },
                            2: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 1,
                                    c: 1,
                                    d: 1,
                                    e: 1
                                },
                                subto: {
                                    b: 7,
                                    c: 7,
                                    d: 7,
                                    e: 1
                                },
                            },
                            3: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 1,
                                    b: 1,
                                    d: 1
                                },
                                subto: {
                                    a: 7,
                                    b: 7,
                                    d: 1
                                },
                            },
                            4: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 1,
                                    b: 1,
                                    d: 1,
                                    e: 1
                                },
                                subto: {
                                    a: 7,
                                    b: 7,
                                    d: 7,
                                    e: 1
                                },
                            }
                        }
                    },
                    8: {
                        title: 'Disztributivitás',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Válaszd ki a helyes eredményt!',
                        url: '7XWq5yiRB5M',
                        answers: {
                            1: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 1,
                                    c: 1
                                },
                                subto: {
                                    a: 8,
                                    c: 1
                                },
                            },
                            2: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 1,
                                    c: 1
                                },
                                subto: {
                                    b: 7,
                                    c: 1
                                },
                            },
                            3: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 1,
                                    c: 1,
                                    d: 1,
                                    e: 1
                                },
                                subto: {
                                    b: 7,
                                    c: 7,
                                    d: 7,
                                    e: 1
                                },
                            },
                            4: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 1,
                                    c: 1
                                },
                                subto: {
                                    a: 7,
                                    c: 1
                                },
                            }
                        }
                    },
                    9: {
                        title: 'Betűkkel való műveletek',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Válaszd ki a helyes eredményt!',
                        url: 'q0d5OetdljE,a_OPNOTuhH4,l0dKPtzmMoA,KIOlYj-v96k,r8s23m8wVbs,H2rj2yTw5zs,SDqYmayXZbQ',
                        answers: {
                            1: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 1,
                                    c: 1,
                                    d: 1
                                },
                                subto: {
                                    b: 1,
                                    c: 9,
                                    d: 1
                                },
                            },
                            2: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 1,
                                    b: 1,
                                    d: 1
                                },
                                subto: {
                                    a: 6,
                                    b: 1,
                                    d: 1
                                },
                            },
                            3: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 1,
                                    c: 1,
                                    d: 1
                                },
                                subto: {
                                    b: 8,
                                    c: 8,
                                    d: 1
                                },
                            },
                            4: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 1,
                                    b: 1,
                                    d: 1
                                },
                                subto: {
                                    a: 8,
                                    b: 5,
                                    d: 1
                                },
                            },
                            5: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 1,
                                    b: 1,
                                    d: 1
                                },
                                subto: {
                                    a: 5,
                                    b: 5,
                                    d: 1
                                },
                            },
                            6: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 1,
                                    c: 1,
                                    d: 1
                                },
                                subto: {
                                    b: 5,
                                    c: 5,
                                    d: 1
                                },
                            }
                        }
                    },
                    10: {
                        title: 'Összetett feladatok',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be vagy válaszd ki a helyes eredményt!',
                        url: '',
                        answers: {
                            1: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 1,
                                    b: 1,
                                    d: 1
                                },
                                subto: {
                                    a: 6,
                                    b: 6,
                                    d: 1
                                },
                            },
                            2: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 1,
                                    c: 1,
                                    d: 1
                                },
                                subto: {
                                    a: 5,
                                    c: 6,
                                    d: 1
                                },
                            },
                            3: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 1,
                                    c: 1,
                                    d: 1
                                },
                                subto: {
                                    a: 2,
                                    c: 5,
                                    d: 1
                                },
                            },
                            4: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 1,
                                    c: 1,
                                    d: 1
                                },
                                subto: {
                                    b: 6,
                                    c: 6,
                                    d: 1
                                },
                            },
                            5: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 1,
                                    b: 1,
                                    d: 1
                                },
                                subto: {
                                    a: 5,
                                    b: 5,
                                    d: 1
                                },
                            },
                            6: {
                                tip: 1,
                                answer: 5050,
                                to: 1,
                                subto: 1
                            },
                            7: {
                                tip: 1,
                                answer: 62750,
                                to: 1,
                                subto: 1
                            },
                            8: {
                                tip: 1,
                                answer: 2047,
                                to: 1,
                                subto: 1
                            }
                        }
                    }
                },
                2: {
                    title: 'Egész számok halmaza',
                    1: {
                        title: 'Műveletek - Összeadás',
                        title2: '',
                        exercise: 'Döntsd el, hogy az alábbi összeadások eredményei negatívak vagy pozitívak! Írd be a megfelelő jelet: pozitív (+) vagy negatív (-)!',
                        exercise2: 'Írd be a helyes eredményt',
                        change: 7,
                        url: 'HfCnlVnAb_c,r_MdpAWXCrA,j0a5cXYMWIg,V8R2NsPDklU,JP2N0lDsyKI',
                        answers : {
                            1: {
                                tip: 1,
                                answer: '+',
                                to: 2,
                                subto: 1
                            },
                            2: {
                                tip: 1,
                                answer: '+',
                                to: 2,
                                subto: 1
                            },
                            3: {
                                tip: 1,
                                answer: '-',
                                to: 2,
                                subto: 1
                            },
                            4: {
                                tip: 1,
                                answer: '-',
                                to: 2,
                                subto: 1
                            },
                            5: {
                                tip: 1,
                                answer: '+',
                                to: 2,
                                subto: 1
                            },
                            6: {
                                tip: 1,
                                answer: '-',
                                to: 2,
                                subto: 1
                            },
                            7: {
                                tip: 1,
                                answer: 4,
                                to: 2,
                                subto: 1
                            },
                            8: {
                                tip: 1,
                                answer: -5,
                                to: 2,
                                subto: 1
                            },
                            9: {
                                tip: 1,
                                answer: -7,
                                to: 2,
                                subto: 1
                            },
                            10: {
                                tip: 1,
                                answer: 14,
                                to: 2,
                                subto: 1
                            },
                            11: {
                                tip: 1,
                                answer: -7,
                                to: 2,
                                subto: 1
                            },
                            12: {
                                tip: 1,
                                answer: 134,
                                to: 2,
                                subto: 1
                            },
                            13: {
                                tip: 1,
                                answer: -185,
                                to: 2,
                                subto: 1
                            },
                            14: {
                                tip: 1,
                                answer: -55,
                                to: 2,
                                subto: 1
                            },
                            15: {
                                tip: 1,
                                answer: -225,
                                to: 2,
                                subto: 1
                            },
                            16: {
                                tip: 1,
                                answer: -50,
                                to: 2,
                                subto: 1
                            },
                            17: {
                                tip: 1,
                                answer: 50,
                                to: 2,
                                subto: 1
                            },
                        }
                    },
                    2: {
                        title: 'Műveletek - Kivonás',
                        title2: '',
                        exercise: 'Döntsd el, hogy az alábbi összeadások eredményei negatívak vagy pozitívak! Írd be a megfelelő jelet: pozitív (+) vagy negatív (-)!',
                        exercise2: 'Írd be a helyes eredményt',
                        change: 7,
                        url: 'ju_3C9t42rM,V8R2NsPDklU,JP2N0lDsyKI',
                        answers : {
                            1: {
                                tip: 1,
                                answer: '+',
                                to: 2,
                                subto: 2
                            },
                            2: {
                                tip: 1,
                                answer: '-',
                                to: 2,
                                subto: 2
                            },
                            3: {
                                tip: 1,
                                answer: '-',
                                to: 2,
                                subto: 2
                            },
                            4: {
                                tip: 1,
                                answer: '+',
                                to: 2,
                                subto: 2
                            },
                            5: {
                                tip: 1,
                                answer: '+',
                                to: 2,
                                subto: 2
                            },
                            6: {
                                tip: 1,
                                answer: '-',
                                to: 2,
                                subto: 2
                            },
                            7: {
                                tip: 1,
                                answer: -6,
                                to: 2,
                                subto: 2
                            },
                            8: {
                                tip: 1,
                                answer: -22,
                                to: 2,
                                subto: 2
                            },
                            9: {
                                tip: 1,
                                answer: 30,
                                to: 2,
                                subto: 2
                            },
                            10: {
                                tip: 1,
                                answer: 7,
                                to: 2,
                                subto: 2
                            },
                            11: {
                                tip: 1,
                                answer: -14,
                                to: 2,
                                subto: 1
                            },
                            12: {
                                tip: 1,
                                answer: 0,
                                to: 2,
                                subto: 2
                            },
                            13: {
                                tip: 1,
                                answer: -12,
                                to: 2,
                                subto: 2
                            },
                            14: {
                                tip: 1,
                                answer: 55,
                                to: 2,
                                subto: 2
                            },
                            15: {
                                tip: 1,
                                answer: 0,
                                to: 2,
                                subto: 2
                            },
                        }
                    },
                    3: {
                        title: 'Műveletek - Szorzás',
                        title2: '',
                        exercise: 'Döntsd el, hogy az alábbi összeadások eredményei negatívak vagy pozitívak! Írd be a megfelelő jelet: pozitív (+) vagy negatív (-)!',
                        exercise2: 'Írd be a helyes eredményt',
                        change: 9,
                        url: 'XvOykLfIAk8,p1rTLeplP0k',
                        answers : {
                            1: {
                                tip: 1,
                                answer: '+',
                                to: 2,
                                subto: 3
                            },
                            2: {
                                tip: 1,
                                answer: '-',
                                to: 2,
                                subto: 3
                            },
                            3: {
                                tip: 1,
                                answer: '+',
                                to: 2,
                                subto: 3
                            },
                            4: {
                                tip: 1,
                                answer: '-',
                                to: 2,
                                subto: 3
                            },
                            5: {
                                tip: 1,
                                answer: '+',
                                to: 2,
                                subto: 3
                            },
                            6: {
                                tip: 1,
                                answer: '-',
                                to: 2,
                                subto: 3
                            },
                            7: {
                                tip: 1,
                                answer: '-',
                                to: 2,
                                subto: 3
                            },
                            8: {
                                tip: 1,
                                answer: '+',
                                to: 2,
                                subto: 3
                            },
                            9: {
                                tip: 1,
                                answer: -96,
                                to: 2,
                                subto: 3
                            },
                            10: {
                                tip: 1,
                                answer: 96,
                                to: 2,
                                subto: 3
                            },
                            11: {
                                tip: 1,
                                answer: -96,
                                to: 2,
                                subto: 3
                            },
                            12: {
                                tip: 1,
                                answer: 9216,
                                to: 2,
                                subto: 3
                            },
                            13: {
                                tip: 1,
                                answer: -9216,
                                to: 2,
                                subto: 3
                            },
                            14: {
                                tip: 1,
                                answer: -9216,
                                to: 2,
                                subto: 3
                            },
                            15: {
                                tip: 1,
                                answer: 9216,
                                to: 2,
                                subto: 3
                            },
                            16: {
                                tip: 1,
                                answer: 120,
                                to: 2,
                                subto: 3
                            },
                            17: {
                                tip: 1,
                                answer: -120,
                                to: 2,
                                subto: 3
                            },
                        }
                    },
                    4: {
                        title: 'Műveletek - Osztás',
                        title2: '',
                        exercise: 'Döntsd el, hogy az alábbi összeadások eredményei negatívak vagy pozitívak! Írd be a megfelelő jelet: pozitív (+) vagy negatív (-)!',
                        exercise2: 'Írd be a helyes eredményt',
                        change: 10,
                        url: 'XvOykLfIAk8,92zkNeANLhc',
                        answers : {
                            1: {
                                tip: 1,
                                answer: '+',
                                to: 2,
                                subto: 4
                            },
                            2: {
                                tip: 1,
                                answer: '-',
                                to: 2,
                                subto: 4
                            },
                            3: {
                                tip: 1,
                                answer: '-',
                                to: 2,
                                subto: 4
                            },
                            4: {
                                tip: 1,
                                answer: '+',
                                to: 2,
                                subto: 4
                            },
                            5: {
                                tip: 1,
                                answer: '-',
                                to: 2,
                                subto: 4
                            },
                            6: {
                                tip: 1,
                                answer: '+',
                                to: 2,
                                subto: 4
                            },
                            7: {
                                tip: 1,
                                answer: '+',
                                to: 2,
                                subto: 4
                            },
                            8: {
                                tip: 1,
                                answer: '-',
                                to: 2,
                                subto: 4
                            },
                            9: {
                                tip: 1,
                                answer: '+',
                                to: 2,
                                subto: 4
                            },
                            10: {
                                tip: 1,
                                answer: -83,
                                to: 2,
                                subto: 4
                            },
                            11: {
                                tip: 1,
                                answer: -73,
                                to: 2,
                                subto: 4
                            },
                            12: {
                                tip: 1,
                                answer: 29,
                                to: 2,
                                subto: 4
                            },
                            13: {
                                tip: 1,
                                answer: 0,
                                to: 2,
                                subto: 4
                            },
                            14: {
                                tip: 1,
                                answer: 11,
                                to: 2,
                                subto: 4
                            },
                            15: {
                                tip: 1,
                                answer: 7,
                                to: 2,
                                subto: 4
                            },
                        }
                    },
                    5: {
                        title: 'Műveletek - Természetes számmal való hatványozás',
                        title2: '',
                        exercise: 'Döntsd el, hogy az alábbi összeadások eredményei negatívak vagy pozitívak! Írd be a megfelelő jelet: pozitív (+) vagy negatív (-)!',
                        exercise2: 'Írd be vagy válaszd ki a helyes eredményt',
                        change: 12,
                        url: 'FWK4FfwAeEU,QiFbCw-ztfo',
                        answers : {
                            1: {
                                tip: 1,
                                answer: '+',
                                to: 2,
                                subto: 5
                            },
                            2: {
                                tip: 1,
                                answer: '-',
                                to: 2,
                                subto: 5
                            },
                            3: {
                                tip: 1,
                                answer: '-',
                                to: 2,
                                subto: 5
                            },
                            4: {
                                tip: 1,
                                answer: '+',
                                to: 2,
                                subto: 5
                            },
                            5: {
                                tip: 1,
                                answer: '-',
                                to: 2,
                                subto: 5
                            },
                            6: {
                                tip: 1,
                                answer: '+',
                                to: 2,
                                subto: 5
                            },
                            7: {
                                tip: 1,
                                answer: '+',
                                to: 2,
                                subto: 5
                            },
                            8: {
                                tip: 1,
                                answer: '-',
                                to: 2,
                                subto: 5
                            },
                            9: {
                                tip: 1,
                                answer: '-',
                                to: 2,
                                subto: 5
                            },
                            10: {
                                tip: 1,
                                answer: '-',
                                to: 2,
                                subto: 5
                            },
                            11: {
                                tip: 1,
                                answer: '+',
                                to: 2,
                                subto: 5
                            },
                            12: {
                                tip: 1,
                                answer: 64,
                                to: 2,
                                subto: 5
                            },
                            13: {
                                tip: 1,
                                answer: -512,
                                to: 2,
                                subto: 5
                            },
                            14: {
                                tip: 1,
                                answer: -1024,
                                to: 2,
                                subto: 5
                            },
                            15: {
                                tip: 1,
                                answer: -27,
                                to: 2,
                                subto: 5
                            },
                            16: {
                                tip: 1,
                                answer: 1,
                                to: 2,
                                subto: 5
                            },
                            17: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 2,
                                    c: 1
                                },
                                subto: {
                                    a: 5,
                                    c: 5
                                },
                            },
                            18: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 2,
                                    c: 1
                                },
                                subto: {
                                    b: 5,
                                    c: 5
                                },
                            },
                            19: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 2,
                                    c: 1
                                },
                                subto: {
                                    a: 5,
                                    c: 5
                                },
                            },
                            20: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 2,
                                    c: 1
                                },
                                subto: {
                                    b: 5,
                                    c: 5
                                },
                            },
                        }
                    },
                    6: {
                        title: 'Műveletek sorrendje',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Válaszd ki a helyes eredményt!',
                        url: 'IpWVEMfBPXE,CRxvDX15_3g',
                        answers : {
                            1: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 1,
                                    c: 2
                                },
                                subto: {
                                    a: 6,
                                    c: 1
                                },
                            },
                            2: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 2,
                                    c: 2,
                                    d: 1
                                },
                                subto: {
                                    b: 4,
                                    c: 5,
                                    d: 6
                                },
                            },
                            3: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 1,
                                    d: 2,
                                    d: 1
                                },
                                subto: {
                                    a: 4,
                                    b: 5,
                                    d: 6
                                },
                            },
                            4: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 2,
                                    c: 1,
                                    d: 2
                                },
                                subto: {
                                    b: 5,
                                    c: 6,
                                    d: 6
                                },
                            },
                            5: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 2,
                                    b: 2,
                                    d: 2
                                },
                                subto: {
                                    a: 5,
                                    b: 5,
                                    d: 1
                                },
                            },
                        }
                    },
                    7: {
                        title: 'Zárójelek használata',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Válaszd ki a helyes eredményt!',
                        url: 'ePdxWpGDDUY',
                        answers : {
                            1: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 2,
                                    c: 2,
                                    d: 2
                                },
                                subto: {
                                    a: 1,
                                    c: 3,
                                    d: 1
                                },
                            },
                            2: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 1,
                                    b: 1,
                                    d: 2
                                },
                                subto: {
                                    a: 6,
                                    b: 6,
                                    d: 1
                                },
                            },
                            3: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 1,
                                    c: 2,
                                    d: 2
                                },
                                subto: {
                                    b: 6,
                                    c: 5,
                                    d: 1
                                },
                            },
                            4: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 2,
                                    c: 1,
                                    d: 2
                                },
                                subto: {
                                    a: 5,
                                    c: 6,
                                    d: 1
                                },
                            },
                        }
                    },
                    8: {
                        title: 'Betűkkel való műveletek',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Válaszd ki a helyes eredményt!',
                        url: 'zWWOvjL71Bk,a_OPNOTuhH4,l0dKPtzmMoA,KIOlYj-v96k,r8s23m8wVbs,H2rj2yTw5zs,SDqYmayXZbQ',
                        answers : {
                            1: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 2,
                                    c: 2,
                                },
                                subto: {
                                    a: 5,
                                    c: 1,
                                },
                            },
                            2: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 2,
                                    c: 2,
                                },
                                subto: {
                                    b: 5,
                                    c: 1,
                                },
                            },
                            3: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 2,
                                    c: 2,
                                },
                                subto: {
                                    b: 5,
                                    c: 1,
                                },
                            },
                            4: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 2,
                                    c: 2,
                                },
                                subto: {
                                    b: 5,
                                    c: 1,
                                },
                            },
                            5: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 2,
                                    c: 2,
                                },
                                subto: {
                                    b: 5,
                                    c: 1,
                                },
                            },
                            6: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 2,
                                    b: 2,
                                    d: 2,
                                },
                                subto: {
                                    a: 5,
                                    b: 5,
                                    d: 3,
                                },
                            },
                            7: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 2,
                                    c: 2,
                                    d: 2,
                                },
                                subto: {
                                    b: 5,
                                    c: 5,
                                    d: 3,
                                },
                            },
                        }
                    },
                    9: {
                        title: 'Összetett feladatok',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Válaszd ki a helyes eredményt!',
                        url: '',
                        answers : {
                            1: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 2,
                                    b: 2,
                                    d: 1
                                },
                                subto: {
                                    a: 3,
                                    b: 3,
                                    d: 6
                                },
                            },
                            2: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 2,
                                    b: 2,
                                    d: 1
                                },
                                subto: {
                                    a: 5,
                                    b: 5,
                                    d: 6
                                },
                            },
                            3: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 1,
                                    c: 1,
                                    d: 1
                                },
                                subto: {
                                    b: 6,
                                    c: 7,
                                    d: 7
                                },
                            },
                            4: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 2,
                                    b: 1,
                                    d: 1
                                },
                                subto: {
                                    a: 3,
                                    b: 6,
                                    d: 6
                                },
                            },
                            5: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 2,
                                    c: 2,
                                    d: 2
                                },
                                subto: {
                                    a: 3,
                                    c: 6,
                                    d: 6
                                },
                            },
                            6: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 2,
                                    b: 1,
                                    d: 1
                                },
                                subto: {
                                    a: 5,
                                    b: 6,
                                    d: 6
                                },
                            },
                            7: {
                                tip: 1,
                                answer: -2,
                                to: 2,
                                subto: 5
                            },
                            8: {
                                tip: 1,
                                answer: 0,
                                to: 2,
                                subto: 1
                            },
                        }
                    }
                },
                3: {
                    title: 'Racionális számok halmaza',
                    1: {
                        title: 'Közönséges törtek bővítése',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be a helyes eredményt a/b alakba!',
                        url: '-2Fac_ez6_E,BXPJGm6NL7U,Fry00BVVRwc',
                        answers : {
                            1: {
                                tip: 1,
                                answer: '8/12',
                                to: 3,
                                subto: 1
                            },
                            2: {
                                tip: 1,
                                answer: '-15/6',
                                to: 3,
                                subto: 1
                            },
                            3: {
                                tip: 1,
                                answer: '195/117',
                                to: 3,
                                subto: 1
                            },
                            4: {
                                tip: 1,
                                answer: '230/170',
                                to: 3,
                                subto: 1
                            },
                            5: {
                                tip: 1,
                                answer: '-1196/989',
                                to: 3,
                                subto: 1
                            },
                        }
                    },
                    2: {
                        title: 'Közönséges törtek egyszerűsítése',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be a helyes eredményt a/b alakba!',
                        url: 'VFPDgdA29Zs',
                        answers : {
                            1: {
                                tip: 1,
                                answer: '3/2',
                                to: 3,
                                subto: 2
                            },
                            2: {
                                tip: 1,
                                answer: '-37/9',
                                to: 3,
                                subto: 2
                            },
                            3: {
                                tip: 1,
                                answer: '135/73',
                                to: 3,
                                subto: 2
                            },
                            4: {
                                tip: 1,
                                answer: '-353/73',
                                to: 3,
                                subto: 2
                            },
                            5: {
                                tip: 1,
                                answer: '115/231',
                                to: 3,
                                subto: 2
                            },
                        }
                    },
                    3: {
                        title: 'Közönséges tört tizedes törtté alakítása',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be a közönséges törtnek megfelelő tizedestört alakot!',
                        url: 'BXPJGm6NL7U, ',
                        answers : {
                            1: {
                                tip: 1,
                                answer: '4',
                                to: 3,
                                subto: 3
                            },
                            2: {
                                tip: 1,
                                answer: '0,05',
                                to: 3,
                                subto: 3
                            },
                            3: {
                                tip: 1,
                                answer: '12,5',
                                to: 3,
                                subto: 3
                            },
                            4: {
                                tip: 1,
                                answer: '-8,75',
                                to: 3,
                                subto: 3
                            },
                            5: {
                                tip: 1,
                                answer: '-20,6',
                                to: 3,
                                subto: 3
                            },
                            6: {
                                tip: 1,
                                answer: '12,125',
                                to: 3,
                                subto: 3
                            },
                            7: {
                                tip: 1,
                                answer: '16,5625',
                                to: 3,
                                subto: 3
                            },
                            8: {
                                tip: 1,
                                answer: '-0,(6)',
                                to: 3,
                                subto: 3
                            },
                            9: {
                                tip: 1,
                                answer: '8,(1)',
                                to: 3,
                                subto: 3
                            },
                            10: {
                                tip: 1,
                                answer: '4,(09)',
                                to: 3,
                                subto: 3
                            },
                            11: {
                                tip: 1,
                                answer: '-2,6(7)',
                                to: 3,
                                subto: 3
                            },
                            12: {
                                tip: 1,
                                answer: '3,2(79)',
                                to: 3,
                                subto: 3
                            },
                            13: {
                                tip: 1,
                                answer: '-4,58(5)',
                                to: 3,
                                subto: 3
                            },
                            14: {
                                tip: 1,
                                answer: '4,92(54)',
                                to: 3,
                                subto: 3
                            },
                        }
                    },
                    4: {
                        title: 'Tizedes tört közönséges törtté alakítása',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be a tizedes törtnek megfelelő közönséges tört alakot a/b, irreducibilis alakban!',
                        url: 'NHcN68Bvi0o',
                        answers : {
                            1: {
                                tip: 1,
                                answer: '1/50',
                                to: 3,
                                subto: 4
                            },
                            2: {
                                tip: 1,
                                answer: '24/25',
                                to: 3,
                                subto: 4
                            },
                            3: {
                                tip: 1,
                                answer: '-29/5',
                                to: 3,
                                subto: 4
                            },
                            4: {
                                tip: 1,
                                answer: '428/25',
                                to: 3,
                                subto: 4
                            },
                            5: {
                                tip: 1,
                                answer: '-929/40',
                                to: 3,
                                subto: 4
                            },
                            6: {
                                tip: 1,
                                answer: '1/3',
                                to: 3,
                                subto: 4
                            },
                            7: {
                                tip: 1,
                                answer: '51/9',
                                to: 3,
                                subto: 4
                            },
                            8: {
                                tip: 1,
                                answer: '-695/99',
                                to: 3,
                                subto: 4
                            },
                            9: {
                                tip: 1,
                                answer: '-127/6',
                                to: 3,
                                subto: 4
                            },
                            10: {
                                tip: 1,
                                answer: '5539/900',
                                to: 3,
                                subto: 4
                            },
                            11: {
                                tip: 1,
                                answer: '1993/990',
                                to: 3,
                                subto: 4
                            },
                            12: {
                                tip: 1,
                                answer: '7802/2475',
                                to: 3,
                                subto: 4
                            },
                            13: {
                                tip: 1,
                                answer: '-1561/4995',
                                to: 3,
                                subto: 4
                            },
                        }
                    },
                    5: {
                        title: 'Műveletek - Összeadás (Közönséges tört)',
                        title2: 'Műveletek - Összeadás (Tizedes tört)',
                        exercise: 'Írd be vagy válaszd ki a helyes eredményt. A válaszod a/b irreducibilis alakba írd be!',
                        exercise2: 'Írd be vagy válaszd ki a helyes eredményt. A válaszod tizedes tört alakba írd be!',
                        change: 13,
                        url: 'ivLs2zqpga8,5al5ggKHIrQ,rD4ZTxyKtQM',
                        answers : {
                            1: {
                                tip: 1,
                                answer: '7/8',
                                to: 3,
                                subto: 5
                            },
                            2: {
                                tip: 1,
                                answer: '31/3',
                                to: 3,
                                subto: 5
                            },
                            3: {
                                tip: 1,
                                answer: '94/7',
                                to: 3,
                                subto: 5
                            },
                            4: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 3,
                                    c: 3
                                },
                                subto: {
                                    a: 2,
                                    c: 1
                                },
                            },
                            5: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 3,
                                    c: 3,
                                    d: 3,
                                    e: 3,
                                },
                                subto: {
                                    b: 5,
                                    c: 2,
                                    d: 5,
                                    e: 1,
                                },
                            },
                            6: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 3,
                                    c: 3,
                                    d: 3
                                },
                                subto: {
                                    a: 5,
                                    c: 2,
                                    d: 1
                                },
                            },
                            7: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 3,
                                    c: 3,
                                    d: 3
                                },
                                subto: {
                                    b: 2,
                                    c: 5,
                                    d: 1
                                },
                            },
                            8: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 3,
                                    b: 3,
                                    d: 3
                                },
                                subto: {
                                    a: 2,
                                    b: 5,
                                    d: 1
                                },
                            },
                            9: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 3,
                                    b: 2,
                                    d: 3
                                },
                                subto: {
                                    a: 2,
                                    b: 4,
                                    d: 1
                                },
                            },
                            10: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 2, 
                                    c: 3,
                                    d: 2,
                                    e: 3,
                                    f: 2,
                                    g: 3,
                                    h: 3,
                                    i: 3
                                },
                                subto: {
                                    b: 4, 
                                    c: 2,
                                    d: 4,
                                    e: 2,
                                    f: 4,
                                    g: 5,
                                    h: 5,
                                    i: 1
                                },
                            },
                            11: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 3,
                                    b: 3,
                                    d: 3
                                },
                                subto: {
                                    a: 5,
                                    b: 5,
                                    d: 1
                                },
                            },
                            12: {
                                tip: 1,
                                answer: '63/32',
                                to: 3,
                                subto: 5
                            },
                            13: {
                                tip: 1,
                                answer: '25,5',
                                to: 3,
                                subto: 5
                            },
                            14: {
                                tip: 1,
                                answer: '7,5',
                                to: 3,
                                subto: 5
                            },
                            15: {
                                tip: 1,
                                answer: '16,5',
                                to: 3,
                                subto: 5
                            },
                            16: {
                                tip: 1,
                                answer: '32,12',
                                to: 3,
                                subto: 5
                            },
                            17: {
                                tip: 1,
                                answer: '32,71',
                                to: 3,
                                subto: 5
                            },
                            18: {
                                tip: 1,
                                answer: '24,54',
                                to: 3,
                                subto: 5
                            },
                            19: {
                                tip: 1,
                                answer: '15,68',
                                to: 3,
                                subto: 5
                            },
                            20: {
                                tip: 1,
                                answer: '20,92',
                                to: 3,
                                subto: 5
                            },
                            21: {
                                tip: 1,
                                answer: '27,16',
                                to: 3,
                                subto: 5
                            },
                            22: {
                                tip: 1,
                                answer: '17,76',
                                to: 3,
                                subto: 5
                            },
                            23: {
                                tip: 1,
                                answer: '94,828',
                                to: 3,
                                subto: 5
                            },
                            24: {
                                tip: 1,
                                answer: '123,998',
                                to: 3,
                                subto: 5
                            },
                            25: {
                                tip: 1,
                                answer: '105,967',
                                to: 3,
                                subto: 5
                            },
                            26: {
                                tip: 1,
                                answer: '55,872',
                                to: 3,
                                subto: 5
                            },
                            27: {
                                tip: 1,
                                answer: '96,762',
                                to: 3,
                                subto: 5
                            },
                            28: {
                                tip: 1,
                                answer: '133,332',
                                to: 3,
                                subto: 5
                            },
                        }
                    },
                    6: {
                        title: 'Műveletek - Kivonás (Közönséges tört)',
                        title2: 'Műveletek - Kivonás (Tizedes tört)',
                        exercise: 'Írd be vagy válaszd ki a helyes eredményt. A válaszod a/b irreducibilis alakba írd be!',
                        exercise2: 'Írd be vagy válaszd ki a helyes eredményt. A válaszod tizedes tört alakba írd be!',
                        change: 14,
                        url: 'xbbc9qPp8vw,5al5ggKHIrQ,rD4ZTxyKtQM',
                        answers : {
                            1: {
                                tip: 1,
                                answer: '-1/8',
                                to: 3,
                                subto: 6
                            },
                            2: {
                                tip: 1,
                                answer: '13/3',
                                to: 3,
                                subto: 6
                            },
                            3: {
                                tip: 1,
                                answer: '-9/4',
                                to: 3,
                                subto: 6
                            },
                            4: {
                                tip: 1,
                                answer: '37/5',
                                to: 3,
                                subto: 6
                            },
                            5: {
                                tip: 1,
                                answer: '-63/37',
                                to: 3,
                                subto: 6
                            },
                            6: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 3,
                                    c: 3,
                                    d: 3
                                },
                                subto: {
                                    a: 2,
                                    c: 6,
                                    d: 2
                                },
                            },
                            7: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 3,
                                    c: 3,
                                    d: 3,
                                    e: 3,
                                },
                                subto: {
                                    b: 6,
                                    c: 2,
                                    d: 6,
                                    e: 1,
                                },
                            },
                            8: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 3,
                                    c: 3,
                                    d: 3
                                },
                                subto: {
                                    a: 6,
                                    c: 2,
                                    d: 1
                                },
                            },
                            9: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 3,
                                    c: 3,
                                    d: 3
                                },
                                subto: {
                                    b: 2,
                                    c: 6,
                                    d: 1
                                },
                            },
                            10: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 3,
                                    b: 3,
                                    d: 3
                                },
                                subto: {
                                    a: 2,
                                    b: 6,
                                    d: 1
                                },
                            },
                            11: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 2,
                                    b: 2,
                                    d: 3
                                },
                                subto: {
                                    a: 2,
                                    b: 2,
                                    d: 1
                                },
                            },
                            12: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 2, 
                                    c: 3,
                                    d: 2,
                                    e: 3,
                                    f: 2,
                                    g: 2,
                                    h: 2,
                                    i: 3,
                                    j: 3,
                                    k: 3
                                },
                                subto: {
                                    b: 2, 
                                    c: 2,
                                    d: 2,
                                    e: 2,
                                    f: 2,
                                    g: 2,
                                    h: 2,
                                    i: 6,
                                    j: 6,
                                    k: 6
                                },
                            },
                            13: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 3,
                                    b: 3,
                                    d: 3
                                },
                                subto: {
                                    a: 6,
                                    b: 6,
                                    d: 1
                                },
                            },
                            14: {
                                tip: 1,
                                answer: '8,7',
                                to: 3,
                                subto: 6
                            },
                            15: {
                                tip: 1,
                                answer: '-8,75',
                                to: 3,
                                subto: 6
                            },
                            16: {
                                tip: 1,
                                answer: '8,257',
                                to: 3,
                                subto: 6
                            },
                            17: {
                                tip: 1,
                                answer: '36,5',
                                to: 3,
                                subto: 6
                            },
                            18: {
                                tip: 1,
                                answer: '-36,2',
                                to: 3,
                                subto: 6
                            },
                            19: {
                                tip: 1,
                                answer: '-35,7',
                                to: 3,
                                subto: 6
                            },
                            20: {
                                tip: 1,
                                answer: '36,35',
                                to: 3,
                                subto: 6
                            },
                            21: {
                                tip: 1,
                                answer: '35,79',
                                to: 3,
                                subto: 6
                            },
                            22: {
                                tip: 1,
                                answer: '36,354',
                                to: 3,
                                subto: 6
                            },
                            23: {
                                tip: 1,
                                answer: '-35,663',
                                to: 3,
                                subto: 6
                            },
                            24: {
                                tip: 1,
                                answer: '19,22',
                                to: 3,
                                subto: 6
                            },
                            25: {
                                tip: 1,
                                answer: '-18,72',
                                to: 3,
                                subto: 6
                            },
                            26: {
                                tip: 1,
                                answer: '-19,1',
                                to: 3,
                                subto: 6
                            },
                            27: {
                                tip: 1,
                                answer: '19,27',
                                to: 3,
                                subto: 6
                            },
                            28: {
                                tip: 1,
                                answer: '18,76',
                                to: 3,
                                subto: 6
                            },
                            29: {
                                tip: 1,
                                answer: '19,502',
                                to: 3,
                                subto: 6
                            },
                            30: {
                                tip: 1,
                                answer: '-19,368',
                                to: 3,
                                subto: 6
                            },
                            31: {
                                tip: 1,
                                answer: '18,682',
                                to: 3,
                                subto: 6
                            },
                            32: {
                                tip: 1,
                                answer: '-40,321',
                                to: 3,
                                subto: 6
                            },
                            33: {
                                tip: 1,
                                answer: '39,821',
                                to: 3,
                                subto: 6
                            },
                            34: {
                                tip: 1,
                                answer: '40,201',
                                to: 3,
                                subto: 6
                            },
                            35: {
                                tip: 1,
                                answer: '-40,371',
                                to: 3,
                                subto: 6
                            },
                            36: {
                                tip: 1,
                                answer: '39,631',
                                to: 3,
                                subto: 6
                            },
                            37: {
                                tip: 1,
                                answer: '40,42',
                                to: 3,
                                subto: 6
                            },
                            38: {
                                tip: 1,
                                answer: '-40,307',
                                to: 3,
                                subto: 6
                            },
                            39: {
                                tip: 1,
                                answer: '-40,28',
                                to: 3,
                                subto: 6
                            },
                            40: {
                                tip: 1,
                                answer: '40,165',
                                to: 3,
                                subto: 6
                            },
                            41: {
                                tip: 1,
                                answer: '39,82',
                                to: 3,
                                subto: 6
                            },
                            42: {
                                tip: 1,
                                answer: '39,806',
                                to: 3,
                                subto: 6
                            },
                            43: {
                                tip: 1,
                                answer: '-39,69',
                                to: 3,
                                subto: 6
                            },
                            44: {
                                tip: 1,
                                answer: '39,554',
                                to: 3,
                                subto: 6
                            },
                            45: {
                                tip: 1,
                                answer: '40,3976',
                                to: 3,
                                subto: 6
                            },
                        }
                    },
                    7: {
                        title: 'Műveletek - Szorzás (Közönséges tört)',
                        title2: 'Műveletek - Szorzás (Tizedes tört)',
                        exercise: 'Írd be vagy válaszd ki a helyes eredményt. A válaszod a/b irreducibilis alakba írd be!',
                        exercise2: 'Írd be vagy válaszd ki a helyes eredményt. A válaszod tizedes tört alakba írd be!',
                        change: 12,
                        url: 'bPZ0b_-uz2Y,OWOfLI-xuSc,lfZPyDdCgnI',
                        answers : {
                            1: {
                                tip: 1,
                                answer: '6/35',
                                to: 3,
                                subto: 7
                            },
                            2: {
                                tip: 1,
                                answer: '-28/15',
                                to: 3,
                                subto: 7
                            },
                            3: {
                                tip: 1,
                                answer: '1/72',
                                to: 3,
                                subto: 7
                            },
                            4: {
                                tip: 1,
                                answer: '21/5',
                                to: 3,
                                subto: 7
                            },
                            5: {
                                tip: 1,
                                answer: '49/13',
                                to: 3,
                                subto: 7
                            },
                            6: {
                                tip: 1,
                                answer: '1/2024',
                                to: 3,
                                subto: 7
                            },
                            7: {
                                tip: 2,
                                answer: 'd',
                                to: {
                                    a: 3,
                                    b: 3,
                                    c: 3,
                                    e: 3,
                                },
                                subto: {
                                    a: 2,
                                    b: 7,
                                    c: 7,
                                    d: 1
                                },
                            },
                            8: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 3,
                                    c: 3,
                                    d: 3,
                                    e: 3,
                                },
                                subto: {
                                    a: 2,
                                    c: 2,
                                    d: 2,
                                    e: 1,
                                },
                            },
                            9: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 3,
                                    c: 3,
                                    d: 3,
                                    e: 3,
                                    f: 3
                                },
                                subto: {
                                    b: 2,
                                    c: 2,
                                    d: 2,
                                    e: 2,
                                    f: 1
                                },
                            },
                            10: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 3,
                                    b: 3,
                                    d: 3,
                                    e: 3,
                                    f: 3,
                                    g: 3,
                                    h: 3
                                },
                                subto: {
                                    a: 2,
                                    b: 2,
                                    d: 2,
                                    e: 7,
                                    f: 2,
                                    g: 7,
                                    h: 1
                                },
                            },
                            11: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 3,
                                    c: 3,
                                    d: 3,
                                    e: 3,
                                    f: 3
                                },
                                subto: {
                                    a: 7,
                                    c: 2,
                                    d: 2,
                                    e: 2,
                                    f: 1
                                },
                            },
                            12: {
                                tip: 1,
                                answer: '25,8',
                                to: 3,
                                subto: 7
                            },
                            13: {
                                tip: 1,
                                answer: '61,5',
                                to: 3,
                                subto: 7
                            },
                            14: {
                                tip: 1,
                                answer: '128,04',
                                to: 3,
                                subto: 7
                            },
                            15: {
                                tip: 1,
                                answer: '74,256',
                                to: 3,
                                subto: 7
                            },
                            16: {
                                tip: 1,
                                answer: '85,722',
                                to: 3,
                                subto: 7
                            },
                            17: {
                                tip: 1,
                                answer: '87,8608',
                                to: 3,
                                subto: 7
                            },
                            18: {
                                tip: 1,
                                answer: '88,13916',
                                to: 3,
                                subto: 7
                            },
                            19: {
                                tip: 1,
                                answer: '0,039483',
                                to: 3,
                                subto: 7
                            },
                            20: {
                                tip: 1,
                                answer: '-28,56',
                                to: 3,
                                subto: 7
                            },
                            21: {
                                tip: 1,
                                answer: '-6725,74',
                                to: 3,
                                subto: 7
                            },
                            22: {
                                tip: 1,
                                answer: '82204',
                                to: 3,
                                subto: 7
                            },
                            23: {
                                tip: 1,
                                answer: '66,0114',
                                to: 3,
                                subto: 7
                            },
                            24: {
                                tip: 1,
                                answer: '1,6',
                                to: 3,
                                subto: 7
                            },
                            25: {
                                tip: 1,
                                answer: '-0,625',
                                to: 3,
                                subto: 7
                            },
                            26: {
                                tip: 1,
                                answer: '-0,09(481)',
                                to: 3,
                                subto: 7
                            },
                        }
                    },
                    8: {
                        title: 'Műveletek - Osztás (Közönséges tört)',
                        title2: 'Műveletek - Osztás (Tizedes tört)',
                        exercise: 'Írd be vagy válaszd ki a helyes eredményt. A válaszod a/b irreducibilis alakba írd be!',
                        exercise2: 'Írd be vagy válaszd ki a helyes eredményt. A válaszod tizedes tört alakba írd be!',
                        change: 12,
                        url: 'Xrya82PV_h8,OWOfLI-xuSc,bMB_RH-5Kmw,wZ2k-Q7QeCg',
                        answers : {
                            1: {
                                tip: 1,
                                answer: '28/15',
                                to: 3,
                                subto: 8
                            },
                            2: {
                                tip: 1,
                                answer: '-18/91',
                                to: 3,
                                subto: 8
                            },
                            3: {
                                tip: 1,
                                answer: '31/21',
                                to: 3,
                                subto: 8
                            },
                            4: {
                                tip: 1,
                                answer: '8/99',
                                to: 3,
                                subto: 8
                            },
                            5: {
                                tip: 1,
                                answer: '68',
                                to: 3,
                                subto: 8
                            },
                            6: {
                                tip: 1,
                                answer: '25/13',
                                to: 3,
                                subto: 8
                            },
                            7: {
                                tip: 2,
                                answer: 'd',
                                to: {
                                    a: 3,
                                    b: 3,
                                    c: 3,
                                    e: 3,
                                },
                                subto: {
                                    a: 2,
                                    b: 8,
                                    c: 8,
                                    e: 1,
                                },
                            },
                            8: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 3,
                                    c: 3,
                                    d: 3,
                                    e: 3,
                                },
                                subto: {
                                    a: 2,
                                    c: 2,
                                    d: 2,
                                    e: 1,
                                },
                            },
                            9: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 3,
                                    c: 3,
                                    d: 3,
                                    e: 3,
                                },
                                subto: {
                                    b: 2,
                                    c: 2,
                                    d: 2,
                                    e: 1,
                                },
                            },
                            10: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 3,
                                    b: 3,
                                    d: 3,
                                    e: 3,
                                    f: 3,
                                    g: 3,
                                    h: 3
                                },
                                subto: {
                                    a: 2,
                                    c: 2,
                                    d: 2,
                                    e: 8,
                                    f: 2,
                                    g: 8,
                                    h: 1
                                },
                            },
                            11: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 3,
                                    c: 3,
                                    d: 3,
                                    e: 3,
                                },
                                subto: {
                                    b: 2,
                                    c: 2,
                                    d: 2,
                                    e: 1,
                                },
                            },
                            12: {
                                tip: 1,
                                answer: '8,5',
                                to: 3,
                                subto: 8
                            },
                            13: {
                                tip: 1,
                                answer: '5',
                                to: 3,
                                subto: 8
                            },
                            14: {
                                tip: 1,
                                answer: '9,7',
                                to: 3,
                                subto: 8
                            },
                            15: {
                                tip: 1,
                                answer: '6,24',
                                to: 3,
                                subto: 8
                            },
                            16: {
                                tip: 1,
                                answer: '7,8',
                                to: 3,
                                subto: 8
                            },
                            17: {
                                tip: 1,
                                answer: '12,34',
                                to: 3,
                                subto: 8
                            },
                            18: {
                                tip: 1,
                                answer: '4,754',
                                to: 3,
                                subto: 8
                            },
                            19: {
                                tip: 1,
                                answer: '0,123',
                                to: 3,
                                subto: 8
                            },
                            20: {
                                tip: 1,
                                answer: '-8',
                                to: 3,
                                subto: 8
                            },
                            21: {
                                tip: 1,
                                answer: '-67,2574',
                                to: 3,
                                subto: 8
                            },
                            22: {
                                tip: 1,
                                answer: '8,2204',
                                to: 3,
                                subto: 8
                            },
                            23: {
                                tip: 1,
                                answer: '-7,254',
                                to: 3,
                                subto: 8
                            },
                            24: {
                                tip: 1,
                                answer: '0,8(3)',
                                to: 3,
                                subto: 8
                            },
                            25: {
                                tip: 1,
                                answer: '-1,(3)',
                                to: 3,
                                subto: 8
                            },
                            26: {
                                tip: 1,
                                answer: '-11,25',
                                to: 3,
                                subto: 8
                            },
                        }
                    },
                    9: {
                        title: 'Műveletek - Egész számmal való hatványozás (Közönséges tört)',
                        title2: 'Műveletek - Egész számmal való hatványozás (Tizedes tört)',
                        exercise: 'Írd be vagy válaszd ki a helyes eredményt. A válaszod a/b irreducibilis alakba írd be!',
                        exercise2: 'Írd be vagy válaszd ki a helyes eredményt. A válaszod tizedes tört alakba írd be!',
                        change: 17,
                        url: '2eDXoN15EEE,9024PmN1NhE,gaHaasv8u5Q',
                        answers : {
                            1: {
                                tip: 1,
                                answer: '8/125',
                                to: 3,
                                subto: 9
                            },
                            2: {
                                tip: 1,
                                answer: '1/243',
                                to: 3,
                                subto: 9
                            },
                            3: {
                                tip: 1,
                                answer: '1',
                                to: 3,
                                subto: 9
                            },
                            4: {
                                tip: 1,
                                answer: '123/321',
                                to: 3,
                                subto: 9
                            },
                            5: {
                                tip: 1,
                                answer: '-125/64',
                                to: 3,
                                subto: 9
                            },
                            6: {
                                tip: 1,
                                answer: '2041/81',
                                to: 3,
                                subto: 9
                            },
                            7: {
                                tip: 1,
                                answer: '1',
                                to: 3,
                                subto: 9
                            },
                            8: {
                                tip: 1,
                                answer: '-13/6',
                                to: 3,
                                subto: 9
                            },
                            9: {
                                tip: 1,
                                answer: '3/2',
                                to: 3,
                                subto: 9
                            },
                            10: {
                                tip: 1,
                                answer: '125/64',
                                to: 3,
                                subto: 9
                            },
                            11: {
                                tip: 1,
                                answer: '16/49',
                                to: 3,
                                subto: 9
                            },
                            12: {
                                tip: 1,
                                answer: '-1/128',
                                to: 3,
                                subto: 9
                            },
                            13: {
                                tip: 1,
                                answer: '1/64',
                                to: 3,
                                subto: 9
                            },
                            14: {
                                tip: 1,
                                answer: '64/729',
                                to: 3,
                                subto: 9
                            },
                            15: {
                                tip: 1,
                                answer: '625/256',
                                to: 3,
                                subto: 9
                            },
                            16: {
                                tip: 1,
                                answer: '-1/512',
                                to: 3,
                                subto: 9
                            },
                            17: {
                                tip: 1,
                                answer: '8,41',
                                to: 3,
                                subto: 7
                            },
                            18: {
                                tip: 1,
                                answer: '0,0144',
                                to: 3,
                                subto: 7
                            },
                            19: {
                                tip: 1,
                                answer: '-39,304',
                                to: 3,
                                subto: 7
                            },
                            20: {
                                tip: 1,
                                answer: '1',
                                to: 3,
                                subto: 9
                            },
                            21: {
                                tip: 1,
                                answer: '11,32',
                                to: 3,
                                subto: 9
                            },
                            22: {
                                tip: 1,
                                answer: '12,812904',
                                to: 3,
                                subto: 7
                            },
                            23: {
                                tip: 1,
                                answer: '0,00001',
                                to: 3,
                                subto: 7
                            },
                            24: {
                                tip: 1,
                                answer: '-0,000001',
                                to: 3,
                                subto: 7
                            }
                        }
                    },
                    10: {
                        title: 'Műveletek sorrendje',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be vagy válaszd ki a helyes eredményt. Közönséges tört esetén használd az a/b, irreducibilis alakot!',
                        url: '41R35-5hE9Q,jEQAwr9OK5E',
                        answers : {
                            1: {
                                tip: 1,
                                answer: '0',
                                to: 3,
                                subto: 5
                            },
                            2: {
                                tip: 1,
                                answer: '-1,3',
                                answer2: '-13/10',
                                to: 3,
                                subto: 5
                            },
                            3: {
                                tip: 1,
                                answer: '0,(3)',
                                answer2: '1/3',
                                to: 3,
                                subto: 4
                            },
                            4: {
                                tip: 1,
                                answer: '1,(3)',
                                answer2: '4/3',
                                to: 3,
                                subto: 4
                            },
                            5: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 3,
                                    b: 3,
                                    d: 3
                                },
                                subto: {
                                    a: 7,
                                    b: 6,
                                    d: 7
                                },
                            },
                            6: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 3,
                                    c: 3,
                                    d: 3,
                                    e: 3,
                                },
                                subto: {
                                    a: 2,
                                    c: 5,
                                    d: 10,
                                    e: 1,
                                },
                            },
                            7: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 3,
                                    b: 3,
                                    d: 3,
                                    e: 3,
                                    f: 3
                                },
                                subto: {
                                    a: 8,
                                    b: 2,
                                    d: 2,
                                    e: 2,
                                    f: 1
                                },
                            },
                        }
                    },
                    11: {
                        title: 'Zárójelek használata',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be vagy válaszd ki a helyes eredményt. Közönséges tört esetén használd az a/b, irreducibilis alakot!',
                        url: '41R35-5hE9Q,jEQAwr9OK5E',
                        answers : {
                            1: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 3,
                                    b: 3,
                                    d: 3,
                                    e: 3,
                                    f: 3
                                },
                                subto: {
                                    a: 8,
                                    b: 2,
                                    d: 2,
                                    e: 8,
                                    f: 1
                                },
                            },
                            2: {
                                tip: 2,
                                answer: 'e',
                                to: {
                                    a: 3,
                                    b: 3,
                                    c: 3,
                                    d: 3,
                                    f: 3
                                },
                                subto: {
                                    a: 2,
                                    b: 6,
                                    c: 2,
                                    d: 7,
                                    f: 1
                                },
                            },
                            3: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 3,
                                    b: 3,
                                    d: 3
                                },
                                subto: {
                                    a: 2,
                                    b: 7,
                                    d: 1
                                },
                            },
                            4: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 3,
                                    c: 3,
                                    d: 3,
                                    e: 3,
                                    f: 3
                                },
                                subto: {
                                    a: 7,
                                    c: 2,
                                    d: 9,
                                    e: 7,
                                    f: 1
                                },
                            },
                            5: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 3,
                                    b: 3,
                                    d: 3
                                },
                                subto: {
                                    a: 12,
                                    b: 12,
                                    d: 1
                                },
                            },
                        }
                    },
                    12: {
                        title: 'Összetett feladatok',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be vagy válaszd ki a helyes eredményt. Közönséges tört esetén használd az a/b, irreducibilis alakot!',
                        url: '',
                        answers : {
                            1: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 3,
                                    c: 3,
                                    d: 3,
                                    e: 3,
                                },
                                subto: {
                                    a: 6,
                                    c: 11,
                                    d: 7,
                                    e: 1,
                                },
                            },
                            2: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 3,
                                    b: 3,
                                    d: 3
                                },
                                subto: {
                                    a: 12,
                                    b: 12,
                                    d: 1
                                },
                            },
                            3: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 3,
                                    c: 3,
                                    d: 3,
                                    e: 3,
                                },
                                subto: {
                                    b: 8,
                                    c: 7,
                                    d: 8,
                                    e: 1,
                                },
                            },
                            4: {
                                tip: 1,
                                answer: '1/2023',
                                to: 3,
                                subto: 12
                            },
                            5: {
                                tip: 1,
                                answer: '99/100',
                                to: 3,
                                subto: 12
                            },
                        }
                    },
                },
                4: {
                    title: 'Valós számok halmaza',
                    1: {
                        title: 'Négyzetgyökvonás',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be a helyes eredményt három tizedesnyi pontossággal!',
                        url: 'DOV5acHW26E,pFKARhzH3tY,zm_781kFyII,,O_fhlg5gCm4,c7Crr0CtqgU,I7TFYa1v9xI',
                        answers : {
                            1: {
                                tip: 1,
                                answer: '25',
                                to: 4,
                                subto: 1
                            },
                            2: {
                                tip: 1,
                                answer: '79',
                                to: 4,
                                subto: 1
                            },
                            3: {
                                tip: 1,
                                answer: '67',
                                to: 4,
                                subto: 1
                            },
                            4: {
                                tip: 1,
                                answer: '181',
                                to: 4,
                                subto: 1
                            },
                            5: {
                                tip: 1,
                                answer: '2,645',
                                to: 4,
                                subto: 1
                            },
                            6: {
                                tip: 1,
                                answer: '8,185',
                                to: 4,
                                subto: 1
                            },
                            7: {
                                tip: 1,
                                answer: '11,09',
                                to: 4,
                                subto: 1
                            },
                            8: {
                                tip: 1,
                                answer: '99,378',
                                to: 4,
                                subto: 1
                            },
                            9: {
                                tip: 1,
                                answer: '11111,111',
                                to: 4,
                                subto: 1
                            },
                            10: {
                                tip: 1,
                                answer: '279,866',
                                to: 4,
                                subto: 1
                            },
                            11: {
                                tip: 1,
                                answer: '27,986',
                                to: 4,
                                subto: 1
                            },
                            12: {
                                tip: 1,
                                answer: '2,798',
                                to: 4,
                                subto: 1
                            },
                        }
                    },
                    2: {
                        title: 'Tényező bevitele a gyökjel alá',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be a helyes eredményt (ha gyököt kell írnod, akkor azt gy(x) alakban írd, mint például √3 → gy(3))!',
                        url: 'IP0FWdtRS0U,Au_gsiuBx0c,UGeVbcnI8ew',
                        answers : {
                            1: {
                                tip: 1,
                                answer: 'gy(12)',
                                to: 4,
                                subto: 2
                            },
                            2: {
                                tip: 1,
                                answer: 'gy(18)',
                                to: 4,
                                subto: 2
                            },
                            3: {
                                tip: 1,
                                answer: 'gy(80)',
                                to: 4,
                                subto: 2
                            },
                            4: {
                                tip: 1,
                                answer: 'gy(275)',
                                to: 4,
                                subto: 2
                            },
                            5: {
                                tip: 1,
                                answer: 'gy(363)',
                                to: 4,
                                subto: 2
                            },
                            6: {
                                tip: 1,
                                answer: 'gy(3757)',
                                to: 4,
                                subto: 2
                            },
                            7: {
                                tip: 1,
                                answer: 'gy(8303)',
                                to: 4,
                                subto: 2
                            },
                            8: {
                                tip: 1,
                                answer: 'gy(768)',
                                to: 4,
                                subto: 2
                            },
                            9: {
                                tip: 1,
                                answer: 'gy(1250)',
                                to: 4,
                                subto: 2
                            },
                        }
                    },
                    3: {
                        title: 'Tényező kiemelése a gyökjel alól',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be a helyes eredményt (ha gyököt kell írnod, akkor azt gy(x) alakban írd, mint például 5√3 → 5gy(3))!',
                        url: 'sjdOpVX_u_M,Zc77DqjXyeY,MXnUcicmK6I',
                        answers : {
                            1: {
                                tip: 1,
                                answer: '2gy(6)',
                                to: 4,
                                subto: 3
                            },
                            2: {
                                tip: 1,
                                answer: '4gy(2)',
                                to: 4,
                                subto: 3
                            },
                            3: {
                                tip: 1,
                                answer: '5gy(7)',
                                to: 4,
                                subto: 3
                            },
                            4: {
                                tip: 1,
                                answer: 'gy(71)',
                                to: 4,
                                subto: 3
                            },
                            5: {
                                tip: 1,
                                answer: '12gy(11)',
                                to: 4,
                                subto: 3
                            },
                            6: {
                                tip: 1,
                                answer: '7gy(23)',
                                to: 4,
                                subto: 3
                            },
                            7: {
                                tip: 1,
                                answer: '14gy(3)',
                                to: 4,
                                subto: 3
                            },
                            8: {
                                tip: 1,
                                answer: '13gy(3)',
                                to: 4,
                                subto: 3
                            },
                            9: {
                                tip: 1,
                                answer: '30gy(17)',
                                to: 4,
                                subto: 3
                            },
                            10: {
                                tip: 1,
                                answer: '77gy(11)',
                                to: 4,
                                subto: 3
                            },
                        }
                    },
                    4: {
                        title: 'Valós szám modulusa/abszolut értéke',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be a helyes eredményt (ha gyököt kell írnod, akkor azt gy(x) alakban írd, mint például √3 → gy(3))!',
                        url: 'ebdD3EfZYGQ,WT11LvADRrs,O5tI0OjzzYk',
                        answers : {
                            1: {
                                tip: 1,
                                answer: '48',
                                to: 4,
                                subto: 4
                            },
                            2: {
                                tip: 1,
                                answer: '159',
                                to: 4,
                                subto: 4
                            },
                            3: {
                                tip: 1,
                                answer: '0',
                                to: 4,
                                subto: 4
                            },
                            4: {
                                tip: 1,
                                answer: '3+gy(5)',
                                to: 4,
                                subto: 4
                            },
                            5: {
                                tip: 1,
                                answer: 'gy(2)-1',
                                to: 4,
                                subto: 4
                            },
                            6: {
                                tip: 1,
                                answer: '2-gy(3)',
                                to: 4,
                                subto: 4
                            },
                            7: {
                                tip: 1,
                                answer: 'gy(3)-1',
                                to: 4,
                                subto: 4
                            },
                            8: {
                                tip: 1,
                                answer: '3-gy(5)',
                                to: 4,
                                subto: 4
                            },
                            9: {
                                tip: 1,
                                answer: 'gy(5)-gy(3)',
                                to: 4,
                                subto: 4
                            },
                            10: {
                                tip: 1,
                                answer: 'gy(11)-gy(7)',
                                to: 4,
                                subto: 4
                            },
                            11: {
                                tip: 1,
                                answer: '5-gy(2)-gy(3)',
                                to: 4,
                                subto: 4
                            },
                            12: {
                                tip: 1,
                                answer: 'gy(2)+gy(3)-3',
                                to: 4,
                                subto: 4
                            },
                            13: {
                                tip: 1,
                                answer: '1+gy(2)',
                                to: 4,
                                subto: 4
                            },
                            14: {
                                tip: 1,
                                answer: 'gy(2)-1',
                                to: 4,
                                subto: 4
                            },
                            15: {
                                tip: 1,
                                answer: 'gy(2)-1',
                                to: 4,
                                subto: 4
                            },
                            16: {
                                tip: 1,
                                answer: '2-gy(2)',
                                to: 4,
                                subto: 4
                            }
                        }
                    },
                    5: {
                        title: 'Műveletek - Összeadás',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be a helyes eredményt (ha gyököt kell írnod, akkor azt gy(x) alakban írd, mint például 5√3 → 5gy(3))!',
                        url: 'vASmUy-6-kI,hzSOQQtcBhg,E2ju6G4XOEc',
                        answers : {
                            1: {
                                tip: 1,
                                answer: '9gy(3)',
                                to: 4,
                                subto: 5
                            },
                            2: {
                                tip: 1,
                                answer: '5gy(7)',
                                to: 4,
                                subto: 5
                            },
                            3: {
                                tip: 1,
                                answer: '3gy(11)+2gy(5)',
                                to: 4,
                                subto: 5
                            },
                            4: {
                                tip: 1,
                                answer: '13gy(2)+20',
                                to: 4,
                                subto: 5
                            },
                            5: {
                                tip: 1,
                                answer: '10gy(3)+3gy(5)',
                                to: 4,
                                subto: 5
                            },
                            6: {
                                tip: 1,
                                answer: '15gy(5)+6gy(7)+36',
                                to: 4,
                                subto: 5
                            },
                            7: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 4,
                                    b: 4,
                                    d: 4,
                                    e: 4,
                                    f: 4
                                },
                                subto: {
                                    a: 3,
                                    b: 5,
                                    d: 5,
                                    e: 3,
                                    f: 1
                                },
                            },
                            8: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 4,
                                    c: 4,
                                    d: 4,
                                    e: 4,
                                    f: 4
                                },
                                subto: {
                                    b: 3,
                                    c: 3,
                                    d: 3,
                                    e: 5,
                                    f: 1
                                },
                            },
                            9: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 4,
                                    c: 4,
                                    d: 4,
                                    e: 4
                                },
                                subto: {
                                    b: 5,
                                    c: 3,
                                    d: 5,
                                    e: 1
                                },
                            },
                            10: {
                                tip: 2,
                                answer: 'd',
                                to: {
                                    a: 4,
                                    b: 4,
                                    c: 4,
                                    e: 4
                                },
                                subto: {
                                    a: 5,
                                    b: 3,
                                    c: 5,
                                    e: 1
                                },
                            },
                            11: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 3,
                                    c: 3,
                                    d: 3,
                                    e: 4
                                },
                                subto: {
                                    b: 5,
                                    c: 5,
                                    d: 5,
                                    e: 1
                                },
                            },
                        }
                    },
                    6: {
                        title: 'Műveletek - Kivonás',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be a helyes eredményt (ha gyököt kell írnod, akkor azt gy(x) alakban írd, mint például 5√3 → 5gy(3))!',
                        url: 'vASmUy-6-kI,hzSOQQtcBhg',
                        answers : {
                            1: {
                                tip: 1,
                                answer: '-3gy(7)',
                                to: 4,
                                subto: 6
                            },
                            2: {
                                tip: 1,
                                answer: '6gy(3)',
                                to: 4,
                                subto: 6
                            },
                            3: {
                                tip: 1,
                                answer: 'gy(13)-12',
                                to: 4,
                                subto: 6
                            },
                            4: {
                                tip: 1,
                                answer: '-5gy(2)-1',
                                to: 4,
                                subto: 6
                            },
                            5: {
                                tip: 1,
                                answer: '2',
                                to: 4,
                                subto: 6
                            },
                            6: {
                                tip: 1,
                                answer: '-29-6gy(5)',
                                to: 4,
                                subto: 6
                            },
                            7: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 4,
                                    c: 4,
                                    d: 4,
                                    e: 4,
                                    f: 4,
                                    g: 4
                                },
                                subto: {
                                    a: 1,
                                    c: 6,
                                    d: 6,
                                    e: 3,
                                    f: 3,
                                    g: 1
                                },
                            },
                            8: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 4,
                                    b: 4,
                                    c: 4,
                                    e: 4,
                                    f: 4
                                },
                                subto: {
                                    a: 1,
                                    b: 3,
                                    c: 3,
                                    e: 6,
                                    f: 1
                                },
                            },
                            9: {
                                tip: 2,
                                answer: 'd',
                                to: {
                                    a: 4,
                                    b: 4,
                                    c: 4,
                                    e: 4
                                },
                                subto: {
                                    a: 1,
                                    b: 6,
                                    c: 6,
                                    e: 1
                                },
                            },
                            10: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 3,
                                    c: 3,
                                    d: 3,
                                    e: 4
                                },
                                subto: {
                                    a: 5,
                                    c: 5,
                                    d: 5,
                                    e: 1
                                },
                            },
                        }
                    },
                    7: {
                        title: 'Műveletek - Szorzás',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be vagy válaszd ki a helyes eredményt, lehetőség szerint kiemelve a tényezőt a gyökjel alól (ha gyököt kell írnod, akkor azt gy(x) alakban írd, mint például 5√3 → 5gy(3))!',
                        url: 'VRqIl2rUIcM,ZgA4Ni8G6nw,SZAa_2mnZJk',
                        answers : {
                            1: {
                                tip: 1,
                                answer: 'gy(15)',
                                to: 4,
                                subto: 7
                            },
                            2: {
                                tip: 1,
                                answer: '4gy(6)',
                                to: 4,
                                subto: 7
                            },
                            3: {
                                tip: 1,
                                answer: '-65gy(2)',
                                to: 4,
                                subto: 7
                            },
                            4: {
                                tip: 1,
                                answer: '450',
                                to: 4,
                                subto: 7
                            },
                            5: {
                                tip: 1,
                                answer: '-252gy(3)',
                                to: 4,
                                subto: 7
                            },
                            6: {
                                tip: 1,
                                answer: '720gy(7)',
                                to: 4,
                                subto: 7
                            },
                            7: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 4,
                                    b: 1,
                                    d: 1,
                                    e: 4
                                },
                                subto: {
                                    a: 3,
                                    b: 4,
                                    d: 4,
                                    e: 1
                                },
                            },
                            8: {
                                tip: 2,
                                answer: 'd',
                                to: {
                                    a: 4,
                                    b: 4,
                                    c: 4,
                                    e: 4
                                },
                                subto: {
                                    a: 3,
                                    b: 3,
                                    c: 7,
                                    e: 1
                                },
                            },
                            9: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 2,
                                    c: 4,
                                    d: 1,
                                    e: 4
                                },
                                subto: {
                                    b: 4,
                                    c: 3,
                                    d: 4,
                                    e: 1
                                },
                            },
                            10: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 4,
                                    c: 3,
                                    d: 4,
                                    e: 4
                                },
                                subto: {
                                    b: 3,
                                    c: 2,
                                    d: 7,
                                    e: 1
                                },
                            },
                        }
                    },
                    8: {
                        title: 'Műveletek - Osztás',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be vagy válaszd ki a helyes eredményt, lehetőség szerint kiemelve a tényezőt a gyökjel alól (ha gyököt kell írnod, akkor azt gy(x) alakban írd, mint például 5√3 → 5gy(3))!',
                        url: 'SZAa_2mnZJk,MkLaOGOhrBw,W5WECKE6FpY,tkC4hDAcjZM',
                        answers : {
                            1: {
                                tip: 1,
                                answer: '2',
                                to: 4,
                                subto: 8
                            },
                            2: {
                                tip: 1,
                                answer: '2gy(6)',
                                to: 4,
                                subto: 8
                            },
                            3: {
                                tip: 1,
                                answer: '-5gy(2)',
                                to: 4,
                                subto: 8
                            },
                            4: {
                                tip: 1,
                                answer: 'gy(5)',
                                to: 4,
                                subto: 8
                            },
                            5: {
                                tip: 1,
                                answer: '-2gy(11)',
                                to: 4,
                                subto: 8
                            },
                            6: {
                                tip: 1,
                                answer: '9',
                                to: 4,
                                subto: 8
                            },
                            7: {
                                tip: 2,
                                answer: 'd',
                                to: {
                                    a: 4,
                                    b: 3,
                                    c: 3,
                                    e: 4,
                                    f: 4
                                },
                                subto: {
                                    a: 3,
                                    b: 8,
                                    c: 8,
                                    e: 8,
                                    f: 1
                                },
                            },
                            8: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 3,
                                    b: 4,
                                    d: 4,
                                    e: 4,
                                    f: 4
                                },
                                subto: {
                                    a: 8,
                                    b: 3,
                                    d: 3,
                                    e: 8,
                                    f: 1
                                },
                            }
                        }
                    },
                    9: {
                        title: 'Törtek nevezőjének gyöktelenítése',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be vagy válaszd ki a helyes eredményt, lehetőség szerint kiemelve a tényezőt a gyökjel alól és tört esetén az a/b, tovább nem egyszerüsíthető formát használd (ha gyököt kell írnod, akkor azt gy(x) alakban írd, mint például 5√3 → 5gy(3))!',
                        url: 'Yk6KT--DP9Q,uzRFY8IFwnc,W5WECKE6FpY',
                        answers : {
                            1: {
                                tip: 1,
                                answer: 'gy(2)/2',
                                to: 4,
                                subto: 9
                            },
                            2: {
                                tip: 1,
                                answer: 'gy(3)',
                                to: 4,
                                subto: 9
                            },
                            3: {
                                tip: 1,
                                answer: '-4gy(6)/3',
                                to: 4,
                                subto: 9
                            },
                            4: {
                                tip: 1,
                                answer: '1-gy(2)',
                                to: 4,
                                subto: 9
                            },
                            5: {
                                tip: 1,
                                answer: 'gy(5)+1',
                                to: 4,
                                subto: 9
                            },
                            6: {
                                tip: 1,
                                answer: 'gy(2)-gy(5)',
                                to: 4,
                                subto: 9
                            },
                            7: {
                                tip: 2,
                                answer: 'd',
                                to: {
                                    a: 4,
                                    b: 4,
                                    c: 3,
                                    e: 4,
                                    f: 4
                                },
                                subto: {
                                    a: 9,
                                    b: 9,
                                    c: 2,
                                    e: 9,
                                    f: 1
                                },
                            },
                            8: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 4,
                                    c: 3,
                                    d: 4,
                                    e: 4,
                                    f: 4
                                },
                                subto: {
                                    a: 9,
                                    c: 2,
                                    d: 9,
                                    e: 9,
                                    f: 1
                                },
                            }
                        }
                    },
                    10: {
                        title: 'Műveletek - Egész számmal való hatványozás',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be vagy válaszd ki a helyes eredményt, lehetőség szerint kiemelve a tényezőt a gyökjel alól (ha gyököt kell írnod, akkor azt gy(x) alakban írd, mint például 5√3 → 5gy(3))!',
                        url: 'hyQAK5oqYXU,MU3_3esOquQ',
                        answers : {
                            1: {
                                tip: 1,
                                answer: '4',
                                to: 4,
                                subto: 10
                            },
                            2: {
                                tip: 1,
                                answer: '27',
                                to: 4,
                                subto: 10
                            },
                            3: {
                                tip: 1,
                                answer: '5gy(5)',
                                to: 4,
                                subto: 10
                            },
                            4: {
                                tip: 1,
                                answer: '8gy(2)',
                                to: 4,
                                subto: 10
                            },
                            5: {
                                tip: 1,
                                answer: '216',
                                to: 4,
                                subto: 10
                            },
                            6: {
                                tip: 1,
                                answer: '-49gy(7)',
                                to: 4,
                                subto: 10
                            },
                            7: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 4,
                                    c: 4,
                                    d: 4,
                                    e: 4,
                                },
                                subto: {
                                    a: 10,
                                    c: 3,
                                    d: 8,
                                    e: 1
                                },
                            },
                            8: {
                                tip: 2,
                                answer: 'd',
                                to: {
                                    a: 2,
                                    b: 4,
                                    c: 4,
                                    e: 4
                                },
                                subto: {
                                    a: 5,
                                    b: 3,
                                    c: 10,
                                    e: 1
                                },
                            },
                            9: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 3,
                                    c: 3,
                                    d: 4,
                                    e: 4
                                },
                                subto: {
                                    b: 9,
                                    c: 9,
                                    d: 3,
                                    e: 1
                                },
                            },
                            10: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 4,
                                    b: 4,
                                    d: 4
                                },
                                subto: {
                                    a: 3,
                                    b: 10,
                                    d: 1
                                },
                            },
                        }
                    },
                    11: {
                        title: 'Műveletek sorrendje',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Válaszd ki a helyes eredményt!',
                        url: 'hQvAdf-XfxA,oJNvJQHB31s',
                        answers : {
                            1: {
                                tip: 2,
                                answer: 'd',
                                to: {
                                    a: 4,
                                    b: 4,
                                    c: 4,
                                    e: 4,
                                },
                                subto: {
                                    a: 8,
                                    b: 3,
                                    c: 7,
                                    e: 1
                                },
                            },
                            2: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 4,
                                    c: 4,
                                    d: 4,
                                    e: 4,
                                },
                                subto: {
                                    b: 3,
                                    c: 11,
                                    d: 3,
                                    e: 1
                                },
                            },
                            3: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 4,
                                    b: 4,
                                    d: 4,
                                    e: 4,
                                },
                                subto: {
                                    a: 9,
                                    b: 3,
                                    d: 11,
                                    e: 1
                                },
                            },
                            4: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 4,
                                    c: 4,
                                    d: 4,
                                    e: 4,
                                },
                                subto: {
                                    a: 11,
                                    c: 3,
                                    d: 3,
                                    e: 1
                                },
                            },
                            5: {
                                tip: 2,
                                answer: 'd',
                                to: {
                                    a: 4,
                                    b: 4,
                                    c: 4,
                                    e: 4,
                                },
                                subto: {
                                    a: 9,
                                    b: 11,
                                    c: 5,
                                    e: 1
                                },
                            },
                            6: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 3,
                                    c: 4,
                                    d: 3,
                                    e: 4,
                                },
                                subto: {
                                    a: 9,
                                    c: 11,
                                    d: 9,
                                    e: 1
                                },
                            },
                        }
                    },
                    12: {
                        title: 'Zárójelek használata',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Válaszd ki a helyes eredményt!',
                        url: 'CI2anM_joPk,WvmiztaXtxA,T7LYotCbD28',
                        answers : {
                            1: {
                                tip: 2,
                                answer: 'd',
                                to: {
                                    a: 4,
                                    c: 4,
                                    d: 4,
                                    e: 4,
                                },
                                subto: {
                                    a: 12,
                                    c: 5,
                                    d: 9,
                                    e: 1
                                },
                            },
                            2: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 4,
                                    c: 4,
                                    d: 4,
                                    e: 4,
                                },
                                subto: {
                                    b: 12,
                                    c: 12,
                                    d: 10,
                                    e: 1
                                },
                            },
                            3: {
                                tip: 2,
                                answer: 'c',
                                to: {
                                    a: 4,
                                    b: 4,
                                    d: 4,
                                    e: 4,
                                },
                                subto: {
                                    a: 12,
                                    b: 5,
                                    d: 5,
                                    e: 1
                                },
                            },
                            4: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    b: 4,
                                    c: 4,
                                    d: 4,
                                    e: 4,
                                },
                                subto: {
                                    b: 5,
                                    c: 8,
                                    d: 8,
                                    e: 1
                                },
                            },
                            5: {
                                tip: 2,
                                answer: 'd',
                                to: {
                                    a: 4,
                                    b: 4,
                                    d: 4,
                                    e: 4,
                                },
                                subto: {
                                    a: 7,
                                    b: 7,
                                    d: 11,
                                    e: 1
                                },
                            },
                        }
                    },
                    13: {
                        title: 'Összetett feladatok',
                        title2: '',
                        exercise2: '',
                        change: 0,
                        exercise: 'Írd be vagy válaszd ki a helyes eredményt, lehetőség szerint kiemelve a tényezőt a gyökjel alól (ha gyököt kell írnod, akkor azt gy(x) alakban írd, mint például 5√3 → 5gy(3))!',
                        url: '',
                        answers : {
                            1: {
                                tip: 2,
                                answer: 'd',
                                to: {
                                    a: 4,
                                    c: 4,
                                    d: 4,
                                    e: 4,
                                },
                                subto: {
                                    a: 8,
                                    c: 5,
                                    d: 8,
                                    e: 1
                                },
                            },
                            2: {
                                tip: 2,
                                answer: 'd',
                                to: {
                                    a: 3,
                                    b: 3,
                                    c: 3,
                                    e: 4,
                                },
                                subto: {
                                    a: 3,
                                    b: 2,
                                    c: 2,
                                    e: 1
                                },
                            },
                            3: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 4,
                                    c: 4,
                                    d: 4,
                                    e: 4,
                                },
                                subto: {
                                    a: 4,
                                    c: 4,
                                    d: 4,
                                    e: 1
                                },
                            },
                            4: {
                                tip: 2,
                                answer: 'a',
                                to: {
                                    b: 4,
                                    c: 3,
                                    d: 4,
                                    e: 4,
                                },
                                subto: {
                                    b: 9,
                                    c: 1,
                                    d: 3,
                                    e: 1
                                },
                            },
                            5: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 2,
                                    c: 1,
                                    d: 2,
                                    e: 4,
                                },
                                subto: {
                                    a: 5,
                                    c: 5,
                                    d: 5,
                                    e: 1
                                },
                            },
                            6: {
                                tip: 2,
                                answer: 'b',
                                to: {
                                    a: 4,
                                    c: 4,
                                    d: 4,
                                    e: 4,
                                },
                                subto: {
                                    a: 13,
                                    c: 13,
                                    d: 4,
                                    e: 1
                                },
                            },
                        }
                    },
                }
            })
    });
})