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
                    exercise: 1
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
                const starCountRef = ref(database, 'users/' + auth.currentUser.uid);
                onValue(starCountRef, (snapshot) => {
                    res.send({user: snapshot.val().name});
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
                const starCountRef = ref(database, 'exercises');
                onValue(starCountRef, (snapshot) => {
                    snapshot.forEach(t => {
                        titles.push(t.val().title);
                        if(t.key == 1)
                        {
                            t.forEach(e => {
                                if(e.key != 'title')
                                    natural.push({
                                        title: e.val().title,
                                        exercise: e.val().exercise,
                                        url: e.val().url
                                    });
                            });

                            t.forEach(e => {
                                if(e.key != 'title')
                                {
                                    let ans = [];
                                    e.forEach(a => {
                                        if(a.key != 'title' && e.key != 'exercise' && e.key != 'url' && e.key != 'nr'){
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
                                if(t.key != 'title')
                                    integer.push({
                                        title: e.val().title,
                                        exercise: e.val().exercise,
                                        url: e.val().url
                                    });
                            });
                        }
                        if(t.key == 3)
                        {
                            t.forEach(e => {
                                if(t.key != 'title')
                                    rational.push({
                                        title: e.val().title,
                                        exercise: e.val().exercise,
                                        url: e.val().url
                                    });
                            });
                        }
                        if(t.key == 4)
                        {
                            t.forEach(e => {
                                if(t.key != 'title')
                                    real.push({
                                        title: e.val().title,
                                        exercise: e.val().exercise,
                                        url: e.val().url
                                    });
                            });
                        }
                    });
                    const starCountRef1 = ref(database, 'users/' + auth.currentUser.uid);
                    onValue(starCountRef1, (snapshot) => {
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
                    });
                });
            }
        }); 
})

app.post('/savelevel', async (req, res) => {
    const { level } = req.body;
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
            } else {
                update(ref(database, 'users/' + auth.currentUser.uid), {
                    level: level
                })
                .then( () => {
                    res.send({status: 'Updated!'})
                })
            }
        })
});

app.post('/savesublevel', async (req, res) => {
    const { sublevel } = req.body;
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
                    sublevel: sublevel
                })
                .then( () => {
                    res.send({status: 'Updated!'})
                })
            }
        })
});

app.post('/savesublevel', async (req, res) => {
    const { exercise } = req.body;
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
                    res.send({status: 'Updated!'})
                })
            }
        })
});

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
                        url: 'https://www.youtube.com/watch?v=jofahFN_vSw',
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
                        exercise: 'Írd be a helyes eredményt!',
                        url: 'https://www.youtube.com/watch?v=k-k6XZCWpDw',
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
                        exercise: 'Írd be a helyes eredményt!',
                        url: 'https://www.youtube.com/watch?v=yaIRAc1MEmo&t=5s,https://www.youtube.com/watch?v=7XWq5yiRB5M',
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
                        exercise: 'Írd be a helyes eredményt!',
                        url: 'https://www.youtube.com/watch?v=hjxFW3-UupE&t=1s,https://www.youtube.com/watch?v=2I6UtxT4-jU',
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
                        exercise: 'Írd be vagy válaszd ki a helyes eredményt!',
                        url: 'https://www.youtube.com/watch?v=yajDk-ZX-sY',
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
                                to: 1,
                                subto: {
                                    a: 5,
                                    c: 5,
                                    d: 1
                                },
                            },
                            5: {
                                tip: 2,
                                answer: 'a',
                                to: 1,
                                subto: {
                                    b: 5,
                                    c: 5,
                                    d: 1
                                },
                            },
                            6: {
                                tip: 2,
                                answer: 'b',
                                to: 1,
                                subto: {
                                    a: 5,
                                    c: 5,
                                    d: 2
                                },
                            },
                            7: {
                                tip: 2,
                                answer: 'b',
                                to: 1,
                                subto: {
                                    a: 5,
                                    c: 5,
                                    d: 2
                                },
                            },
                            8: {
                                tip: 2,
                                answer: 'b',
                                to: 1,
                                subto: {
                                    a: 5,
                                    c: 5,
                                    d: '1 2'
                                },
                            },
                            9: {
                                tip: 2,
                                answer: 'a',
                                to: 1,
                                subto: {
                                    b: 5,
                                    c: 5,
                                    d: 3
                                },
                            },
                            10: {
                                tip: 2,
                                answer: 'c',
                                to: 1,
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
                        exercise: 'Válaszd ki a helyes eredményt!',
                        answers: {
                            1: {
                                tip: 2,
                                answer: 'a',
                                to: 1,
                                subto: {
                                    b: 6,
                                    c: '1 2'
                                },
                            },
                            2: {
                                tip: 2,
                                answer: 'd',
                                to: 1,
                                subto: {
                                    a: 6,
                                    b: 6,
                                    c: 6,
                                    e: '1 3'
                                },
                            },
                            3: {
                                tip: 2,
                                answer: 'b',
                                to: 1,
                                subto: {
                                    a: 6,
                                    c: 1
                                },
                            },
                            4: {
                                tip: 2,
                                answer: 'c',
                                to: 1,
                                subto: {
                                    a: 6,
                                    b: 6,
                                    d: 1
                                },
                            },
                            5: {
                                tip: 2,
                                answer: 'a',
                                to: 1,
                                subto: {
                                    b: 6,
                                    c: 6,
                                    d: '1 2'
                                },
                            },
                            6: {
                                tip: 2,
                                answer: 'd',
                                to: 1,
                                subto: {
                                    a: 6,
                                    b: 6,
                                    c: 6,
                                    e: '1 2'
                                },
                            }
                        }
                    },
                    7: {
                        title: 'Zárójelek használata',
                        exercise: 'Válaszd ki a helyes eredményt!',
                        answers: {
                            1: {
                                tip: 2,
                                answer: 'c',
                                to: 1,
                                subto: {
                                    a: 7,
                                    b: 7,
                                    d: '1 2'
                                },
                            },
                            2: {
                                tip: 2,
                                answer: 'a',
                                to: 1,
                                subto: {
                                    b: 7,
                                    c: 7,
                                    d: 7,
                                    e: '1 3'
                                },
                            },
                            3: {
                                tip: 2,
                                answer: 'c',
                                to: 1,
                                subto: {
                                    a: 7,
                                    b: 7,
                                    d: 1
                                },
                            },
                            4: {
                                tip: 2,
                                answer: 'c',
                                to: 1,
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
                        exercise: 'Válaszd ki a helyes eredményt!',
                        answers: {
                            1: {
                                tip: 2,
                                answer: 'b',
                                to: 1,
                                subto: {
                                    a: 8,
                                    c: '1 3'
                                },
                            },
                            2: {
                                tip: 2,
                                answer: 'a',
                                to: 1,
                                subto: {
                                    b: 7,
                                    c: '1 3'
                                },
                            },
                            3: {
                                tip: 2,
                                answer: 'a',
                                to: 1,
                                subto: {
                                    b: 7,
                                    c: 7,
                                    d: 7,
                                    e: '1 3'
                                },
                            },
                            4: {
                                tip: 2,
                                answer: 'b',
                                to: 1,
                                subto: {
                                    a: 7,
                                    c: '2 3'
                                },
                            }
                        }
                    },
                    9: {
                        title: 'Betűkkel való műveletek',
                        exercise: 'Válaszd ki a helyes eredményt!',
                        answers: {
                            1: {
                                tip: 2,
                                answer: 'a',
                                to: 1,
                                subto: {
                                    b: '1 2',
                                    c: 9,
                                    d: '1 2'
                                },
                            },
                            2: {
                                tip: 2,
                                answer: 'c',
                                to: 1,
                                subto: {
                                    a: 6,
                                    b: '1 2',
                                    d: '1 2'
                                },
                            },
                            3: {
                                tip: 2,
                                answer: 'a',
                                to: 1,
                                subto: {
                                    b: 8,
                                    c: 8,
                                    d: '1 2'
                                },
                            },
                            4: {
                                tip: 2,
                                answer: 'c',
                                to: 1,
                                subto: {
                                    a: 8,
                                    b: 5,
                                    d: 1
                                },
                            },
                            5: {
                                tip: 2,
                                answer: 'c',
                                to: 1,
                                subto: {
                                    a: '5 6',
                                    b: 5,
                                    d: '1 2'
                                },
                            },
                            6: {
                                tip: 2,
                                answer: 'a',
                                to: 1,
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
                        exercise: 'Írd be vagy válaszd ki a helyes eredményt!',
                        answers: {
                            1: {
                                tip: 2,
                                answer: 'c',
                                to: 1,
                                subto: {
                                    a: 6,
                                    b: 6,
                                    d: 1
                                },
                            },
                            2: {
                                tip: 2,
                                answer: 'b',
                                to: 1,
                                subto: {
                                    a: 5,
                                    c: 6,
                                    d: 1
                                },
                            },
                            3: {
                                tip: 2,
                                answer: 'b',
                                to: 1,
                                subto: {
                                    a: '2 6',
                                    c: 5,
                                    d: 1
                                },
                            },
                            4: {
                                tip: 2,
                                answer: 'a',
                                to: 1,
                                subto: {
                                    b: 6,
                                    c: 6,
                                    d: 1
                                },
                            },
                            5: {
                                tip: 2,
                                answer: 'c',
                                to: 1,
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
                        url: 'https://zanza.tv/matematika/szamtan-algebra/hatvanyozas-az-egesz-szamok-halmazan',
                        exnr: 17
                    },
                    2: {
                        title: 'Műveletek - Kivonás',
                        exnr: 15
                    },
                    3: {
                        title: 'Műveletek - Szorzás',
                        exnr: 17
                    },
                    4: {
                        title: 'Műveletek - Osztás',
                        exnr: 15
                    },
                    5: {
                        title: 'Műveletek - Természetes számmal való hatványozás',
                        exnr: 20
                    },
                    6: {
                        title: 'Műveletek sorrendje',
                        exnr: 5
                    },
                    7: {
                        title: 'Zárójelek használata',
                        exnr: 4
                    },
                    8: {
                        title: 'Betűkkel való műveletek',
                        exnr: 7
                    },
                    9: {
                        title: 'Összetett feladatok',
                        exnr: 8
                    }
                },
                3: {
                    title: 'Racionális számok halmaza',
                    1: {
                        title: 'Közönséges törtek bővítése',
                        exnr: 5
                    },
                    2: {
                        title: 'Közönséges törtek egyszerűsítése',
                        exnr: 5
                    },
                    3: {
                        title: 'Közönséges tört tizedes törtté alakítása',
                        exnr: 14
                    },
                    4: {
                        title: 'Tizedes tört közönséges törtté alakítása',
                        exnr: 13
                    },
                    5: {
                        title: 'Műveletek - Összeadás',
                        exnr: 28
                    },
                    6: {
                        title: 'Műveletek - Kivonás',
                        exnr: 45
                    },
                    7: {
                        title: 'Műveletek - Szorzás',
                        exnr: 26
                    },
                    8: {
                        title: 'Műveletek - Osztás',
                        exnr: 26
                    },
                    9: {
                        title: 'Műveletek - Egész számmal való hatványozás',
                        exnr: 24
                    },
                    10: {
                        title: 'Műveletek sorrendje',
                        exnr: 7
                    },
                    11: {
                        title: 'Zárójelek használata',
                        exnr: 5
                    },
                    12: {
                        title: 'Összetett feladatok',
                        exnr: 5
                    },
                },
                4: {
                    title: 'Valós számok halmaza',
                    1: {
                        title: 'Négyzetgyökvonás',
                        exnr: 12
                    },
                    2: {
                        title: 'Tényező bevitele a gyökjel alá',
                        exnr: 9
                    },
                    3: {
                        title: 'Tényező kiemelése a gyökjel alól',
                        exnr: 10
                    },
                    4: {
                        title: 'Valós szám modulusa',
                        exnr: 15
                    },
                    5: {
                        title: 'Műveletek - Összeadás',
                        exnr: 11
                    },
                    6: {
                        title: 'Műveletek - Kivonás',
                        exnr: 11
                    },
                    7: {
                        title: 'Műveletek - Szorzás',
                        exnr: 10
                    },
                    8: {
                        title: 'Műveletek - Osztás',
                        exnr: 8
                    },
                    9: {
                        title: 'Törtek nevezőjének gyöktelenítése',
                        exnr: 8
                    },
                    10: {
                        title: 'Műveletek - Egész számmal való hatványozás',
                        exnr: 10
                    },
                    11: {
                        title: 'Műveletek sorrendje',
                        exnr: 6
                    },
                    12: {
                        title: 'Zárójelek használata',
                        exnr: 5
                    },
                    13: {
                        title: 'Összetett feladatok',
                        exnr: 6
                    },
                }
            })
    });
})